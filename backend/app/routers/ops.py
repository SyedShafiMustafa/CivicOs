from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import IncidentDetail, OpsAssignIn, OpsResolveIn
from app.store.demo import get_store

router = APIRouter(prefix="/ops", tags=["ops"])


@router.post("/incidents/{incident_id}/assign", response_model=IncidentDetail)
def assign(incident_id: str, payload: OpsAssignIn):
    detail = get_store().assign(incident_id, payload.department)
    if not detail:
        raise HTTPException(status_code=404, detail="Incident not found")
    return detail


@router.post("/incidents/{incident_id}/resolve", response_model=IncidentDetail)
def resolve(incident_id: str, payload: OpsResolveIn):
    detail = get_store().resolve(incident_id, payload.notes, payload.evidence)
    if not detail:
        raise HTTPException(status_code=404, detail="Incident not found")
    return detail
