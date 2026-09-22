"""API schemas (Pydantic v2).

These mirror the database model in supabase/schema.sql. A future Supabase
store returns the exact same shapes, so the frontend never changes when the
persistence layer is swapped.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

IssueType = Literal[
    "roads", "garbage", "water", "streetlights", "drainage", "accessibility", "other"
]
Severity = Literal["low", "medium", "high", "critical"]
Priority = Literal["low", "medium", "high", "critical"]
IncidentStatus = Literal[
    "reported", "verified", "in_progress", "assigned", "resolved", "resolution_verified"
]
VerificationResult = Literal["verified", "issue_present", "needs_review"]
AiMode = Literal["demo", "live"]


# --- Core entities -------------------------------------------------------------

class UserOut(BaseModel):
    id: str
    name: str
    first_name: str
    email: str
    area: str
    initials: str
    avatar_uri: Optional[str] = None


class ObservationOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_avatar_uri: Optional[str] = None
    image_uri: Optional[str] = None
    latitude: float
    longitude: float
    timestamp: datetime
    issue_type: IssueType
    confidence: float
    severity: Severity
    description: str
    location_label: str


class WhyFactor(BaseModel):
    label: str
    detail: str


class TimelineEventOut(BaseModel):
    id: str
    incident_id: str
    event_type: str
    label: str
    detail: str
    timestamp: datetime
    actor: str


class IncidentSummary(BaseModel):
    id: str
    title: str
    issue_type: IssueType
    latitude: float
    longitude: float
    location_label: str
    severity: Severity
    priority: Priority
    status: IncidentStatus
    status_label: str
    first_seen: datetime
    last_seen: datetime
    observation_count: int
    contributor_count: int
    image_count: int
    department: str
    summary: str
    thumbnail_uri: Optional[str] = None
    distance_m: Optional[float] = None


class ResolutionOut(BaseModel):
    id: str
    incident_id: str
    resolved_at: datetime
    resolved_by: str
    evidence_uri: str
    notes: str
    before_image_uri: Optional[str] = None
    before_observation_id: Optional[str] = None


class VerificationOut(BaseModel):
    id: str
    resolution_id: str
    after_image_uri: str
    result: VerificationResult
    location_match: Optional[bool] = None
    visual_match: Optional[float] = None
    rationale: list[str]
    created_at: datetime
    verified_by: str


class ComplaintOut(BaseModel):
    id: str
    incident_id: str
    issue: str
    location: str
    description: str
    severity_context: str
    evidence_refs: list[str]
    department: str
    status: str
    demo_reference: Optional[str] = None
    created_at: datetime


class ComplaintIn(BaseModel):
    incident_id: str


class IncidentDetail(IncidentSummary):
    why_factors: list[WhyFactor]
    observations: list[ObservationOut]
    timeline: list[TimelineEventOut]
    resolution: Optional[ResolutionOut] = None
    verification: Optional[VerificationOut] = None
    complaint: Optional[ComplaintOut] = None


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: str
    incident_id: Optional[str] = None
    timestamp: datetime
    read: bool


class ActivityItem(BaseModel):
    id: str
    kind: str
    text: str
    incident_id: Optional[str] = None
    timestamp: datetime


class StatsOverview(BaseModel):
    nearby_issues: int
    my_reports: int
    resolved: int
    active_alerts: int
    nearby_radius_m: int


# --- Report flow ----------------------------------------------------------------

class AnalyzeOut(BaseModel):
    issue_type: IssueType
    issue_label: str
    confidence: float
    severity: Severity
    description: str
    evidence_quality: str
    mode: AiMode
    why: list[WhyFactor]
    location_label: str
    embedding: list[float]
    latitude: float
    longitude: float


class MatchCandidateOut(BaseModel):
    incident: IncidentSummary
    similarity: float
    reasons: list[str]


class MatchOut(BaseModel):
    decision: Literal["attach", "confirm", "new"]
    best_similarity: float
    candidates: list[MatchCandidateOut]
    analysis: AnalyzeOut


class ReportIn(BaseModel):
    issue_type: IssueType
    description: str = ""
    severity: Severity
    confidence: float = 0.8
    mode: AiMode = "demo"
    latitude: float
    longitude: float
    image_data: Optional[str] = None
    sample_id: Optional[str] = None
    match_decision: Literal["attach", "new"] = "new"
    attach_incident_id: Optional[str] = None
    embedding: list[float] = Field(default_factory=list)


class ReportOut(BaseModel):
    observation: ObservationOut
    incident: IncidentSummary
    attached: bool
    similarity: Optional[float] = None


class VerifyIn(BaseModel):
    after_image_data: Optional[str] = None
    sample_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class OpsAssignIn(BaseModel):
    department: str


class OpsResolveIn(BaseModel):
    notes: str = ""
    evidence: str = "auto"


class SamplePhotoOut(BaseModel):
    id: str
    label: str
    issue_type: IssueType
    latitude: float
    longitude: float
    image_uri: str
    hint: Optional[str] = None


class ImpactOut(BaseModel):
    observations: int
    verified_contributions: int
    incidents_resolved: int
    areas_count: int
    headline: str
    subline: str
    areas: list[dict]
    contributions: list[IncidentSummary]


class MeOut(BaseModel):
    user: UserOut
    demo_mode: bool
    live_ai: bool
    today: str
