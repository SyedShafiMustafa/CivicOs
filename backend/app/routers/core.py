from __future__ import annotations

from fastapi import APIRouter

from app import config
from app.schemas import ActivityItem, ImpactOut, MeOut, StatsOverview
from app.store.demo import get_store

router = APIRouter(tags=["core"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "demo_mode": True,
        "live_ai": bool(config.OPENAI_API_KEY),
        "version": config.API_VERSION,
    }


@router.get("/me", response_model=MeOut)
def me():
    return get_store().me()


@router.get("/stats/overview", response_model=StatsOverview)
def stats_overview():
    return get_store().overview()


@router.get("/activity", response_model=list[ActivityItem])
def activity():
    return get_store().list_activity()


@router.get("/impact", response_model=ImpactOut)
def impact():
    return get_store().impact()
