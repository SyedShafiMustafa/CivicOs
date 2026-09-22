"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  createComplaint,
  fetchAfterSamples,
  fetchIncident,
  submitComplaintDemo,
  verifyResolution,
  useApi,
} from "@/lib/api";
import { fmtDateLong, fmtDateTime, pct, timeAgo, daysBetween } from "@/lib/format";
import { ISSUE_LABELS } from "@/lib/colors";
import type { AfterSample, Complaint, Verification } from "@/lib/types";
import CivicMap from "@/components/map/CivicMap";
import { StatusStepper, Timeline, VerifiedSeal } from "@/components/incident/shared";
import {
  Button,
  Card,
  EvidencePlate,
  FieldLabel,
  EmptyState,
  ErrorState,
  PenField,
  PenPanel,
  SectionHead,
  Stamp,
  Textarea,
  cn,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import {
  GlyphBack,
  GlyphCamera,
  GlyphClose,
  GlyphNext,
  GlyphReset,
  IssueGlyph,
  MarkComplaint,
  MarkDept,
  MarkSeal,
  MarkSeverity,
} from "@/lib/glyphs";

/* ------------------------------------------------------- verification panel */

function VerifyPanel({
  resolutionId,
  beforeImage,
  notes,
  resolvedBy,
  resolvedAt,
  verification,
  onVerified,
}: {
  resolutionId: string;
  beforeImage: string | null;
  notes: string;
  resolvedBy: string;
  resolvedAt: string;
  verification: Verification | null;
  onVerified: () => void;
}) {
  const toast = useToast();
  const after = useApi(() => fetchAfterSamples(resolutionId), [resolutionId]);
  const [open, setOpen] = useState(false);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [afterSample, setAfterSample] = useState<AfterSample | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Verification | null>(verification);

  async function run() {
    if (!afterImage && !afterSample) {
      toast("error", "Capture or select an after photo first.");
      return;
    }
    setRunning(true);
    try {
      const v = await verifyResolution(resolutionId, {
        after_image_data: afterImage,
        sample_id: afterSample?.id ?? null,
        latitude: 17.4127,
        longitude: 78.435,
      });
      setResult(v);
      onVerified();
      toast("success", "Verification recorded.");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const tone =
    result?.result === "verified" ? "ok" : result?.result === "issue_present" ? "alert" : "hold";
  const titles = {
    verified: "Repair verified",
    issue_present: "Issue still present",
    needs_review: "Needs review",
  } as const;

  return (
    <Card tone="ink">
      <SectionHead
        title="Resolution and citizen verification"
        sub="A file closes only when citizens confirm the fix"
      />
      <div className="border-t border-rule p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <MarkDept className="h-3.5 w-3.5 text-warn" />
          <span>
            Marked resolved <span className="font-medium text-ink">{fmtDateLong(resolvedAt)}</span> by{" "}
            <span className="font-medium text-ink">{resolvedBy}</span>
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{notes}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 font-data text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
              Exhibit A · before
            </p>
            <EvidencePlate src={beforeImage} alt="Before the resolution" className="aspect-[4/3] w-full" />
          </div>
          <div>
            <p className="mb-1.5 font-data text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
              Exhibit B · after, captured by you
            </p>
            {afterImage || afterSample ? (
              <EvidencePlate
                src={afterImage ?? afterSample!.image_uri}
                alt="After capture"
                className="aspect-[4/3] w-full"
              />
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 border border-dashed border-rule-strong bg-well/60 text-ink-faint">
                <GlyphCamera className="h-6 w-6" />
                <span className="font-data text-[10px] uppercase tracking-[0.14em]">No after capture yet</span>
              </div>
            )}
          </div>
        </div>

        {result ? (
          <div
            className={cn(
              "mt-4 border-2 p-4 animate-stamp-in",
              tone === "ok" && "border-ok/50 bg-ok-wash",
              tone === "alert" && "border-alert/50 bg-alert-wash",
              tone === "hold" && "border-hold/50 bg-hold-wash"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className={cn("text-[20px]", tone === "ok" ? "text-ok" : tone === "alert" ? "text-alert" : "text-hold")}>
                <MarkSeal className="h-5 w-5" />
              </span>
              <span className="font-display text-base font-bold uppercase tracking-[0.08em] text-ink">
                {titles[result.result]}
              </span>
              {result.visual_match != null ? (
                <Stamp tone={tone === "ok" ? "ok" : tone === "alert" ? "alert" : "hold"} className="ml-auto">
                  visual match {pct(result.visual_match)}
                </Stamp>
              ) : null}
            </div>
            <ul className="mt-3 space-y-1.5">
              {result.rationale.map((r, i) => (
                <li key={i} className="flex gap-2.5 text-xs leading-5 text-ink-soft">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45",
                      tone === "ok" ? "bg-ok" : tone === "alert" ? "bg-alert" : "bg-hold"
                    )}
                  />
                  {r}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-rule pt-2.5 font-data text-[10px] leading-4 text-ink-faint">
              Machine comparison is assistive. It reads visible evidence only and cannot guarantee
              what it cannot see. For unclear cases an on-site check remains the source of truth.
            </p>
            {result.result === "needs_review" ? (
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => { setResult(null); setAfterImage(null); setAfterSample(null); }}>
                <GlyphReset className="h-3.5 w-3.5" /> Submit another capture
              </Button>
            ) : null}
          </div>
        ) : open ? (
          <div className="mt-4 border border-rule-strong bg-panel p-4">
            <p className="font-display text-[13px] font-semibold text-ink">Capture guidance</p>
            <ul className="mt-1.5 space-y-1 text-xs leading-5 text-ink-soft">
              <li className="flex gap-2"><span aria-hidden="true" className="font-data text-ink-faint">01</span> Stand roughly 3 m back and match the original camera angle above.</li>
              <li className="flex gap-2"><span aria-hidden="true" className="font-data text-ink-faint">02</span> Include the same landmark in frame: pole, kerb or gate.</li>
              <li className="flex gap-2"><span aria-hidden="true" className="font-data text-ink-faint">03</span> Avoid heavy zoom; the comparison needs the surrounding scene.</li>
            </ul>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-rule-strong bg-well/60 py-5 text-ink-soft transition-colors hover:border-accent hover:text-accent">
                <GlyphCamera className="h-5 w-5" />
                <span className="text-xs font-medium">Take or upload the after photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setAfterImage(typeof reader.result === "string" ? reader.result : null);
                      setAfterSample(null);
                    };
                    reader.readAsDataURL(f);
                  }}
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(after.data ?? []).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setAfterSample(s);
                      setAfterImage(null);
                    }}
                    className={cn(
                      "border transition-colors",
                      afterSample?.id === s.id
                        ? "border-accent shadow-[2px_2px_0_0_var(--accent)]"
                        : "border-rule-strong hover:border-accent"
                    )}
                    title={s.label}
                  >
                    <EvidencePlate src={s.image_uri} alt={s.label} className="aspect-square w-full border-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={run} disabled={running}>
                {running ? "Comparing…" : "Run before / after comparison"}
                {!running ? <MarkSeal className="h-4 w-4" /> : null}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <Button onClick={() => setOpen(true)}>
              <MarkSeal className="h-4 w-4" /> Verify this repair
            </Button>
            <p className="mt-2 text-xs text-ink-soft">
              Take a fresh photo from the same vantage point. Verified repairs turn green on the
              civic map and close the file for everyone.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------- complaint panel */

function ComplaintPanel({
  incidentId,
  complaint,
  onChanged,
}: {
  incidentId: string;
  complaint: Complaint | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Complaint | null>(complaint);

  async function generate() {
    setBusy(true);
    try {
      const c = await createComplaint(incidentId);
      setDraft(c);
      onChanged();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitDemo() {
    if (!draft) return;
    setBusy(true);
    try {
      const res = await submitComplaintDemo(draft.id);
      setDraft(res.complaint);
      onChanged();
      toast("success", `Prototype submission created · ${res.demo_reference}`);
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionHead
        title="Official complaint draft"
        sub="Assemble the file for the municipal portal. Submission is simulated in this prototype."
      />
      <div className="border-t border-rule p-5">
        {draft ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Stamp tone={draft.status === "submitted_demo" ? "ok" : "neutral"}>
                {draft.status === "submitted_demo" ? "Filed (demo)" : "Draft"}
              </Stamp>
              {draft.demo_reference ? (
                <Stamp tone="neutral">
                  Ref <span className="ml-1 font-data tracking-normal">{draft.demo_reference}</span>
                </Stamp>
              ) : null}
            </div>

            <div className="border border-rule-strong bg-well/60 p-4">
              <pre className="whitespace-pre-wrap font-body text-[13px] leading-6 text-ink-soft">
                {draft.description}
              </pre>
            </div>

            <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <div className="flex justify-between gap-2 sm:block">
                <dt className="font-data text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">Routed to</dt>
                <dd className="font-medium text-ink">{draft.department}</dd>
              </div>
              <div className="flex justify-between gap-2 sm:block">
                <dt className="font-data text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">Evidence references</dt>
                <dd className="font-data text-[11px] text-ink-soft">{draft.evidence_refs.join(", ")}</dd>
              </div>
            </dl>

            {draft.status !== "submitted_demo" ? (
              <Button onClick={submitDemo} disabled={busy}>
                {busy ? "Filing…" : "Submit (demo connector)"}
                {!busy ? <MarkComplaint className="h-4 w-4" /> : null}
              </Button>
            ) : (
              <p className="border border-ok/40 bg-ok-wash px-3 py-2.5 text-xs leading-5 text-ok">
                Prototype submission created. This is a simulated connector: no official municipal
                system was contacted. A real integration plugs in behind the same interface.
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm leading-6 text-ink-soft">
              Compile this incident into a formal complaint: issue, plot, severity context, evidence
              references and the recommended department. You review the draft before anything is
              filed.
            </p>
            <Button className="mt-3" onClick={generate} disabled={busy}>
              {busy ? "Drafting…" : "Draft the complaint"}
              {!busy ? <MarkComplaint className="h-4 w-4" /> : null}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------------- page */

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data, error, loading, retry, setData } = useApi(() => fetchIncident(id), [id]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-5 p-4 lg:p-8">
        <PenField className="h-7 w-64" />
        <div className="plate-ink">
          <PenPanel rows={4} />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="plate"><PenPanel rows={5} /></div>
            <div className="plate"><PenPanel rows={3} /></div>
          </div>
          <div className="plate"><PenPanel rows={6} /></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Card tone="ink">
          <ErrorState message={error ?? "Incident not found"} onRetry={retry} />
        </Card>
      </div>
    );
  }

  const inc = data;
  const withImages = inc.observations.filter((o) => o.image_uri);
  const closed = inc.status === "resolution_verified";

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-4 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between font-data text-[11px] uppercase tracking-[0.14em]">
        <Link href="/map" className="inline-flex items-center gap-1.5 text-ink-faint hover:text-accent">
          <GlyphBack className="h-3.5 w-3.5" /> Civic map
        </Link>
        <span className="text-ink-faint">
          File <span className="text-ink">{inc.id}</span> · opened {fmtDateLong(inc.first_seen)}
        </span>
      </div>

      {/* Dossier head */}
      <Card tone="ink" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink bg-well text-accent">
                <IssueGlyph type={inc.issue_type} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-data text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
                  {ISSUE_LABELS[inc.issue_type]} · incident file
                </p>
                <h1 className="font-display text-[24px] font-semibold leading-tight tracking-tight text-ink lg:text-[28px]">
                  {inc.title}
                </h1>
              </div>
              {closed ? <VerifiedSeal /> : null}
            </div>
            <p className="mt-2.5 max-w-2xl text-sm leading-6 text-ink-soft">{inc.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-soft">
              <span>{inc.location_label}</span>
              <span className="inline-flex items-center gap-1.5">
                <MarkDept className="h-3.5 w-3.5 text-ink-faint" />
                {inc.department}
              </span>
              <span className="font-data text-[10.5px] uppercase tracking-[0.1em]">
                last observed {timeAgo(inc.last_seen)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Stamp tone={inc.priority === "low" ? "hold" : inc.priority === "medium" ? "warn" : "alert"} className="px-2.5 py-1 text-[11.5px]">
              <MarkSeverity className="h-3 w-3" />
              {inc.priority} priority
            </Stamp>
            <Stamp tone={closed ? "ok" : inc.status === "assigned" ? "warn" : "accent"} className="px-2.5 py-1 text-[11.5px]">
              {inc.status_label}
            </Stamp>
          </div>
        </div>

        {/* Figures strip */}
        <div className="mt-5 grid grid-cols-2 border-t border-rule pt-4 sm:grid-cols-4">
          {[
            { label: "Observations", value: String(inc.observation_count) },
            { label: "Contributors", value: String(inc.contributor_count) },
            { label: "Exhibits", value: String(inc.image_count) },
            { label: "Days on file", value: String(daysBetween(inc.first_seen, inc.last_seen)) },
          ].map((s, i) => (
            <div key={s.label} className={cn("px-1", i !== 0 && "sm:border-l sm:border-rule sm:pl-5")}>
              <p className="font-display text-[26px] font-semibold leading-none text-ink tabular">{s.value}</p>
              <p className="mt-1 font-data text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Chain of custody */}
        <div className="mt-5 border-t border-rule pt-4">
          <p className="mb-3 font-data text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
            Chain of custody
          </p>
          <StatusStepper status={inc.status} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Main column */}
        <div className="space-y-5">
          {/* Plot plate */}
          <Card className="overflow-hidden">
            <div className="relative h-56">
              <CivicMap
                incidents={[inc]}
                selectedId={inc.id}
                showUser={false}
                fitAll={false}
                chrome={null}
                className="absolute inset-0"
              />
              <div className="absolute bottom-3 left-3 border border-ink bg-panel px-3 py-2 shadow-[3px_3px_0_0_var(--rule)]">
                <p className="text-xs font-medium text-ink">{inc.location_label}</p>
                <p className="font-data text-[10px] text-ink-faint tabular">
                  {inc.latitude.toFixed(4)} N, {inc.longitude.toFixed(4)} E
                </p>
              </div>
            </div>
          </Card>

          {/* Incident log — first on mobile (inline), sidebar on desktop.
              Rendered once here in DOM order; the desktop grid places it via
              order utilities so there is exactly one timeline. */}
          <Card className="lg:hidden">
            <SectionHead title="Incident log" sub="Every entry, in order, signed by its actor" />
            <div className="max-h-[70vh] overflow-y-auto border-t border-rule p-4 scroll-thin">
              <Timeline events={inc.timeline} />
            </div>
          </Card>

          {/* Why this matters */}
          <Card>
            <SectionHead title="Why this file matters" sub="Explainable factors, recorded in the open. No opaque score." />
            <ul className="border-t border-rule">
              {inc.why_factors.map((f) => (
                <li key={f.label} className="flex gap-3 border-b border-rule px-5 py-3 last:border-0">
                  <span aria-hidden="true" className="mt-[7px] h-2 w-2 shrink-0 rotate-45 bg-accent" />
                  <div>
                    <p className="text-[13px] font-medium text-ink">{f.label}</p>
                    <p className="text-xs leading-5 text-ink-soft">{f.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Evidence */}
          <Card>
            <SectionHead
              title="Exhibits"
              sub={`${withImages.length} photo exhibit${withImages.length === 1 ? "" : "s"} from contributors`}
            />
            <div className="border-t border-rule p-5">
              {withImages.length === 0 ? (
                <EmptyState
                  icon={<GlyphCamera className="h-5 w-5" />}
                  title="No photo exhibits yet"
                  hint="Observations without photos still count toward the file."
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {withImages.map((o, i) => (
                    <button
                      key={o.id}
                      onClick={() => setLightbox(o.image_uri!)}
                      className="group border border-rule-strong text-left transition-colors hover:border-accent"
                    >
                      <EvidencePlate src={o.image_uri} alt={`Exhibit by ${o.user_name}`} className="aspect-[4/3] w-full border-0" />
                      <span className="flex items-center justify-between px-2 py-1.5">
                        <span className="font-data text-[10px] uppercase tracking-wide text-ink-soft">
                          Ex. {String.fromCharCode(65 + i)} · {o.user_name.split(" ")[0]}
                        </span>
                        <span className="font-data text-[9.5px] text-ink-faint">{timeAgo(o.timestamp)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Resolution & verification */}
          {inc.resolution ? (
            <VerifyPanel
              resolutionId={inc.resolution.id}
              beforeImage={inc.resolution.before_image_uri}
              notes={inc.resolution.notes}
              resolvedBy={inc.resolution.resolved_by}
              resolvedAt={inc.resolution.resolved_at}
              verification={inc.verification}
              onVerified={retry}
            />
          ) : null}

          {/* Complaint */}
          <ComplaintPanel incidentId={inc.id} complaint={inc.complaint} onChanged={retry} />
        </div>

        {/* Side column — desktop only; the mobile copy renders in the main column */}
        <div className="hidden space-y-5 lg:block">
          <Card className="lg:sticky lg:top-[72px]">
            <SectionHead title="Incident log" sub="Every entry, in order, signed by its actor" />
            <div className="max-h-[620px] overflow-y-auto border-t border-rule p-5 scroll-thin">
              <Timeline events={inc.timeline} />
            </div>
          </Card>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-6" onClick={() => setLightbox(null)}>
          <div className="relative border-2 border-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="Exhibit" className="max-h-[85vh] max-w-3xl" />
            <button
              onClick={() => setLightbox(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center border border-ink bg-panel text-ink hover:bg-well"
              aria-label="Close exhibit"
            >
              <GlyphClose className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
