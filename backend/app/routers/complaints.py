from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import ComplaintIn, ComplaintOut
from app.store.demo import get_store

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintOut)
def create_complaint(payload: ComplaintIn):
    complaint = get_store().complaint_create(payload.incident_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Incident not found")
    return complaint


@router.post("/{complaint_id}/submit-demo")
def submit_demo(complaint_id: str):
    complaint = get_store().complaint_submit(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {
        "complaint": complaint,
        "demo_reference": complaint.demo_reference,
        "note": "Prototype submission created. No official GHMC integration exists yet — "
                "this demo connector is a stand-in for a future API integration.",
    }
