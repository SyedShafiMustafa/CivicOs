"use client";

/**
 * In-frame incident detail for the /mobile device prototype.
 *
 * Mirrors the route page's content (status, why-this-matters, timeline,
 * evidence, verification) in the same editorial paper language, but renders
 * inside the frame with internal navigation — deep links from the dock,
 * lists and map land here instead of the desktop page.
 */
import { useState } from "react";
import { createComplaint, fetchAfterSamples, fetchIncident, submitComplaintDemo, verifyResolution, useApi } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { markerColor } from "@/lib/colors";
import { GlyphNext, IssueGlyph } from "@/lib/glyphs";
import { Button, Dot, ErrorState, PenField, PenPanel, Stamp, cn } from "@/components/ui/primitives";
import type { AfterSample, Complaint, IncidentDetail, Verification } from "@/lib/types";

const STATUS_STEPS = [
  { k: "reported", label: "Reported" },
  { k: "verified", label: "Verified" },
  { k: "assigned", label: "Assigned" },
  { k: "resolved", label: "Resolved" },
  { k: "resolution_verified", label: "Resolution verified" },
];

const stepIndex = (s: string) => {
  const i = STATUS_STEPS.findIndex((x) => x.k === s);
  if (i >= 0) return i;
  // in_progress counts as assigned-stage work
  return s === "in_progress" ? 2 : 0;
};

