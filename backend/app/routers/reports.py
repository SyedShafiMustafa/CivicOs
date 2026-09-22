from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas import AnalyzeOut, MatchOut, ReportIn, ReportOut, SamplePhotoOut
from app.store.demo import get_store

router = APIRouter(tags=["reports"])


@router.post("/reports/analyze", response_model=AnalyzeOut)
async def analyze(
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: str = Form(""),
    sample_id: str | None = Form(None),
    override_issue_type: str | None = Form(None),
    file: UploadFile | None = File(None),
):
    image_bytes = await file.read() if file is not None else None
    mime = file.content_type if file is not None and file.content_type else "image/jpeg"
    return get_store().analyze(
        sample_id=sample_id, image_bytes=image_bytes, mime=mime,
        latitude=latitude, longitude=longitude, description=description,
        override_type=override_issue_type,
    )


@router.post("/reports/match", response_model=MatchOut)
def match(analysis: AnalyzeOut):
    return get_store().match(analysis)


@router.post("/reports", response_model=ReportOut)
def submit_report(report: ReportIn):
    return get_store().report(report)


@router.get("/reports/mine")
def my_reports():
    return get_store().mine()


@router.get("/demo/samples", response_model=list[SamplePhotoOut])
def demo_samples():
    return get_store().sample_photos()
