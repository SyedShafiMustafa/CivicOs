"""Incident clustering — decides whether a new observation joins an existing
incident or starts a new one.

Weighted similarity over four explainable signals:
  geo   — distance decay (scale 180 m)
  emb   — cosine similarity of text+category+image embeddings
  cat   — hard category gate (mismatch caps the score)
  time  — recency relative to the incident's latest observation

Per-signal reasons are returned so the UI can show its work instead of a bare
score. Thresholds: >= 0.80 attach, 0.55–0.80 confirm with the citizen, else new.
"""
from __future__ import annotations

import math
from datetime import datetime

from app.services import routing
from app.services.embeddings import cosine

W_GEO, W_EMB, W_CAT, W_TIME = 0.30, 0.34, 0.24, 0.12
THRESHOLD_ATTACH = 0.80
THRESHOLD_CONFIRM = 0.55
GEO_SCALE_M = 180.0
TIME_SCALE_DAYS = 45.0
EARTH_R = 6371000.0


def haversine_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(h))


def score_incident(
    incident: dict,
    coords: tuple[float, float],
    when: datetime,
    emb: list[float],
    issue_type: str,
) -> dict:
    d = haversine_m(coords, (incident["latitude"], incident["longitude"]))
    geo = math.exp(-d / GEO_SCALE_M)
    text = cosine(emb, incident.get("embedding") or [])
    same_cat = incident["issue_type"] == issue_type
    days = abs((when - incident["last_seen"]).total_seconds()) / 86400.0
    time = math.exp(-days / TIME_SCALE_DAYS)
    s = W_GEO * geo + W_EMB * text + W_CAT * (1.0 if same_cat else 0.0) + W_TIME * time
    if not same_cat:
        s = min(s, 0.45)
    return {
        "score": round(s, 4),
        "geo": geo,
        "text": text,
        "time": time,
        "distance_m": d,
        "same_category": same_cat,
    }


def reasons(res: dict, incident: dict) -> list[str]:
    out: list[str] = []
    d = res["distance_m"]
    if d <= 600:
        out.append(f"Location within {d:.0f} m of the incident")
    if res["same_category"]:
        out.append(f"Same issue category ({routing.label(incident['issue_type'])})")
    if res["text"] >= 0.30:
        out.append(f"Description similarity {res['text'] * 100:.0f}%")
    if res["time"] >= 0.85:
        out.append("Reported close to the incident's latest observation")
    return out or ["Weaker contextual match — please confirm manually"]


def find_matches(
    incidents: list[dict],
    coords: tuple[float, float],
    when: datetime,
    emb: list[float],
    issue_type: str,
    top: int = 3,
) -> tuple[str, list[dict]]:
    scored = []
    for inc in incidents:
        res = score_incident(inc, coords, when, emb, issue_type)
        scored.append((res, inc))
    scored.sort(key=lambda t: t[0]["score"], reverse=True)

    candidates = []
    for res, inc in scored[:top]:
        if res["score"] < 0.42:
            continue
        candidates.append(
            {
                "incident": inc,
                "similarity": res["score"],
                "reasons": reasons(res, inc),
            }
        )
    best = candidates[0]["similarity"] if candidates else 0.0
    if best >= THRESHOLD_ATTACH:
        decision = "attach"
    elif best >= THRESHOLD_CONFIRM:
        decision = "confirm"
    else:
        decision = "new"
    return decision, candidates
