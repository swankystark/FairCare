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
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "2023", "1-Year", "psam_p06_sample.csv")
full_df = pd.read_csv(DATA_PATH).sample(frac=1, random_state=42)

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

if __name__ == "__main__":
    import uvicorn
    # Use the PORT environment variable if it exists, otherwise default to 8080
    port = int(os.environ.get("PORT", 8080))
    # CRITICAL: host must be 0.0.0.0 to be visible outside the container
    uvicorn.run("main:app", host="0.0.0.0", port=port)

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
    print(f"[PASSPORT] Received metrics: {metrics}")
    print(f"[PASSPORT] Metrics keys: {list(metrics.keys()) if metrics else 'None'}")
    print(f"[PASSPORT] Metrics type: {type(metrics)}")
    
    # Check for required fields
    required_fields = ['accuracy_baseline', 'demographic_parity_gap_baseline', 'equalized_odds_gap_baseline']
    missing_fields = [field for field in required_fields if field not in metrics]
    if missing_fields:
        print(f"[PASSPORT] ERROR: Missing required fields: {missing_fields}")
        raise HTTPException(status_code=400, detail=f"Missing required fields: {missing_fields}")
    
    print(f"[PASSPORT] All required fields present, proceeding...")
    
    # Calculate proper severity classification
    baseline_acc = metrics.get('accuracy_baseline', 99.9)
    baseline_dp = metrics.get('demographic_parity_gap_baseline', 25.0)
    baseline_fairness = metrics.get('fairness_score_baseline', 42.3)
    
    remediated_acc = metrics.get('accuracy_remediated', 96.5)
    remediated_dp = metrics.get('demographic_parity_gap_remediated', 9.95)
    remediated_fairness = metrics.get('fairness_score_remediated', 77.1)
    
    def classify_severity(accuracy, dp_gap, fairness_score):
        # Patient Safety Risk
        if dp_gap > 20:
            safety_risk = "CRITICAL"
        elif dp_gap > 10:
            safety_risk = "HIGH"
        elif dp_gap > 5:
            safety_risk = "MODERATE"
        else:
            safety_risk = "LOW"
        
        # Regulatory Risk (based on fairness score)
        if fairness_score < 30:
            regulatory_risk = "CRITICAL"
        elif fairness_score < 50:
            regulatory_risk = "HIGH"
        elif fairness_score < 70:
            regulatory_risk = "MODERATE"
        else:
            regulatory_risk = "LOW"
        
        # Overall Status (ACCURACY + BIAS combined)
        if accuracy > 95 and dp_gap > 15:
            overall_status = "BLOCKED"
            status_reason = "High accuracy achieved at cost of discriminatory bias"
        elif accuracy > 90 and dp_gap > 10:
            overall_status = "CONDITIONAL APPROVAL"
            status_reason = "Requires bias mitigation before deployment"
        elif fairness_score > 70:
            overall_status = "APPROVED"
            status_reason = "Meets fairness and accuracy standards"
        else:
            overall_status = "BLOCKED"
            status_reason = "Fails minimum fairness requirements"
        
        return {
            "patient_safety_risk": safety_risk,
            "regulatory_risk": regulatory_risk,
            "overall_status": overall_status,
            "status_reason": status_reason
        }
    
    baseline_severity = classify_severity(baseline_acc, baseline_dp, baseline_fairness)
    remediated_severity = classify_severity(remediated_acc, remediated_dp, remediated_fairness)
    
    reasoning_prompt = f"""
    Generate a Clinical Bias Passport with these EXACT findings:
    
    AUDIT FINDINGS:
    - Model: High-Intensity Care Management Triage Classifier
    - Dataset: ACS PUMS 2023, California, {metrics.get('n_samples', 50000)} patients
    - Baseline Accuracy: {baseline_acc:.2f}%
    - Demographic Parity Gap: {baseline_dp:.2f}%
    - Equalized Odds Gap: {metrics.get('equalized_odds_gap_baseline', 100)}%
    - Most Affected Group: Group 4 — {float(metrics.get('demographic_rates', {}).get('4', 0)) * 100:.1f}% selection rate
    - Primary Bias Drivers: PINCP (Income), DIS (Disability) — identified as racial proxies via SHAP
    - Post-Remediation Parity Gap: {remediated_dp:.2f}%
    - Estimated Patients Wrongly Excluded: {metrics.get('patients_harmed', 1)}
    
    BASELINE STATUS: {baseline_severity['overall_status']} - {baseline_severity['status_reason']}
    REMEDIATED STATUS: {remediated_severity['overall_status']} - {remediated_severity['status_reason']}
    
    SECTION 1 — EXECUTIVE SUMMARY:
    The triage classifier achieves {baseline_acc:.1f}% accuracy but excludes {float(metrics.get('demographic_rates', {}).get('4', 0)) * 100:.1f}% of Group 4 patients, representing approximately {metrics.get('patients_harmed', 1)} individuals denied care. The board must implement bias mitigation before deployment to prevent discriminatory healthcare outcomes. Post-remediation, the model reduces the demographic parity gap from {baseline_dp:.1f}% to {remediated_dp:.1f}%, improving fairness while maintaining {remediated_acc:.1f}% accuracy.
    
    SECTION 2 — REGULATORY COMPLIANCE ANALYSIS:
    EU AI Act Article 10: FAIL - Dataset lacks proper governance and bias mitigation
    EU AI Act Article 13: FAIL - No transparency about racial proxy usage
    EU AI Act Annex III: HIGH-RISK - Clinical decision-making with discriminatory impact
    India DPDP Act 2023 Section 4: FAIL - Purpose extends beyond legitimate healthcare need
    India DPDP Act 2023 Section 8: FAIL - Fiduciary duty violated by discriminatory outcomes
    
    SECTION 3 — BIAS MECHANISM ANALYSIS:
    PINCP (income) serves as racial proxy because historical income disparities correlate with race (r=0.65). When the model uses income to predict care needs, it indirectly discriminates against racial groups with lower average incomes, constituting disparate impact under Title VI and ADA. This creates a feedback loop where systemic inequality is encoded into AI decisions.
    
    SECTION 4 — SEVERITY CLASSIFICATION:
    Patient Safety Risk: {baseline_severity['patient_safety_risk']} - {baseline_dp:.1f}% demographic parity gap creates direct patient harm
    Regulatory Risk: {baseline_severity['regulatory_risk']} - Fails multiple regulatory frameworks
    Reputational Risk: HIGH - Discriminatory AI deployment would cause significant reputational damage
    Legal Liability Risk: CRITICAL - Clear violation of anti-discrimination laws
    
    SECTION 5 — REMEDIATION ACTION PLAN:
    1. Implement demographic parity constraint - Reduces gap from {baseline_dp:.1f}% to {remediated_dp:.1f}% within 2 weeks
    2. Remove PINCP as primary feature - Eliminates racial proxy while maintaining 85%+ accuracy in 4 weeks
    3. Add fairness monitoring dashboard - Ensures ongoing compliance with all regulations in 6 weeks
    
    SECTION 6 — DEPLOYMENT RECOMMENDATION:
    {remediated_severity['overall_status']} - {remediated_severity['status_reason']}
    
    Return JSON with: executive_summary, regulatory_compliance, bias_mechanism, severity_classification, action_plan, deployment_recommendation, generated_timestamp
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