"use client";

import Link from "next/link";
import { fmtDate, fmtDistance, timeAgo } from "@/lib/format";
import { PRIORITY_INK, markerColor, priorityStamp, statusStamp, statusStage, STATUS_STAGES } from "@/lib/colors";
import type { Incident, IncidentStatus } from "@/lib/types";
import { Button, Stamp, Dot, EvidencePlate, cn } from "@/components/ui/primitives";
import { GlyphNext, IssueGlyph, MarkSeal } from "@/lib/glyphs";

/* ------------------------------------------------- compact map preview card */

export function IncidentPreviewCard({
  incident,
  onClose,
}: {
  incident: Incident;
  onClose?: () => void;
}) {
  return (
    <div className="plate-ink w-72 animate-fade-up">
      <EvidencePlate
        src={incident.thumbnail_uri}
        alt={`${incident.title} field evidence`}
        className="h-28 w-full"
      />
      <div className="p-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Dot color={markerColor(incident)} />
              <span className="truncate font-display text-[13px] font-semibold uppercase tracking-wide text-ink">
                {incident.title}
              </span>
            </div>
            <span className="mt-0.5 block font-data text-[11px] text-ink-faint">{incident.id}</span>
          </div>
          {onClose ? (
            <button onClick={onClose} className="p-0.5 font-data text-ink-faint hover:text-ink" aria-label="Close preview">
              ×
            </button>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Stamp tone={incident.priority === "low" ? "hold" : incident.priority === "medium" ? "warn" : "alert"}>
            {incident.priority} priority
          </Stamp>
          <Stamp tone={incident.status.includes("verif") ? "ok" : incident.status === "assigned" ? "warn" : "neutral"}>
            {incident.status_label}
          </Stamp>
        </div>

        <dl className="mt-3 space-y-1.5 border-t border-rule pt-2.5 text-xs text-ink-soft">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-faint">Observations</dt>
            <dd className="font-data font-medium text-ink tabular">{incident.observation_count}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-faint">Contributors</dt>
            <dd className="font-data font-medium text-ink tabular">{incident.contributor_count}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-faint">Last observed</dt>
            <dd className="font-medium text-ink">{timeAgo(incident.last_seen)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-faint">Status</dt>
            <dd className="font-medium text-ink">{incident.status_label}</dd>
          </div>
        </dl>

        <Link href={`/incidents/${incident.id}`} className="mt-3 block">
          <Button size="sm" className="w-full">
            Open incident file
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- list rows */

export function IncidentRow({
  incident,
  selected,
  onClick,
}: {
  incident: Incident;
  selected?: boolean;
  onClick?: () => void;
}) {
  const ink = PRIORITY_INK[incident.priority];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-well",
        selected && "bg-accent-wash/60"
      )}
    >
      <div className="relative shrink-0">
        <EvidencePlate
          src={incident.thumbnail_uri}
          alt=""
          className="h-12 w-16"
        />
        <span
          aria-hidden="true"
          className="absolute -left-1 -top-1 h-2.5 w-2.5 rotate-45 border border-panel"
          style={{ backgroundColor: markerColor(incident) }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13.5px] font-medium text-ink group-hover:text-accent">
            {incident.title}
          </span>
          <span className="hidden font-data text-[10.5px] text-ink-faint sm:inline">{incident.id}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-soft">
          <span>{incident.location_label}</span>
          {incident.distance_m != null ? (
            <span className="font-data text-[11px] text-ink-faint">· {fmtDistance(incident.distance_m)}</span>
          ) : null}
          <span className="font-data text-[11px] text-ink-faint">· {incident.observation_count} obs.</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Stamp tone={incident.priority === "low" ? "hold" : incident.priority === "medium" ? "warn" : "alert"}>
          <span aria-hidden="true" className="text-[0.7em]">{ink.tick}</span>
          {incident.priority}
        </Stamp>
        <span className="font-data text-[10.5px] text-ink-faint tabular">{incident.contributor_count} people</span>
      </div>
      <span className="shrink-0 text-rule-strong transition-colors group-hover:text-accent">
        <GlyphNext className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

/* -------------------------------------------------- status: chain of custody */

export function StatusStepper({ status }: { status: IncidentStatus }) {
  const current = statusStage(status);
  return (
    <ol className="grid grid-cols-5">
      {STATUS_STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={stage} className="relative border-t-2 pt-2.5"
            style={{ borderColor: done ? "var(--ok)" : active ? "var(--accent)" : "var(--rule)" }}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute -top-[5px] left-0 h-2 w-2 rotate-45 border",
                done && "border-ok bg-ok",
                active && "border-accent bg-accent",
                !done && !active && "border-rule-strong bg-panel"
              )}
            />
            <p className={cn(
              "pr-2 font-data text-[9.5px] uppercase leading-tight tracking-[0.08em]",
              active ? "font-semibold text-accent" : done ? "text-ink-soft" : "text-ink-faint"
            )}>
              {stage}
            </p>
            <p className="mt-0.5 font-data text-[9px] text-ink-faint">
              {done ? "recorded" : active ? "current" : `step ${i + 1}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/* --------------------------------------------------------------- timeline */

export function Timeline({
  events,
}: {
  events: { id: string; event_type: string; label: string; detail: string; timestamp: string; actor: string }[];
}) {
  return (
    <ol className="relative">
      {events.map((e, i) => (
        <li key={e.id} className="relative grid grid-cols-[52px_20px_1fr] gap-x-3">
          {/* date margin column */}
          <p className="pt-0.5 text-right font-data text-[10.5px] leading-5 text-ink-faint">
            {fmtDate(e.timestamp).replace(" ", "\u00a0")}
          </p>
          {/* spine */}
          <span className="relative flex justify-center" aria-hidden="true">
            <span className={cn("w-px", i < events.length - 1 ? "bg-rule-strong" : "bg-transparent")} />
            <span
              className={cn(
                "absolute top-1.5 h-2.5 w-2.5 rotate-45 border",
                e.event_type === "verification" || e.event_type === "resolved"
                  ? "border-ok bg-ok"
                  : e.event_type === "severity"
                    ? "border-alert bg-alert"
                    : e.event_type === "assigned"
                      ? "border-warn bg-warn"
                      : "border-accent bg-accent"
              )}
            />
            {i < events.length - 1 ? <span className="absolute top-5 bottom-0 w-px bg-rule" /> : null}
          </span>
          {/* entry */}
          <div className={cn("pb-5", i < events.length - 1 ? "" : "")}>
            <p className="text-[13px] font-medium leading-5 text-ink">{e.label}</p>
            <p className="mt-0.5 text-xs leading-5 text-ink-soft">{e.detail}</p>
            <p className="mt-1 font-data text-[10px] text-ink-faint">
              {e.actor} · {timeAgo(e.timestamp)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Verification seal used on resolved + verified incidents. */
export function VerifiedSeal({ label = "Repair verified" }: { label?: string }) {
  return (
    <span className="stamp inline-flex items-center gap-2 border-2 border-ok/60 bg-ok-wash px-3 py-2 text-ok animate-stamp-in">
      <MarkSeal className="h-5 w-5" />
      <span className="font-display text-[13px] font-bold uppercase tracking-[0.12em]">{label}</span>
    </span>
  );
}
