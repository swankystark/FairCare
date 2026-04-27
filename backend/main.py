import os
import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from bias_engine import BiasEngine
from voice_audit import router as voice_router
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

app = FastAPI()

# Enable CORS so React can talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register voice audit router
app.include_router(voice_router)

engine = BiasEngine()
# Load your dataset once into memory for the hackathon speed
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "2023", "1-Year", "psam_p06.csv")
full_df = pd.read_csv(DATA_PATH, nrows=200000).sample(frac=1, random_state=42)

@app.get("/")
def read_root():
    return {"status": "FairCare API is active"}

@app.get("/run-audit")
def run_audit(sensitive_col: str = "RAC1P"):
    try:
        results = engine.audit_model(full_df, sensitive_col=sensitive_col)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AuditResults(BaseModel):
    results: dict

class RemediateRequest(BaseModel):
    sensitive_col: str = "RAC1P"
    constraint: str = "demographic_parity"

@app.post("/remediate")
def remediate_model(req: RemediateRequest):
    try:
        results = engine.apply_remediation(full_df, sensitive_col=req.sensitive_col, constraint=req.constraint)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/explain-bias")
def explain_bias(data: AuditResults):
    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite-preview',
            contents=str(data.results),
            config=types.GenerateContentConfig(
                system_instruction="You are a Clinical AI Ethicist. Analyze these bias audit results and provide a 3-paragraph report on the risks to patient safety and suggested technical mitigations."
            )
        )
        return {"explanation": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-passport")
async def generate_passport(metrics: dict):
    reasoning_prompt = f"""
    You are a senior clinical AI ethics auditor preparing a regulatory 
    compliance report for a hospital board. 
    
    AUDIT FINDINGS:
    - Model: High-Intensity Care Management Triage Classifier
    - Dataset: ACS PUMS 2023, California, {metrics.get('n_samples', 200000)} patients
    - Baseline Accuracy: {metrics.get('accuracy_baseline', 99.9)}%
    - Demographic Parity Gap: {metrics.get('dp_gap_baseline', 12.75)}%
    - Equalized Odds Gap: {metrics.get('eo_gap_baseline', 100)}%
    - Most Affected Group: Indigenous/Alaska Native — {metrics.get('group4_rate', 0)}% selection rate
    - Primary Bias Drivers: PINCP (Income), DIS (Disability) — identified as racial proxies via SHAP
    - Post-Remediation Parity Gap: {metrics.get('dp_gap_remediated', 9.09)}%
    - Estimated Patients Wrongly Excluded: {metrics.get('patients_harmed', 847)}
    
    Generate a Clinical Bias Passport with these EXACT sections.
    Reason through each finding — do not just state conclusions.
    Be specific with article numbers and act names.
    
    SECTION 1 — EXECUTIVE SUMMARY (for hospital board, no ML jargon):
    Write 3 sentences: What the model does, what the critical finding is,
    and what the board must do before deployment. Use the 847 number.
    
    SECTION 2 — REGULATORY COMPLIANCE ANALYSIS:
    For EACH regulation below, state: (a) which article applies, 
    (b) whether this model PASSES or FAILS, and (c) WHY based on the 
    specific metrics above:
      - EU AI Act Article 10 (Data Governance)
      - EU AI Act Article 13 (Transparency)  
      - EU AI Act Annex III (High-Risk AI classification)
      - India DPDP Act 2023 Section 4 (Purpose Limitation)
      - India DPDP Act 2023 Section 8 (Data Fiduciary obligations)
    
    SECTION 3 — BIAS MECHANISM ANALYSIS:
    Explain in plain English: HOW does income (PINCP) become a proxy for 
    race in this dataset? Walk through the causal chain. Cite the 
    correlation coefficient if relevant. Explain why this constitutes
    indirect discrimination under anti-discrimination law.
    
    SECTION 4 — SEVERITY CLASSIFICATION:
    Rate this model on a 5-level scale (Minimal / Low / Moderate / High / Critical)
    for each of: Patient Safety Risk, Regulatory Risk, Reputational Risk, 
    Legal Liability Risk. Justify each rating with the specific metrics.
    
    SECTION 5 — REMEDIATION ACTION PLAN:
    Three specific technical actions, each with:
    - Action name
    - Why this action addresses the root cause (not just symptoms)
    - Estimated implementation time
    - Expected metric improvement (be specific: "Expected to reduce 
      Demographic Parity Gap from 9.09% to approximately 4-5%")
    - Which regulation violation it resolves
    
    SECTION 6 — DEPLOYMENT RECOMMENDATION:
    Single clear sentence: APPROVED / CONDITIONAL APPROVAL / BLOCKED
    If conditional: list exact conditions that must be met.
    
    Return as structured JSON with these exact keys:
    executive_summary, regulatory_compliance (array), bias_mechanism,
    severity_classification (object), action_plan (array of 3), 
    deployment_recommendation, generated_timestamp
    
    Return ONLY valid JSON. No markdown. No preamble.
    """

    try:
        print(f"Generating passport for metrics: {metrics}")
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=reasoning_prompt
        )
        text = response.text
        print(f"Raw Gemini response: {text}")
        
        # More robust JSON extraction
        json_match = re.search(r'(\{.*\})', text, re.DOTALL)
        if json_match:
            text = json_match.group(1)
        else:
            text = re.sub(r'```json|```', '', text).strip()
            
        passport_data = json.loads(text)
        return passport_data
    except json.JSONDecodeError as je:
        print(f"JSON Decode Error: {je}")
        # If Gemini doesn't return valid JSON, wrap the raw text
        return {
            "executive_summary": response.text if 'response' in locals() and response else "Failed to generate passport.",
            "regulatory_compliance": [],
            "bias_mechanism": "",
            "severity_classification": {},
            "action_plan": [],
            "deployment_recommendation": "BLOCKED — Unable to parse analysis",
            "generated_timestamp": ""
        }
    except Exception as e:
        print(f"Error generating passport: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))