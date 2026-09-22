"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  analyzeImage,
  fetchSamples,
  matchIncidents,
  submitReport,
  useApi,
} from "@/lib/api";
import { ISSUE_LABELS, PRIORITY_INK } from "@/lib/colors";
import { pct } from "@/lib/format";
import type {
  Analysis,
  IssueType,
  MatchResult,
  ReportBody,
  ReportResult,
  SamplePhoto,
} from "@/lib/types";
import {
  Button,
  Card,
  ConfidenceGauge,
  ErrorState,
  EvidencePlate,
  FieldLabel,
  PenField,
  Select,
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
  GlyphSearch,
  IssueGlyph,
  MarkSeal,
  MarkSeverity,
} from "@/lib/glyphs";

const STEPS = [
  { key: "capture", label: "Capture" },
  { key: "analysis", label: "Reading" },
  { key: "match", label: "Matching" },
  { key: "done", label: "Filed" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const DEMO_COORDS = { lat: 17.4127, lng: 78.435 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Coords = { lat: number; lng: number; source: "device" | "demo" | "sample" };

function getCoords(sample: SamplePhoto | null): Promise<Coords> {
  if (sample) {
    return Promise.resolve({ lat: sample.latitude, lng: sample.longitude, source: "sample" });
  }
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ...DEMO_COORDS, source: "demo" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: "device" }),
      () => resolve({ ...DEMO_COORDS, source: "demo" }),
      { timeout: 4000 }
    );
  });
}

