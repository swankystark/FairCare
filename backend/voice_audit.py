import wave
import base64
import tempfile
import os
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Pre-defined audit queries
AUDIT_QUERIES = {
    "elderly_women": "Is this model safe for elderly women in low-income areas?",
    "indigenous": "Analyze the bias against Indigenous patients in this model.",
    "rural_patients": "Check this model's performance for rural low-income patients.",
    "disability": "How does this model treat patients with disabilities?",
    "custom": None,
}

MODEL_CONTEXT = """
You are a clinical AI ethics auditor analyzing the FairCare bias audit results.

Current model findings:
- Dataset: ACS PUMS 2023, California, 200,000+ patients
- Target: High-Intensity Care Management triage
- Baseline Accuracy: 99.9% (Performance Paradox — high accuracy masking bias)
- Demographic Parity Gap: 12.75% (baseline) → 9.09% (remediated)
- Equalized Odds Gap: 100% (baseline — critical failure)
- Group 4 (Indigenous/Alaska Native): 0% selection rate = TOTAL EXCLUSION
- Primary bias drivers: PINCP (income proxy), DIS (disability proxy)
- 847 patients identified as wrongly excluded
- Regulations: Violates EU AI Act Article 10, India DPDP Act Section 4

Answer the user's question in 3-4 sentences maximum.
Be direct, clinical, and use specific numbers from the findings above.
End with one concrete recommended action.
Speak as if briefing a hospital board member.
"""


def wave_file(filename, pcm, channels=1, rate=24000, sample_width=2):
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm)


class VoiceAuditRequest(BaseModel):
    query: str
    query_type: str = "custom"


@router.post("/api/voice-audit")
async def voice_audit(request: VoiceAuditRequest):
    try:
        # Step 1: Get Gemini text analysis
        analysis_response = client.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=f"{MODEL_CONTEXT}\n\nUser question: {request.query}"
        )
        analysis_text = analysis_response.text

        # Step 2: Try TTS, but gracefully handle if model not available
        audio_base64 = None
        try:
            tts_response = client.models.generate_content(
                model="gemini-3.1-flash-tts-preview",
                contents=f"Read this clinical audit finding clearly and professionally: {analysis_text}",
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name="Kore"
                            )
                        )
                    ),
                )
            )

            audio_data = tts_response.candidates[0].content.parts[0].inline_data.data

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_path = tmp.name

            wave_file(tmp_path, audio_data)

            with open(tmp_path, "rb") as f:
                audio_base64 = base64.b64encode(f.read()).decode("utf-8")

            os.unlink(tmp_path)
        except Exception as tts_err:
            print(f"TTS unavailable, returning text only: {tts_err}")

        return JSONResponse({
            "query": request.query,
            "analysis": analysis_text,
            "audio_base64": audio_base64,
            "audio_format": "wav"
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
