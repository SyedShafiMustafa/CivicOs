from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas import IncidentDetail, IncidentSummary
from app.store.demo import get_store

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _csv(value: str | None) -> list[str] | None:
    if not value:
        return None
    parts = [v.strip() for v in value.split(",") if v.strip()]
    return parts or None


@router.get("", response_model=list[IncidentSummary])
def list_incidents(
    types: str | None = Query(None, description="comma-separated issue types"),
    priorities: str | None = Query(None, description="comma-separated priorities"),
    statuses: str | None = Query(None, description="comma-separated statuses"),
    q: str | None = Query(None),
    latitude: float | None = Query(None),
    longitude: float | None = Query(None),
    radius: float | None = Query(None, description="metres around lat/lng"),
):
    return get_store().list_incidents(
        types=_csv(types), priorities=_csv(priorities), statuses=_csv(statuses),
        q=q, lat=latitude, lng=longitude, radius=radius,
    )


@router.get("/{incident_id}", response_model=IncidentDetail)
def get_incident(incident_id: str):
    detail = get_store().incident_detail(incident_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Incident not found")
    return detail
