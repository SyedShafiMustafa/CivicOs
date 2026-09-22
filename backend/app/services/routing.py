"""Department routing — rule-based recommendation with explainable rationale.

Designed to be replaceable by an LLM-backed router; the rule table remains the
fallback and the explanation source of truth. A real GHMC connector would map
these departments to ticket queues via API.
"""
from __future__ import annotations

ISSUE_LABELS = {
    "roads": "Road Damage",
    "garbage": "Garbage Accumulation",
    "water": "Water Leakage",
    "streetlights": "Broken Streetlight",
    "drainage": "Drainage Overflow",
    "accessibility": "Accessibility Hazard",
    "other": "Other Civic Issue",
}

DEPARTMENTS = {
    "roads": {"name": "GHMC — Roads & Transportation", "sla": "Field inspection within 72 hours"},
    "garbage": {"name": "GHMC — Solid Waste Management", "sla": "Clearance within 48 hours"},
    "water": {"name": "HMWSSB — Water Supply & Sewerage", "sla": "Leak inspection within 24 hours"},
    "streetlights": {"name": "GHMC — Electric Wing (Street Lighting)", "sla": "Repair within 5 working days"},
    "drainage": {"name": "GHMC — Storm Water Drains", "sla": "Desilting within 72 hours"},
    "accessibility": {"name": "GHMC — Town Planning (Accessibility Cell)", "sla": "Survey within 7 working days"},
    "other": {"name": "GHMC — Zonal Commissionerate", "sla": "Triage within 5 working days"},
}

_RATIONALE = {
    "roads": "Road-surface defects on active carriageways are handled by Roads & Transportation.",
    "garbage": "Unattended waste points fall under Solid Waste Management's clearance queue.",
    "water": "Leaking valves and lines on the carriageway are HMWSSB's responsibility.",
    "streetlights": "Pole outages are logged with the Electric Wing's street-lighting desk.",
    "drainage": "Storm-water overflow is handled by the Storm Water Drains division.",
    "accessibility": "Broken footpaths and blocked ramps route to the Accessibility Cell.",
    "other": "Unmapped civic issues are triaged by the Zonal Commissionerate.",
}

_SEVERITY_NOTE = {
    "critical": "Critical-severity incidents skip the standard queue and are flagged for priority inspection.",
    "high": "High severity places this incident in the priority inspection band.",
    "medium": "Medium severity follows the standard response window.",
    "low": "Low severity incidents are batched into routine maintenance rounds.",
}


def recommend(issue_type: str, severity: str) -> dict:
    dept = DEPARTMENTS.get(issue_type, DEPARTMENTS["other"])
    return {
        "department": dept["name"],
        "sla": dept["sla"],
        "rationale": [
            _RATIONALE.get(issue_type, _RATIONALE["other"]),
            _SEVERITY_NOTE.get(severity, _SEVERITY_NOTE["medium"]),
        ],
    }


def label(issue_type: str) -> str:
    return ISSUE_LABELS.get(issue_type, issue_type.title())
