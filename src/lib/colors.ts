import type { IncidentStatus, IssueType, Priority } from "./types";

/**
 * Semantic inks: alert (high/critical), warn (medium), hold (low), ok (resolved).
 * Priority is encoded by ink weight + fill, never rainbow hue shifts.
 */
export const PRIORITY_INK: Record<Priority, { text: string; wash: string; hex: string; tick: string }> = {
  critical: { text: "text-alert", wash: "bg-alert-wash", hex: "#a03430", tick: "▟" },
  high: { text: "text-alert", wash: "bg-alert-wash", hex: "#a03430", tick: "▙" },
  medium: { text: "text-warn", wash: "bg-warn-wash", hex: "#a4691c", tick: "▚" },
  low: { text: "text-hold", wash: "bg-hold-wash", hex: "#8d7430", tick: "▞" },
};

export function markerColor(inc: { priority: Priority; status: IncidentStatus }): string {
  if (inc.status === "resolved" || inc.status === "resolution_verified") return "#3d7a4a";
  return PRIORITY_INK[inc.priority]?.hex ?? "#8d7430";
}

/** Stamp-style priority chip: tick pattern + small caps ink. */
export function priorityStamp(p: Priority): string {
  switch (p) {
    case "critical":
    case "high":
      return "bg-alert-wash text-alert border-alert/40";
    case "medium":
      return "bg-warn-wash text-warn border-warn/40";
    case "low":
      return "bg-hold-wash text-hold border-hold/40";
  }
}

export function statusStamp(s: IncidentStatus): string {
  switch (s) {
    case "reported":
      return "bg-well text-ink-soft border-rule-strong";
    case "verified":
    case "in_progress":
      return "bg-accent-wash text-accent border-accent/40";
    case "assigned":
      return "bg-warn-wash text-warn border-warn/40";
    case "resolved":
    case "resolution_verified":
      return "bg-ok-wash text-ok border-ok/40";
  }
}

export const STATUS_STAGES = [
  "Reported",
  "Verified",
  "Assigned",
  "Resolved",
  "Verified repair",
] as const;

export function statusStage(s: IncidentStatus): number {
  switch (s) {
    case "reported":
      return 0;
    case "verified":
      return 1;
    case "in_progress":
    case "assigned":
      return 2;
    case "resolved":
      return 3;
    case "resolution_verified":
      return 4;
  }
}

export const ISSUE_LABELS: Record<IssueType, string> = {
  roads: "Roads",
  garbage: "Garbage",
  water: "Water",
  streetlights: "Streetlights",
  drainage: "Drainage",
  accessibility: "Accessibility",
  other: "Other",
};

export const DEPARTMENTS = [
  "GHMC Roads & Transportation",
  "GHMC Solid Waste Management",
  "HMWSSB Water Supply & Sewerage",
  "GHMC Electric Wing (Street Lighting)",
  "GHMC Storm Water Drains",
  "GHMC Town Planning (Accessibility Cell)",
  "GHMC Zonal Commissionerate",
];