export default function ReportFlow() {
  const toast = useToast();
  const samples = useApi(fetchSamples, []);
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<StepKey>("capture");
  const [file, setFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [sample, setSample] = useState<SamplePhoto | null>(null);
  const [coords, setCoords] = useState<Coords>({ ...DEMO_COORDS, source: "demo" });
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [category, setCategory] = useState<IssueType>("roads");
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [attachId, setAttachId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const hasImage = !!file || !!sample;
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function setPreviewSafe(url: string | null) {
    setPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  }

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast("error", "Please choose an image file.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast("error", "Image is too large (max 8 MB).");
      return;
    }
    setFile(f);
    setSample(null);
    const url = URL.createObjectURL(f);
    setPreviewSafe(url);
    const reader = new FileReader();
    reader.onload = () => setDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(f);
  }

  function pickSample(s: SamplePhoto) {
    setSample(s);
    setFile(null);
    setDataUrl(null);
    setPreviewSafe(s.image_uri);
  }

  async function runAnalyze(final: boolean) {
    setError(null);
    setAnalyzing(true);
    try {
      const c = await getCoords(sample);
      setCoords(c);
      const form = new FormData();
      form.set("latitude", String(c.lat));
      form.set("longitude", String(c.lng));
      if (sample) form.set("sample_id", sample.id);
      if (file) form.set("file", file);
      if (final) {
        form.set("override_issue_type", category);
        form.set("description", description);
      }
      const [a] = await Promise.all([analyzeImage(form), sleep(850)]);
      if (final) return a;
      setAnalysis(a);
      setCategory(a.issue_type);
      setDescription(a.description);
      setAnalyzing(false);
      return a;
    } catch (e) {
      setAnalyzing(false);
      setError((e as Error).message);
      return null;
    }
  }

  async function toAnalysis() {
    if (!hasImage) return;
    setStep("analysis");
    const a = await runAnalyze(false);
    if (!a) setStep("capture");
  }

  async function toMatch() {
    setAnalyzing(true);
    const a = await runAnalyze(true);
    setAnalyzing(false);
    if (!a) return;
    setStep("match");
    setMatching(true);
    try {
      const m = await matchIncidents(a);
      setMatch(m);
      setAttachId(m.candidates[0]?.incident.id ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMatching(false);
    }
  }

  async function submit(decision: "attach" | "new") {
    if (!match) return;
    setSubmitting(true);
    try {
      const body: ReportBody = {
        issue_type: category,
        description,
        severity: match.analysis.severity,
        confidence: match.analysis.confidence,
        mode: match.analysis.mode,
        latitude: coords.lat,
        longitude: coords.lng,
        image_data: dataUrl,
        sample_id: sample?.id ?? null,
        match_decision: decision,
        attach_incident_id: decision === "attach" ? attachId : null,
        embedding: match.analysis.embedding,
      };
      const r = await submitReport(body);
      setResult(r);
      setStep("done");
      toast("success", r.attached ? `Observation added to ${r.incident.id}` : `New incident ${r.incident.id} opened`);
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep("capture");
    setFile(null);
    setDataUrl(null);
    setSample(null);
    setPreviewSafe(null);
    setAnalysis(null);
    setMatch(null);
    setResult(null);
    setDescription("");
    setCoords({ ...DEMO_COORDS, source: "demo" });
  }

  const locLabel =
    coords.source === "device"
      ? "Positioned by your device"
      : coords.source === "sample"
        ? "Positioned by the sample photo"
        : "Demo position, Banjara Hills. Enable location for precise plots.";

  function sevTone(s: string): "alert" | "warn" | "hold" {
    return s === "high" || s === "critical" ? "alert" : s === "medium" ? "warn" : "hold";
  }

  return (
    <div className="space-y-5">
      {/* Step rule — a section index, not a pill trail */}
      <ol className="flex items-center gap-2 font-data text-[10.5px] uppercase tracking-[0.14em]">
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span className={cn(
                "flex h-5 w-5 items-center justify-center border",
                done && "border-ok bg-ok text-panel",
                active && "border-ink bg-ink text-panel",
                !done && !active && "border-rule-strong bg-panel text-ink-faint"
              )}>
                {done ? "✓" : i + 1}
              </span>
              <span className={cn(active ? "font-semibold text-ink" : done ? "text-ink-soft" : "text-ink-faint")}>
                {s.label}
              </span>
              {i < STEPS.length - 1 ? <span aria-hidden="true" className="h-px w-6 bg-rule-strong sm:w-10" /> : null}
            </li>
          );
        })}
      </ol>

      <Card tone="ink" className="overflow-hidden">
        {error && step !== "capture" ? (
          <div className="border-b border-alert/40 bg-alert-wash px-5 py-2.5 text-xs text-alert">
            {error} · go back and try again.
          </div>
        ) : null}

        {/* ---------------- CAPTURE ---------------- */}
        {step === "capture" ? (
          <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
            <div className="border-b border-rule p-5 md:border-b-0 md:border-r">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              {preview ? (
                <div className="relative">
                  <EvidencePlate src={preview} alt="Selected evidence" className="aspect-[4/3] w-full" />
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <button
                      onClick={() => fileInput.current?.click()}
                      className="border border-ink bg-panel px-2.5 py-1 text-xs font-medium text-ink hover:bg-well"
                    >
                      Change
                    </button>
                    <button
                      onClick={() => {
                        setFile(null);
                        setSample(null);
                        setDataUrl(null);
                        setPreviewSafe(null);
                      }}
                      className="border border-ink bg-panel p-1 text-ink-soft hover:bg-well"
                      aria-label="Remove image"
                    >
                      <GlyphClose className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 font-data text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    Exhibit A · awaiting analysis
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pickFile(e.dataTransfer.files?.[0]);
                  }}
                  className="group flex h-64 w-full flex-col items-center justify-center gap-3 border border-dashed border-rule-strong bg-well/60 text-ink-soft transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="flex h-12 w-12 items-center justify-center border border-current">
                    <GlyphCamera className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-medium">Open the camera, or drop a photo here</span>
                  <span className="max-w-[250px] text-center font-data text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">
                    Field capture · one clear photo
                  </span>
                </button>
              )}
            </div>

            <div className="p-5">
              <p className="font-display text-sm font-semibold text-ink">Or pull from the demo survey</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                Curated evidence frames with fixed plot positions, for walking the prototype.
              </p>
              {samples.error ? (
                <ErrorState message={samples.error} onRetry={samples.retry} />
              ) : samples.loading ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <PenField key={i} className="aspect-square w-full" />
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {(samples.data ?? []).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => pickSample(s)}
                      className={cn(
                        "border text-left transition-colors",
                        sample?.id === s.id
                          ? "border-accent shadow-[2px_2px_0_0_var(--accent)]"
                          : "border-rule-strong hover:border-accent"
                      )}
                    >
                      <EvidencePlate src={s.image_uri} alt={s.label} className="aspect-square w-full border-0" />
                      <span className="block truncate px-1.5 py-1 font-data text-[9.5px] uppercase tracking-wide text-ink-soft">
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center gap-2.5 border border-rule-strong bg-well px-3 py-2.5">
                <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink-faint">Plot</span>
                <p className="text-xs text-ink-soft">{locLabel}</p>
              </div>

              <div className="mt-4 flex justify-end">
                <Button disabled={!hasImage || analyzing} onClick={toAnalysis}>
                  {analyzing ? "Reading…" : "Read the photo"}
                  {!analyzing ? <GlyphSearch className="h-4 w-4" /> : null}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* ---------------- ANALYSIS ---------------- */}
        {step === "analysis" ? (
          <div className="grid gap-0 md:grid-cols-[1fr_1.2fr]">
            <div className="border-b border-rule bg-well/70 p-5 md:border-b-0 md:border-r">
              {preview ? (
                <EvidencePlate src={preview} alt="Evidence under analysis" className="aspect-[4/3] w-full" />
              ) : null}
              <dl className="mt-3 space-y-1 font-data text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">
                <div className="flex justify-between border-b border-rule pb-1">
                  <dt>Plot</dt>
                  <dd className="text-ink-soft">
                    {analysis ? analysis.location_label : "locating…"}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-rule pb-1">
                  <dt>Lat</dt>
                  <dd className="text-ink-soft tabular">{coords.lat.toFixed(5)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Long</dt>
                  <dd className="text-ink-soft tabular">{coords.lng.toFixed(5)}</dd>
                </div>
              </dl>
            </div>

            <div className="p-5">
              {analyzing || !analysis ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center border border-dashed border-rule-strong text-ink-faint">
                      <GlyphSearch className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-medium text-ink">Reading the evidence…</p>
                  </div>
                  <PenField className="w-1/2" />
                  <PenField className="h-3 w-full" />
                  <PenField className="h-16 w-full opacity-70" />
                  <p className="font-data text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">
                    Classifying issue · estimating severity · grading evidence
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-data text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                      Machine reading · {analysis.mode === "live" ? "live model" : "demo vision"}
                    </p>
                    <Stamp tone={analysis.mode === "live" ? "ok" : "hold"}>
                      {analysis.mode === "live" ? "Live" : "Demo"}
                    </Stamp>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border border-ink bg-well text-accent">
                      <IssueGlyph type={analysis.issue_type} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display text-[22px] font-semibold leading-tight text-ink">
                        {analysis.issue_label}
                      </p>
                      <div className="mt-2">
                        <ConfidenceGauge value={analysis.confidence} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-y border-rule py-2.5">
                    <Stamp tone={sevTone(analysis.severity)}>
                      <MarkSeverity className="h-3 w-3" />
                      {analysis.severity} severity
                    </Stamp>
                    <span className="font-data text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
                      plot fixed ✓ evidence {analysis.evidence_quality} ✓
                    </span>
                  </div>

                  <div className="border border-rule-strong bg-well/60 p-3.5">
                    <p className="font-display text-[13px] font-semibold text-ink">
                      Why this reads as {analysis.severity} priority
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {analysis.why.map((f) => (
                        <li key={f.label} className="flex gap-2.5 border-b border-rule pb-1.5 last:border-0 last:pb-0">
                          <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" />
                          <span className="text-xs leading-5 text-ink-soft">
                            <span className="font-medium text-ink">{f.label}.</span> {f.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <FieldLabel>Correct the category if needed</FieldLabel>
                      <Select value={category} onChange={(e) => setCategory(e.target.value as IssueType)}>
                        {(Object.keys(ISSUE_LABELS) as IssueType[]).map((t) => (
                          <option key={t} value={t}>
                            {ISSUE_LABELS[t]}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="block">
                      <FieldLabel>Describe what you saw</FieldLabel>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setStep("capture")}>
                      <GlyphBack className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={toMatch} disabled={analyzing}>
                      Find matching incidents <GlyphNext className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ---------------- MATCH ---------------- */}
        {step === "match" ? (
          <div className="p-5">
            {matching || !match ? (
              <div className="mx-auto max-w-md space-y-4 py-10 text-center">
                <svg viewBox="0 0 120 70" className="mx-auto w-48 text-rule-strong" aria-hidden="true">
                  <rect x="1" y="1" width="118" height="68" fill="none" stroke="currentColor" strokeDasharray="5 4" strokeWidth="1.2" className="field-march" />
                  <circle cx="38" cy="35" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="82" cy="28" r="10" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M46 33 L72 30" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1.2" className="field-march" />
                </svg>
                <p className="font-display text-sm font-semibold text-ink">
                  Comparing against nearby incidents…
                </p>
                <p className="text-xs leading-5 text-ink-soft">
                  Checking plot position, category, description and visual similarity, so duplicate
                  files are never opened.
                </p>
              </div>
            ) : match.candidates.length > 0 ? (
              <div className="mx-auto max-w-2xl">
                <div className="border border-accent bg-accent-wash/60 p-4 shadow-[4px_4px_0_0_var(--rule)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold text-ink">
                        An existing incident matches your photo
                      </p>
                      <p className="text-xs leading-5 text-ink-soft">
                        Adding your observation to this file strengthens the case with the department.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-display text-[34px] font-bold leading-none text-accent tabular">
                        {pct(match.best_similarity)}
                      </span>
                      <span className="block font-data text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
                        similarity
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {match.candidates.map((c, idx) => (
                    <button
                      key={c.incident.id}
                      onClick={() => setAttachId(c.incident.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border p-3.5 text-left transition-colors",
                        attachId === c.incident.id
                          ? "border-accent bg-accent-wash/40 shadow-[3px_3px_0_0_var(--accent-wash)]"
                          : "border-rule-strong bg-panel hover:border-accent"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center border",
                          attachId === c.incident.id ? "border-accent bg-accent" : "border-rule-strong bg-panel"
                        )}
                      >
                        {attachId === c.incident.id ? <span className="h-1.5 w-1.5 rotate-45 bg-panel" /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-[13.5px] font-medium text-ink">{c.incident.title}</span>
                          <span className="font-data text-[10.5px] text-ink-faint">{c.incident.id}</span>
                          {idx === 0 && match.decision === "attach" ? (
                            <Stamp tone="accent">Best match</Stamp>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {c.incident.location_label} · {c.incident.observation_count} observations ·{" "}
                          {c.incident.status_label}
                        </p>
                        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                          {c.reasons.map((r) => (
                            <li key={r} className="flex items-center gap-1 font-data text-[10px] text-ink-faint">
                              <span aria-hidden="true" className="h-1 w-1 rotate-45 bg-accent" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span className="shrink-0 font-data text-sm font-semibold text-ink tabular">
                        {pct(c.similarity)}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setStep("analysis")}>
                    <GlyphBack className="h-4 w-4" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => submit("new")} disabled={submitting}>
                      Open a new file
                    </Button>
                    <Button onClick={() => submit("attach")} disabled={submitting || !attachId}>
                      {submitting ? "Filing…" : "Add to this incident"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-md py-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-ok/50 bg-ok-wash text-ok">
                  <MarkSeal className="h-6 w-6" />
                </span>
                <p className="mt-4 font-display text-sm font-semibold text-ink">
                  No similar incident exists nearby
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  Position, category, description and visual similarity were checked against every
                  open file. Your report will open a new incident.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep("analysis")}>
                    <GlyphBack className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => submit("new")} disabled={submitting}>
                    {submitting ? "Filing…" : "Open new incident"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* ---------------- DONE ---------------- */}
        {step === "done" && result ? (
          <div className="mx-auto max-w-lg px-5 py-10 text-center">
            <span className="stamp mx-auto inline-flex items-center gap-2 border-2 border-accent/60 bg-accent-wash px-4 py-2.5 text-accent animate-stamp-in">
              <MarkSeal className="h-5 w-5" />
              <span className="font-display text-sm font-bold uppercase tracking-[0.14em]">
                Observation filed
              </span>
            </span>

            {result.attached ? (
              <p className="mt-5 text-sm leading-6 text-ink-soft">
                Your observation joined incident{" "}
                <span className="font-data font-semibold text-ink">{result.incident.id}</span>,{" "}
                {result.incident.title} at {result.incident.location_label}. Recorded similarity:{" "}
                <span className="font-data font-medium text-ink">{pct(result.similarity ?? 0)}</span>.
              </p>
            ) : (
              <p className="mt-5 text-sm leading-6 text-ink-soft">
                New incident <span className="font-data font-semibold text-ink">{result.incident.id}</span>{" "}
                opened at {result.incident.location_label}. You will be notified as matching
                observations arrive.
              </p>
            )}

            <p className="mt-3 font-data text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Exhibit filed · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {PRIORITY_INK[match?.analysis.severity ?? "low"].tick} {match?.analysis.severity} priority
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href={`/incidents/${result.incident.id}`}>
                <Button>Open the incident file</Button>
              </Link>
              <Button variant="secondary" onClick={reset}>
                <GlyphReset className="h-3.5 w-3.5" /> File another
              </Button>
              <Link href="/">
                <Button variant="ghost">Back to overview</Button>
              </Link>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
