from __future__ import annotations

from fastapi import APIRouter

from app.schemas import NotificationOut
from app.store.demo import get_store

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications():
    return get_store().list_notifications()


@router.post("/read-all")
def read_all():
    get_store().mark_all_read()
    return {"ok": True}


@router.post("/{notification_id}/read")
def read_one(notification_id: str):
    get_store().mark_read(notification_id)
    return {"ok": True}
