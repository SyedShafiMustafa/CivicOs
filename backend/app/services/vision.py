"""Vision triage — classifies an observation image into an issue type.

Demo mode: deterministic heuristics. Curated sample photos carry ground truth;
arbitrary uploads derive a stable pseudo-classification from the file hash,
labelled honestly as demo analysis (`mode: "demo"`).

Live mode (OPENAI_API_KEY set): a vision model classifies the image; any
failure falls back to demo heuristics so the product keeps working.
"""
from __future__ import annotations

import base64
import hashlib
import json

import httpx

from app import config
from app.services import llm, routing

_CATS = ["roads", "garbage", "water", "streetlights", "drainage", "accessibility", "other"]
_SEVS = ("low", "medium", "high", "critical")


def _demo_from_sample(sample: dict) -> dict:
    return {
        "issue_type": sample["issue_type"],
        "issue_label": routing.label(sample["issue_type"]),
        "confidence": sample["confidence"],
        "severity": sample["severity"],
        "description": sample["description"],
        "evidence_quality": "clear",
        "mode": "demo",
    }


def _demo_from_upload(image_bytes: bytes) -> dict:
    h = hashlib.sha256(image_bytes or b"empty").digest()
    issue = _CATS[h[0] % len(_CATS)]
    pick = h[1] % 10
    severity = "low" if pick < 5 else "medium" if pick < 8 else "high"
    desc = {
        "roads": "Visible road-surface damage along the carriageway.",
        "garbage": "Unattended waste and an overflowing collection point.",
        "water": "Water pooling / leakage on the road surface.",
        "streetlights": "Streetlight pole not lighting the stretch at night.",
        "drainage": "Storm-water drain blocked or overflowing.",
        "accessibility": "Footpath damage or obstruction blocking pedestrian access.",
        "other": "Civic issue observed at this location.",
    }[issue]
    return {
        "issue_type": issue,
        "issue_label": routing.label(issue),
        "confidence": round(0.58 + (h[2] / 255) * 0.24, 2),
        "severity": severity,
        "description": desc,
        "evidence_quality": "clear" if len(image_bytes or b"") > 40_000 else "partial",
        "mode": "demo",
    }


def _live(image_bytes: bytes, mime: str) -> dict | None:
    if not llm.available():
        return None
    try:
        b64 = base64.b64encode(image_bytes).decode()
        prompt = (
            'You are a civic-issue triage assistant. Look at the photo and respond with ONLY a '
            'JSON object: {"issue_type": one of roads|garbage|water|streetlights|drainage|'
            'accessibility|other, "confidence": 0..1, "severity": low|medium|high|critical, '
            '"description": one sentence describing the observable defect}. Be conservative and literal.'
        )
        resp = httpx.post(
            f"{config.OPENAI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
            json={
                "model": config.OPENAI_VISION_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                        ],
                    }
                ],
                "max_tokens": 300,
            },
            timeout=httpx.Timeout(15.0),
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        content = content[content.find("{"): content.rfind("}") + 1]
        data = json.loads(content)
        issue = data.get("issue_type", "other")
        if issue not in _CATS:
            issue = "other"
        sev = data.get("severity", "medium")
        if sev not in _SEVS:
            sev = "medium"
        return {
            "issue_type": issue,
            "issue_label": routing.label(issue),
            "confidence": round(float(data.get("confidence", 0.7)), 2),
            "severity": sev,
            "description": str(data.get("description", ""))[:280],
            "evidence_quality": "clear",
            "mode": "live",
        }
    except Exception:  # noqa: BLE001 — demo heuristics are always the fallback
        return None


def analyze(image_bytes: bytes | None, mime: str, sample: dict | None) -> dict:
    if sample is not None:
        return _demo_from_sample(sample)
    if image_bytes:
        live = _live(image_bytes, mime)
        if live:
            return live
        return _demo_from_upload(image_bytes)
    return _demo_from_upload(b"")


def build_why(issue_type: str, severity: str, location_label: str) -> list[dict]:
    """Explainable triage factors for the review step."""
    sev = {
        "critical": (
            "Severe, possibly hazardous condition",
            "The defect presents an immediate hazard to vehicles and pedestrians.",
        ),
        "high": (
            "Significant visible damage",
            "The defect is extensive enough to affect normal movement at this spot.",
        ),
        "medium": (
            "Clear visible defect",
            "The issue is plainly visible and affects regular use of the space.",
        ),
        "low": (
            "Minor but recurring defect",
            "Individually minor, but repeated issues here degrade the area over time.",
        ),
    }[severity]
    impact = {
        "roads": (
            "High-traffic location",
            f"Road-surface damage on an active carriageway near {location_label} forces evasive manoeuvres.",
        ),
        "water": (
            "Disrupts daily movement",
            f"Standing water at {location_label} impedes traffic and pedestrians.",
        ),
        "drainage": (
            "Public-health risk",
            f"Overflowing drains near {location_label} pose sanitation and monsoon-flooding risk.",
        ),
        "garbage": (
            "Affects many residents",
            f"The waste point near {location_label} serves a dense residential catchment.",
        ),
        "streetlights": (
            "Night-time safety",
            f"Dark stretches near {location_label} reduce pedestrian safety after sunset.",
        ),
        "accessibility": (
            "Blocks accessible movement",
            f"Obstructions at {location_label} impede wheelchair, elderly and stroller movement.",
        ),
        "other": (
            "Affects the neighbourhood",
            f"Residents near {location_label} are impacted by this issue.",
        ),
    }[issue_type]
    return [
        {"label": sev[0], "detail": sev[1]},
        {"label": impact[0], "detail": impact[1]},
    ]