export default function IncidentDetail({
  id,
  onNavigate,
}: {
  id: string;
  onNavigate?: (screen: "map" | "home", incidentId?: string) => void;
}) {
  const { data, error, loading, retry } = useApi(() => fetchIncident(id), [id]);

  if (loading) {
    return (
      <div className="px-3 pt-4">
        <PenField className="h-6 w-48" />
        <div className="plate-ink mt-3">
          <PenPanel rows={4} />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="px-3 pt-4">
        <ErrorState message={error ?? "Incident not found"} onRetry={retry} />
      </div>
    );
  }

  const idx = stepIndex(data.status);
  const canVerify = data.status === "resolved" || data.status === "resolution_verified";

  return (
    <div className="px-3 pb-4 pt-4">
      {/* Header */}
      <button
        onClick={() => onNavigate?.("map", data.id)}
        className="press-mobile font-data text-[9.5px] uppercase tracking-[0.2em] text-accent"
        aria-label="Back to map"
      >
        ← Civic map
      </button>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-data text-[9.5px] uppercase tracking-[0.22em] text-ink-faint">{data.id}</p>
          <h1 className="mt-1 font-display text-[24px] font-semibold leading-tight tracking-[-0.012em] text-ink">
            {data.title}
          </h1>
        </div>
        <Dot color={markerColor(data)} className="mt-2 h-2.5 w-2.5 shrink-0" />
      </div>
      <p className="mt-1 text-[12.5px] text-ink-soft">{data.location_label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Stamp tone={markerColor(data) === "#3d7a4a" ? "ok" : data.priority === "high" || data.priority === "critical" ? "alert" : data.priority === "medium" ? "warn" : "hold"}>
          {data.status_label}
        </Stamp>
        <Stamp tone="neutral">{data.department}</Stamp>
      </div>

      {/* Figures */}
      <section className="plate mt-3 grid grid-cols-3 divide-x divide-rule" aria-label="Incident figures">
        {[
          ["Observations", data.observation_count],
          ["Contributors", data.contributor_count],
          ["Images", data.image_count],
        ].map(([l, n]) => (
          <div key={l as string} className="p-3 text-center">
            <p className="font-display text-[22px] font-semibold leading-none text-ink tabular">{n}</p>
            <p className="mt-1 font-data text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">{l}</p>
          </div>
        ))}
      </section>

      {/* Why this matters */}
      {data.why_factors?.length ? (
        <section className="plate-ink mt-3 p-4" aria-label="Why this matters">
          <p className="font-data text-[9.5px] uppercase tracking-[0.2em] text-accent">Why this matters</p>
          <ul className="mt-2 space-y-1.5">
            {data.why_factors.map((w) => (
              <li key={w.label} className="text-[12.5px] leading-5 text-ink">
                <span className="font-semibold">{w.label}</span>
                <span className="text-ink-soft"> — {w.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Timeline */}
      <section className="mt-4" aria-label="Incident timeline">
        <h2 className="font-display text-[16px] font-semibold text-ink">Incident log</h2>
        <div className="mt-2.5 space-y-0">
          {(data.timeline ?? []).map((t, i) => (
            <div key={t.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1.5 h-2 w-2 rotate-45 border border-ink bg-panel" />
                {i < (data.timeline?.length ?? 0) - 1 ? <span className="w-px flex-1 bg-rule-strong" /> : null}
              </div>
              <div className="pb-4">
                <p className="font-data text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
                  {fmtDateTime(t.timestamp)}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">{t.label}</p>
                <p className="mt-0.5 text-[11.5px] leading-4 text-ink-soft">{t.detail}</p>
              </div>
            </div>
          ))}
          {!data.timeline?.length ? <p className="text-[12px] text-ink-faint">No entries logged yet.</p> : null}
        </div>
      </section>

      {/* Status ladder */}
      <section className="plate mt-1 p-4" aria-label="Status">
        <p className="font-data text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">Status</p>
        <div className="mt-2.5 space-y-2">
          {STATUS_STEPS.map((s, i) => (
            <div key={s.k} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "h-2.5 w-2.5 rotate-45 border",
                  i <= idx ? "border-accent bg-accent" : "border-rule-strong bg-panel"
                )}
              />
              <span className={cn("text-[12px]", i <= idx ? "font-medium text-ink" : "text-ink-faint")}>{s.label}</span>
              {i === idx ? <span className="ml-auto font-data text-[8.5px] uppercase tracking-[0.14em] text-accent">current</span> : null}
            </div>
          ))}
        </div>
      </section>

      {/* Verification (hero loop) */}
      {canVerify && data.resolution ? <VerifySection resolutionId={data.resolution.id} beforeImage={data.resolution.before_image_uri} /> : null}

      {/* GHMC demo connector */}
      <ComplaintSection incidentId={data.id} complaint={data.complaint} />

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => onNavigate?.("map", data.id)}
          className="press-mobile flex items-center justify-center gap-1.5 border border-ink bg-ink py-2.5 font-data text-[10px] font-semibold uppercase tracking-[0.12em] text-panel"
        >
          <GlyphNext className="h-3.5 w-3.5 -rotate-90" /> Show on map
        </button>
        <button
          onClick={() => onNavigate?.("home", data.id)}
          className="press-mobile flex items-center justify-center gap-1.5 border border-rule-strong bg-panel py-2.5 font-data text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft"
        >
          <IssueGlyph type={data.issue_type} className="h-3.5 w-3.5" /> Overview
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * GHMC complaint draft + simulated submission, in-frame (iOS parity).
 * ------------------------------------------------------------------ */
function ComplaintSection({
  incidentId,
  complaint,
}: {
  incidentId: string;
  complaint: Complaint | null;
}) {
  const [draft, setDraft] = useState(complaint);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      setDraft(await createComplaint(incidentId));
    } catch {
      setErr("Draft generation unavailable.");
    }
    setBusy(false);
  }

  async function submitDemo() {
    if (!draft) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await submitComplaintDemo(draft.id);
      setDraft(res.complaint);
    } catch {
      setErr("Submission failed.");
    }
    setBusy(false);
  }

  return (
    <section className="plate mt-3 p-4" aria-label="GHMC complaint draft">
      <p className="font-data text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">Official complaint draft</p>
      {draft ? (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Stamp tone={draft.status === "submitted_demo" ? "ok" : "neutral"}>
              {draft.status === "submitted_demo" ? "Filed (demo)" : "Draft"}
            </Stamp>
            {draft.demo_reference ? (
              <Stamp tone="neutral">
                Ref <span className="ml-1 font-data tracking-normal">{draft.demo_reference}</span>
              </Stamp>
            ) : null}
          </div>
          <p className="mt-2 text-[12px] leading-5 text-ink-soft">{draft.description}</p>
          <dl className="mt-2.5 space-y-1.5 border-t border-rule pt-2.5 text-[11.5px]">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-faint">Routed to</dt>
              <dd className="text-right font-medium text-ink">{draft.department}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-faint">Evidence</dt>
              <dd className="font-data text-[10.5px] text-ink-soft">{draft.evidence_refs.join(", ")}</dd>
            </div>
          </dl>
          {draft.status !== "submitted_demo" ? (
            <Button onClick={submitDemo} disabled={busy} className="btn-press mt-3 w-full justify-center py-2.5 text-[12px]">
              {busy ? "Filing…" : "Submit (demo connector)"}
            </Button>
          ) : (
            <p className="mt-3 border border-ok/40 bg-ok-wash px-3 py-2.5 text-[11px] leading-4 text-ok">
              Prototype submission created. Simulated connector: no official municipal system was
              contacted.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-1.5 text-[12px] leading-5 text-ink-soft">
            Compile this incident into a formal complaint for the municipal portal. You review the
            draft before anything is filed.
          </p>
          <Button onClick={generate} disabled={busy} className="btn-press mt-3 w-full justify-center py-2.5 text-[12px]">
            {busy ? "Drafting…" : "Draft the complaint"}
          </Button>
        </>
      )}
      {err ? <p className="mt-2 text-[11.5px] text-alert">{err}</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Before/after verification, in-frame.
 * ------------------------------------------------------------------ */
function VerifySection({ resolutionId, beforeImage }: { resolutionId: string; beforeImage: string | null }) {
  const [samples, setSamples] = useState<AfterSample[]>([]);
  const [sample, setSample] = useState<AfterSample | null>(null);
  const [scanning, setScanning] = useState(false);
  const [verdict, setVerdict] = useState<Verification | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useApi(
    () =>
      fetchAfterSamples(resolutionId)
        .then((s) => {
          setSamples(s);
          return s;
        })
        .catch(() => {
          setSamples([]);
          return [];
        }),
    [resolutionId]
  );

  async function run() {
    if (!sample) return;
    setScanning(true);
    setErr(null);
    try {
      const v = await verifyResolution(resolutionId, {
        after_image_data: null,
        sample_id: sample.id,
        latitude: null,
        longitude: null,
      });
      setVerdict(v);
    } catch {
      setErr("Verification unavailable right now.");
    }
    setScanning(false);
  }

  const tone = verdict?.result === "verified" ? "ok" : verdict?.result === "issue_present" ? "alert" : "hold";
  const label =
    verdict?.result === "verified"
      ? "Repair verified"
      : verdict?.result === "issue_present"
        ? "Issue still present"
        : "Needs review";

  return (
    <section className="plate mt-3 p-4" aria-label="Verify this repair">
      <p className="font-data text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">Verify this repair</p>
      <p className="mt-1 text-[12px] leading-5 text-ink-soft">
        Compare the official after-photo against the before evidence. The scan reports what the pixels
        support, nothing more.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <p className="font-data text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">Before</p>
          {beforeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={beforeImage} alt="Pre-repair evidence" className="mt-1 h-20 w-full border border-rule-strong object-cover" />
          ) : (
            <div className="mt-1 flex h-20 items-center justify-center border border-rule-strong bg-well font-data text-[9px] uppercase tracking-[0.14em] text-ink-faint">
              Pre-repair evidence
            </div>
          )}
        </div>
        <div>
          <p className="font-data text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">After (pick a capture)</p>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => setSample(s)}
                aria-pressed={sample?.id === s.id}
                className={cn(
                  "press-mobile border-2",
                  sample?.id === s.id ? "border-accent" : "border-rule-strong"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image_uri} alt={s.label} className="h-[38px] w-full object-cover" />
              </button>
            ))}
            {!samples.length ? (
              <div className="col-span-2 flex h-[38px] items-center justify-center border border-rule-strong bg-well font-data text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
                No after captures
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {scanning ? (
        <div className="mt-3">
          <PenField className="h-2.5 w-2/3" />
        </div>
      ) : verdict ? (
        <div className="mt-3">
          <Stamp tone={tone}>{label}</Stamp>
          <p className="mt-1.5 font-data text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">
            {verdict.location_match ? "Location match" : "Location differs"}
            {verdict.visual_match != null ? ` · ${Math.round(verdict.visual_match * 100)}% visual agreement` : ""}
          </p>
          <div className="mt-1.5 space-y-1">
            {verdict.rationale.map((r) => (
              <p key={r} className="text-[11.5px] leading-4 text-ink-soft">· {r}</p>
            ))}
          </div>
        </div>
      ) : null}

      {err ? <p className="mt-2 text-[11.5px] text-alert">{err}</p> : null}

      <Button
        onClick={run}
        disabled={!sample || scanning}
        className="btn-press mt-3 w-full justify-center py-2.5 text-[12px]"
      >
        {scanning ? "Scanning…" : "Run before/after scan"}
      </Button>
    </section>
  );
}
