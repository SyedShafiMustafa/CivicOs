"use client";

import { useEffect, useState } from "react";
import type {
  ActivityItem,
  AfterSample,
  Analysis,
  Complaint,
  Incident,
  IncidentDetail,
  MatchResult,
  Me,
  MyReport,
  Notification,
  ReportBody,
  ReportResult,
  SamplePhoto,
  StatsOverview,
  Impact,
  Verification,
  VerifyBody,
} from "./types";

/**
 * API base resolution — NEXT_PUBLIC_* vars are inlined at BUILD time, so this
 * needs no runtime env detection. API_URL is the FULL prefix before endpoint
 * paths ("/stats/overview" etc.):
 *  - production (.env.production, committed): same-origin /api/backend, which
 *    the Vercel services rewrite proxies to the FastAPI service
 *  - local dev: .env.local (not committed) sets http://localhost:8000/api
 *  - an explicit NEXT_PUBLIC_API_URL in the environment always wins
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  const isForm = init?.body instanceof FormData;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(init?.headers || {}),
      },
      ...(API_URL.startsWith("/") ? {} : { mode: "cors" as RequestMode }),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the CIVICOS backend. Check your connection and try again.");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") msg = body.detail;
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

export const apiGet = <T,>(path: string) => request<T>(path);
export const apiPost = <T,>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const apiPostForm = <T,>(path: string, form: FormData) =>
  request<T>(path, { method: "POST", body: form });

// --- Typed endpoint helpers -------------------------------------------------

export const fetchMe = () => apiGet<Me>("/me");
export const fetchStats = () => apiGet<StatsOverview>("/stats/overview");
export const fetchActivity = () => apiGet<ActivityItem[]>("/activity");
export const fetchImpact = () => apiGet<Impact>("/impact");
export const fetchNotifications = () => apiGet<Notification[]>("/notifications");

export interface IncidentQuery {
  types?: string;
  priorities?: string;
  statuses?: string;
  q?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export function fetchIncidents(query: IncidentQuery = {}): Promise<Incident[]> {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) p.set(k, String(v));
  });
  const qs = p.toString();
  return apiGet<Incident[]>(`/incidents${qs ? `?${qs}` : ""}`);
}

export const fetchIncident = (id: string) => apiGet<IncidentDetail>(`/incidents/${id}`);
export const fetchMine = () => apiGet<MyReport[]>("/reports/mine");
export const fetchSamples = () => apiGet<SamplePhoto[]>("/demo/samples");
export const fetchAfterSamples = (resolutionId: string) =>
  apiGet<AfterSample[]>(`/resolutions/${resolutionId}/after-samples`);

export const analyzeImage = (form: FormData) => apiPostForm<Analysis>("/reports/analyze", form);
export const matchIncidents = (analysis: Analysis) =>
  apiPost<MatchResult>("/reports/match", analysis);
export const submitReport = (body: ReportBody) => apiPost<ReportResult>("/reports", body);

export const verifyResolution = (resolutionId: string, body: VerifyBody) =>
  apiPost<Verification>(`/resolutions/${resolutionId}/verify`, body);

export const createComplaint = (incidentId: string) =>
  apiPost<Complaint>("/complaints", { incident_id: incidentId });
export const submitComplaintDemo = (complaintId: string) =>
  apiPost<{ complaint: Complaint; demo_reference: string; note: string }>(
    `/complaints/${complaintId}/submit-demo`
  );

export const assignIncident = (incidentId: string, department: string) =>
  apiPost<IncidentDetail>(`/ops/incidents/${incidentId}/assign`, { department });
export const resolveIncident = (incidentId: string, notes: string) =>
  apiPost<IncidentDetail>(`/ops/incidents/${incidentId}/resolve`, { notes, evidence: "auto" });

export const markNotificationRead = (id: string) => apiPost<{ ok: boolean }>(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => apiPost<{ ok: boolean }>("/notifications/read-all");

// --- Data hook -----------------------------------------------------------------

export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (alive) {
          setError(e.message || "Something went wrong");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, retry: () => setTick((t) => t + 1), setData };
}
