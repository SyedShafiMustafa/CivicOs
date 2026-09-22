from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import VerifyIn, VerificationOut
from app.store.demo import get_store

router = APIRouter(tags=["verification"])


@router.get("/resolutions/{resolution_id}")
def get_resolution(resolution_id: str):
    res = get_store().resolution(resolution_id)
    if not res:
        raise HTTPException(status_code=404, detail="Resolution not found")
    return res


@router.get("/resolutions/{resolution_id}/after-samples")
def after_samples(resolution_id: str):
    return get_store().after_samples(resolution_id)


@router.post("/resolutions/{resolution_id}/verify", response_model=VerificationOut)
def verify(resolution_id: str, payload: VerifyIn):
    out = get_store().verify(resolution_id, payload)
    if not out:
        raise HTTPException(status_code=404, detail="Resolution not found")
    return out
