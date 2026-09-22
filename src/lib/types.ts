// Types mirroring the CIVICOS backend schemas (app/schemas.py).

export type IssueType =
  | "roads"
  | "garbage"
  | "water"
  | "streetlights"
  | "drainage"
  | "accessibility"
  | "other";
export type Severity = "low" | "medium" | "high" | "critical";
export type Priority = Severity;
export type IncidentStatus =
  | "reported"
  | "verified"
  | "in_progress"
  | "assigned"
  | "resolved"
  | "resolution_verified";
export type AiMode = "demo" | "live";

export interface User {
  id: string;
  name: string;
  first_name: string;
  email: string;
  area: string;
  initials: string;
}

export interface WhyFactor {
  label: string;
  detail: string;
}

export interface Observation {
  id: string;
  user_id: string;
  user_name: string;
  image_uri: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
  issue_type: IssueType;
  confidence: number;
  severity: Severity;
  description: string;
  location_label: string;
}

export interface TimelineEvent {
  id: string;
  incident_id: string;
  event_type: string;
  label: string;
  detail: string;
  timestamp: string;
  actor: string;
}

export interface Incident {
  id: string;
  title: string;
  issue_type: IssueType;
  latitude: number;
  longitude: number;
  location_label: string;
  severity: Severity;
  priority: Priority;
  status: IncidentStatus;
  status_label: string;
  first_seen: string;
  last_seen: string;
  observation_count: number;
  contributor_count: number;
  image_count: number;
  department: string;
  summary: string;
  thumbnail_uri: string | null;
  distance_m: number | null;
}

export interface Resolution {
  id: string;
  incident_id: string;
  resolved_at: string;
  resolved_by: string;
  evidence_uri: string;
  notes: string;
  before_image_uri: string | null;
  before_observation_id: string | null;
}

export interface Verification {
  id: string;
  resolution_id: string;
  after_image_uri: string;
  result: "verified" | "issue_present" | "needs_review";
  location_match: boolean | null;
  visual_match: number | null;
  rationale: string[];
  created_at: string;
  verified_by: string;
}

export interface Complaint {
  id: string;
  incident_id: string;
  issue: string;
  location: string;
  description: string;
  severity_context: string;
  evidence_refs: string[];
  department: string;
  status: string;
  demo_reference: string | null;
  created_at: string;
}

export interface IncidentDetail extends Incident {
  why_factors: WhyFactor[];
  observations: Observation[];
  timeline: TimelineEvent[];
  resolution: Resolution | null;
  verification: Verification | null;
  complaint: Complaint | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  incident_id: string | null;
  timestamp: string;
  read: boolean;
}

export interface ActivityItem {
  id: string;
  kind: string;
  text: string;
  incident_id: string | null;
  timestamp: string;
}

export interface StatsOverview {
  nearby_issues: number;
  my_reports: number;
  resolved: number;
  active_alerts: number;
  nearby_radius_m: number;
}

export interface Analysis {
  issue_type: IssueType;
  issue_label: string;
  confidence: number;
  severity: Severity;
  description: string;
  evidence_quality: string;
  mode: AiMode;
  why: WhyFactor[];
  location_label: string;
  embedding: number[];
  latitude: number;
  longitude: number;
}

export interface MatchCandidate {
  incident: Incident;
  similarity: number;
  reasons: string[];
}

export interface MatchResult {
  decision: "attach" | "confirm" | "new";
  best_similarity: number;
  candidates: MatchCandidate[];
  analysis: Analysis;
}

export interface SamplePhoto {
  id: string;
  label: string;
  issue_type: IssueType;
  latitude: number;
  longitude: number;
  image_uri: string;
  hint: string | null;
}

export interface AfterSample {
  id: string;
  label: string;
  image_uri: string;
  hint: string | null;
}

export interface ReportBody {
  issue_type: IssueType;
  description: string;
  severity: Severity;
  confidence: number;
  mode: AiMode;
  latitude: number;
  longitude: number;
  image_data: string | null;
  sample_id: string | null;
  match_decision: "attach" | "new";
  attach_incident_id: string | null;
  embedding: number[];
}

export interface ReportResult {
  observation: Observation;
  incident: Incident;
  attached: boolean;
  similarity: number | null;
}

export interface MyReport {
  observation: Observation;
  incident: Incident;
  latest_update: string;
}

export interface Impact {
  observations: number;
  verified_contributions: number;
  incidents_resolved: number;
  areas_count: number;
  headline: string;
  subline: string;
  areas: { area: string; count: number }[];
  contributions: Incident[];
}

export interface Me {
  user: User;
  demo_mode: boolean;
  live_ai: boolean;
  today: string;
}

export interface VerifyBody {
  after_image_data: string | null;
  sample_id: string | null;
  latitude: number | null;
  longitude: number | null;
}
