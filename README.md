# FairCare AI 🩺

> **Clinical AI Bias Auditing Platform** — Google Solution Challenge 2026

FairCare is a production-grade platform for detecting, visualizing, and remediating demographic bias in clinical AI models. Built to protect patient equity and drive regulatory compliance.

---

## 🌟 Key Features

| Feature | Description |
|---|---|
| **Bias Audit Engine** | Scikit-learn + Fairlearn on 200,000+ ACS PUMS 2023 patient records |
| **SHAP Proxy Detection** | Identifies income (PINCP) and disability (DIS) as racial proxies |
| **Remediation Engine** | ThresholdOptimizer (Equalized Odds) + ExponentiatedGradient (Demographic Parity) |
| **Voice-to-Audit** | Gemini 3.1 Flash natural language bias queries with TTS audio responses |
| **Clinical Bias Passport** | Gemini-generated regulatory report (EU AI Act, India DPDP Act) with jsPDF export |
| **Real-time Decision Boundary** | Interactive scatter plot showing threshold shifts as constraints change |

---

## 🏗️ Tech Stack

**Backend**: FastAPI · Scikit-learn · Fairlearn · SHAP · Google Gemini API  
**Frontend**: React + Vite · Tailwind CSS v4 · Recharts · jsPDF + AutoTable  
**ML**: Logistic Regression · ThresholdOptimizer · ExponentiatedGradient

---

## 🚀 Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
# Add your GEMINI_API_KEY to .env
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Key Findings (ACS PUMS 2023 · California)

- **847 patients** algorithmically excluded from care management
- **Group 4 (Indigenous/Alaska Native)**: 0% selection rate — total exclusion
- **PINCP × RAC1P correlation**: 0.73 — income used as illegal racial proxy
- **Equalized Odds Gap**: 100% baseline → reduced with ThresholdOptimizer
- Violations: EU AI Act Article 10, India DPDP Act Section 4

---

## 🌍 UN SDGs Addressed

- **SDG 3**: Good Health and Well-Being  
- **SDG 10**: Reduced Inequalities

---

*Built for Google Solution Challenge 2026 · Powered by Gemini AI*
