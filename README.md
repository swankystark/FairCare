<div align="center">
  <img src="frontend/src/assets/logo.png" alt="FairCare AI Logo" width="120" />
  <h1>FairCare AI 🩺</h1>
  <p><strong>Clinical AI Bias Auditing & Remediation Platform</strong></p>
  <p><em>Built for the Google Solution Challenge 2026</em></p>
</div>

---

## 🚨 The Problem

Clinical AI models deployed in hospitals today are predominantly trained on datasets that underrepresent women, darker-skinned individuals, elderly patients, and low-income populations. When these models make diagnostic or triage recommendations, they carry invisible biases that systematically produce worse outcomes for the very patients who already face the greatest healthcare inequities. 

There is currently no accessible, standardized tool for hospitals or AI developers to audit their clinical models for demographic bias *before* deployment. Consequently, biased models go live, gain unwarranted trust, and cause harm at scale.

## 💡 The Solution

**FairCare AI** is a production-grade, end-to-end platform designed to detect, visualize, and actively remediate demographic bias in clinical machine learning models. 

By combining cutting-edge algorithmic fairness mathematics (Fairlearn), explainable AI (SHAP), and Google's Gemini multimodal reasoning, FairCare empowers hospital boards, compliance officers, and ML engineers to ensure their clinical algorithms are equitable and legally compliant (e.g., EU AI Act, India DPDP Act) before a single patient is impacted.

---

## ✨ Core Features & Platform Modules

The platform is divided into a sleek, professional four-tab dashboard built for clinical decision-makers:

### 1. 📊 Overview & Impact Metrics
- **Automated Fairness Audits:** Evaluates models against critical algorithmic fairness metrics:
  - *Demographic Parity Gap:* Ensuring equal selection rates across all demographic groups.
  - *Equalized Odds Gap:* Ensuring equal error rates (False Positives/Negatives) across groups.
- **Group-Level Performance Breakdown:** Instantly visualize which specific demographic cohorts (e.g., Indigenous/Alaska Native) are experiencing algorithmic exclusion.

### 2. 🔍 Explainable Analysis (SHAP)
- **Proxy Bias Detection:** Models often learn to be biased through "proxy" variables even when explicit race/gender columns are removed.
- **Bias Cascade Visualization:** Identifies exactly which features (like `PINCP` Income or `DIS` Disability) correlate strongly with protected classes (`RAC1P` Race) and are driving discriminatory predictions.

### 3. 🛠️ Remediation Engine
- **Live Mathematical Shift:** Select a fairness constraint (*Demographic Parity* or *Equalized Odds*), and the engine will apply a `ThresholdOptimizer` or `ExponentiatedGradient` algorithm to mathematically fix the model.
- **Interactive Decision Boundary:** A live scatter plot visualizes the model's threshold shifting in real-time. Watch as newly included patients literally "jump" from the *No Care* to *Care* zones.
- **"Patients Saved" Counter:** An animated UI counter instantly shows exactly how many marginalized patients were rescued from algorithmic exclusion by the remediation.

### 4. 🧠 AI Insights & Compliance
- **Clinical Bias Passport (jsPDF):** Generate a professional, boardroom-ready PDF audit report. Gemini AI evaluates the audit data against global regulations (EU AI Act Article 10, India DPDP Act) and outputs a *Risk Rating*, *Deployment Recommendation* (e.g., [BLOCK] DEPLOYMENT), and an *Action Plan*. 
- **Voice-to-Audit Interface:** A multimodal audio feature utilizing the `gemini-3.1-flash-tts-preview` model. Speak queries naturally (e.g., *"Why is this model biased?"*), and Gemini will analyze the SHAP data and respond with a generated audio explanation accompanied by a real-time waveform visualizer.

---

## 🏗️ Technology Stack

**Frontend (React UI & Visualization):**
- React 18, Vite, Tailwind CSS v4
- Recharts (Scatter & Bar visualizers)
- jsPDF & jspdf-autotable (PDF Report Generation)
- Lucide React (Icons)

**Backend & AI Engine (Python):**
- FastAPI & Uvicorn (High-performance API)
- Google GenAI SDK (`gemini-3.1-flash`, `gemini-3.1-flash-tts-preview`)
- Scikit-learn (Logistic Regression baselines)
- Fairlearn (Algorithmic Fairness & Threshold Remediation)
- SHAP (Explainable AI & Feature Importance)
- Pandas & NumPy (Data manipulation on 200,000+ row ACS datasets)

**Cloud & Deployment:**
- Google Cloud Run (Backend containerization)
- Firebase Hosting (Frontend SPA CDN)
- Docker

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- A Google Gemini API Key

### Backend Setup
```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment and install dependencies
python -m venv myenv
source myenv/bin/activate  # (On Windows: myenv\Scripts\activate)
pip install -r requirements.txt

# 3. Add Environment Variable
# Create a .env file or export it
export GEMINI_API_KEY="your_api_key_here"

# 4. Run the API
uvicorn main:app --reload
# Server runs on http://127.0.0.1:8000
```

### Frontend Setup
```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Run the development server
npm run dev
# App runs on http://localhost:5173
```

---

## 🌍 Global Impact & UN SDGs

FairCare AI directly aligns with the United Nations Sustainable Development Goals:
- **SDG 3: Good Health and Well-Being** — Ensuring that AI-driven clinical pathways do not leave marginalized populations behind.
- **SDG 10: Reduced Inequalities** — Building computational guardrails to prevent historic systemic biases from being permanently encoded into modern healthcare technology.

---
<p align="center">
  <em>Protecting Patient Equity in the Age of Artificial Intelligence.</em>
</p>
