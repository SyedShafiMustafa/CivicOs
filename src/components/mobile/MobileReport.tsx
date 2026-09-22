"use client";

/**
 * Mobile report sheet — camera-first observation wizard, aligned with the iOS
 * prototype's flow: evidence → AI analysis (auto-runs on capture) → clustering
 * candidate (shown BEFORE filing, with an explicit add/create choice) → filed.
 * Same endpoint contract as the desktop ReportFlow and the iOS wizard.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyzeImage, fetchSamples, matchIncidents, submitReport, useApi } from "@/lib/api";
import { ISSUE_LABELS } from "@/lib/colors";
import { IssueGlyph, GlyphCamera } from "@/lib/glyphs";
import { useToast } from "@/components/ui/Toast";
import { Button, ErrorState, PenField, Stamp, cn } from "@/components/ui/primitives";
import type { Analysis, IssueType, MatchResult, SamplePhoto } from "@/lib/types";

const STEPS = ["Evidence", "Analysis", "Match", "Filed"];

export default function MobileReport({
  onFiled,
  onNavigate,
}: {
  onFiled?: (incidentId: string) => void;
  onNavigate?: (screen: string, id?: string) => void;
} = {}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: samples, error: samplesError, retry: retrySamples } = useApi(fetchSamples, []);

  const [sample, setSample] = useState<SamplePhoto | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [category, setCategory] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = !preview ? 0 : !analysis ? 1 : !match ? 2 : 3;

  function reset() {
    setSample(null);
    setPreview(null);
    setAnalysis(null);
    setMatch(null);
    setCategory("");
    setError(null);
  }

  function pick(s: SamplePhoto) {
    setSample(s);
    setPreview(s.image_uri);
    setAnalysis(null);
    setMatch(null);
    setCategory("");
    setError(null);
    void analyze(s.image_uri, s);
  }

  function onFile(f: File | undefined) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : null;
      setSample(null);
      setPreview(data);
      setAnalysis(null);
      setMatch(null);
      setCategory("");
      void analyze(data, null);
    };
    reader.readAsDataURL(f);
  }

  /** Analyze + fetch clustering candidate in one pass (iOS parity). */
  async function analyze(dataPreview?: string | null, sampleOverride?: SamplePhoto | null) {
    const img = dataPreview !== undefined ? dataPreview : preview;
    const s = sampleOverride !== undefined ? sampleOverride : sample;
    if (!img) return;
    setAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("latitude", "17.4239");
      form.set("longitude", "78.3428");
      if (s) form.set("sample_id", s.id);
      const a = await analyzeImage(form);
      setAnalysis(a);
      setCategory(a.issue_type);
      const m = await matchIncidents(a);
      setMatch(m);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  /** Re-run clustering against the corrected category so scores stay honest. */
  async function reMatch(nextCategory: string) {
    setCategory(nextCategory);
    if (!analysis) return;
    try {
      const a2: Analysis = { ...analysis, issue_type: nextCategory as IssueType };
      const m = await matchIncidents(a2);
      setMatch(m);
    } catch {
      /* keep the previous candidate; the readout already says why it matched */
    }
  }

  async function fileIt(decision: "attach" | "new") {
    if (!analysis) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await submitReport({
        issue_type: (category || analysis.issue_type) as Analysis["issue_type"],
        description: analysis.description,
        severity: analysis.severity,
        confidence: analysis.confidence,
        mode: analysis.mode,
        latitude: 17.4239,
        longitude: 78.3428,
        image_data: preview?.startsWith("data:") ? preview : null,
        sample_id: sample?.id ?? null,
        match_decision: decision,
        attach_incident_id: decision === "attach" ? match?.candidates[0]?.incident.id ?? null : null,
        embedding: analysis.embedding,
      });
      toast("success", r.attached ? `Observation added to ${r.incident.id}` : `New incident ${r.incident.id} opened`);
      setMatch(null);
      setTimeout(() => {
        if (onFiled) onFiled(r.incident.id);
        else router.push(`/incidents/${r.incident.id}`);
      }, 900);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="px-3 pb-8 pt-4">
      <p className="font-data text-[9.5px] font-medium uppercase tracking-[0.26em] text-ink-faint">New observation</p>
      <h1 className="mt-2 font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.012em] text-ink">
        Photograph what is wrong.
      </h1>

      {/* Step rail (iOS parity) */}
      <div className="mt-3 flex items-center gap-1.5" aria-label={`Step ${step + 1} of 4: ${STEPS[step]}`}>
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center border font-data text-[9px] font-semibold",
                i < step && "border-accent bg-accent text-panel",
                i === step && "border-accent text-accent",
                i > step && "border-rule-strong text-ink-faint"
              )}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "hidden font-data text-[8px] uppercase tracking-[0.12em] sm:inline",
                i <= step ? "text-accent" : "text-ink-faint"
              )}
            >
              {s}
            </span>
            {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-rule-strong" /> : null}
          </div>
        ))}
      </div>

      {/* Capture frame */}
      <div className="plate-ink mt-4 overflow-hidden">
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Selected evidence" className="h-52 w-full object-cover" />
            <button
              onClick={() => {
                reset();
                fileRef.current?.click();
              }}
              className="press-mobile absolute right-2 top-2 border border-ink bg-panel px-2 py-1 font-data text-[9.5px] uppercase tracking-[0.1em]"
            >
              Retake
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="press-mobile flex h-52 w-full flex-col items-center justify-center gap-2 bg-well"
          >
            <GlyphCamera className="h-7 w-7 text-ink-soft" />
            <span className="font-data text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Attach a capture
            </span>
            <span className="text-[11px] text-ink-faint">Camera or gallery</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      {/* Sample evidence rail */}
      {!preview ? (
        <section className="mt-3">
          <p className="font-data text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">Or use sample evidence</p>
          {samplesError ? (
            <ErrorState message={samplesError} onRetry={retrySamples} />
          ) : (
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
              {(samples ?? []).map((s) => (
                <button key={s.id} onClick={() => pick(s)} className="press-mobile shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image_uri} alt={s.label} className="h-16 w-24 border border-ink object-cover" />
                </button>
              ))}
              {!samples ? <PenField className="h-16 w-full" /> : null}
            </div>
          )}
        </section>
      ) : null}

      {error ? <ErrorState message={error} onRetry={() => analyze()} className="mt-3" /> : null}

      {/* Analysis readout (auto after capture) */}
      {analyzing ? (
        <section className="plate mt-3 p-3.5" aria-busy="true">
          <p className="font-data text-[9.5px] uppercase tracking-[0.18em] text-accent">Reading the scene…</p>
          <PenField className="mt-2 h-3 w-1/2" />
          <div className="fscan mt-2 h-1.5" style={{ background: "var(--well)" }} />
        </section>
      ) : analysis ? (
        <section className="plate-ink mt-3 p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-data text-[9.5px] uppercase tracking-[0.18em] text-accent">Machine reading</span>
            <span className="font-data text-[10px] text-ink-faint">{Math.round(analysis.confidence * 100)}% confidence</span>
          </div>
          <p className="mt-1.5 font-display text-[19px] font-semibold text-ink">{analysis.issue_label}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Stamp tone={analysis.severity === "low" ? "hold" : analysis.severity === "medium" ? "warn" : "alert"}>
              {analysis.severity} severity
            </Stamp>
            <Stamp tone="neutral">mode: {analysis.mode}</Stamp>
          </div>

          {/* Why factors (all of them, iOS parity) */}
          {analysis.why?.length ? (
            <div className="mt-2.5 border-t border-rule pt-2.5">
              {analysis.why.map((w) => (
                <p key={w.label} className="text-[12px] leading-5 text-ink-soft">
                  <span className="font-semibold text-ink">{w.label}:</span> {w.detail}
                </p>
              ))}
            </div>
          ) : null}

          <p className="mt-3 font-data text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">Not right? Correct it</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(Object.keys(ISSUE_LABELS) as Array<keyof typeof ISSUE_LABELS>).map((k) => (
              <button
                key={k}
                onClick={() => void reMatch(k)}
                aria-pressed={category === k}
                className={cn(
                  "press-mobile flex items-center gap-1 border px-2 py-1 font-data text-[9.5px] uppercase tracking-[0.08em]",
                  category === k ? "border-ink bg-ink text-panel" : "border-rule-strong bg-panel text-ink-soft"
                )}
              >
                <IssueGlyph type={k} className="h-3 w-3" />
                {ISSUE_LABELS[k]}
              </button>
            ))}
          </div>
        </section>
      ) : preview ? (
        <section className="plate mt-3 p-3.5" aria-busy="true">
          <p className="font-data text-[9.5px] uppercase tracking-[0.18em] text-accent">Reading the scene…</p>
          <PenField className="mt-2 h-3 w-2/3" />
        </section>
      ) : null}

      {/* Clustering candidate — shown BEFORE filing (iOS parity) */}
      {analysis && match ? (
        <section className="plate mt-3 p-3.5">
          <p className="font-data text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">Incident clustering</p>
          {match.decision === "new" || match.candidates.length === 0 ? (
            <>
              <p className="mt-1.5 font-display text-[16px] font-semibold text-ink">No existing incident found nearby</p>
              <p className="mt-1 text-[12px] leading-5 text-ink-soft">
                This observation will open a new incident file for your area.
              </p>
              <Button
                onClick={() => void fileIt("new")}
                disabled={submitting}
                className="btn-press mt-3 w-full justify-center py-3 text-[13px]"
              >
                {submitting ? "Filing…" : "Create new incident"}
              </Button>
            </>
          ) : (
            <>
              <p className="mt-1.5 font-display text-[16px] font-semibold text-ink">Possible existing incident found</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-data text-[10.5px] font-semibold uppercase tracking-[0.1em] text-accent">
                  {match.candidates[0].incident.id} · {Math.round(match.candidates[0].similarity * 100)}% similar
                </span>
                <Stamp tone="neutral">{match.candidates[0].incident.status_label}</Stamp>
              </div>
              <div className="mt-1.5 space-y-0.5">
                {match.candidates[0].reasons.map((r) => (
                  <p key={r} className="text-[11.5px] leading-4 text-ink-soft">· {r}</p>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  onClick={() => void fileIt("attach")}
                  disabled={submitting}
                  className="btn-press justify-center py-2.5 text-[12px]"
                >
                  {submitting ? "Filing…" : `Add to ${match.candidates[0].incident.id}`}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void fileIt("new")}
                  disabled={submitting}
                  className="btn-press justify-center border border-rule-strong py-2.5 text-[12px]"
                >
                  {submitting ? "Filing…" : "Create new"}
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}
      {!preview ? (
        <p className="mt-2 text-center text-[11px] text-ink-faint">A capture is required before filing.</p>
      ) : null}
    </div>
  );
}
