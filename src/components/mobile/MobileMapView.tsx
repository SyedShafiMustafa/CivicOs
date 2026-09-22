"use client";

/**
 * Mobile full-map sheet — the entire viewport is the map, with quick filter
 * chips on top, a locate-me control, and a bottom-sheet incident card.
 * Desktop /map is untouched.
 */
import { useMemo, useState } from "react";
import { fetchIncidents, useApi } from "@/lib/api";
import { IssueGlyph, GlyphReset } from "@/lib/glyphs";
import CivicMap from "@/components/map/CivicMap";
import { IncidentPreviewCard } from "@/components/incident/shared";
import { ErrorState, PenField, cn } from "@/components/ui/primitives";
import type { IssueType } from "@/lib/types";

const FILTERS: Array<{ key: IssueType | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "roads", label: "Roads" },
  { key: "garbage", label: "Garbage" },
  { key: "water", label: "Water" },
  { key: "streetlights", label: "Lights" },
  { key: "drainage", label: "Drainage" },
  { key: "accessibility", label: "Access" },
];

export default function MobileMapView({
  initialQ = "",
  initialTypes = "",
  initialPriority = "",
  onNavigate,
}: {
  initialQ?: string;
  initialTypes?: string;
  initialPriority?: string;
  onNavigate?: (screen: string, id?: string) => void;
}) {
  const { data, loading, error, retry } = useApi(
    () =>
      fetchIncidents({
        q: initialQ || undefined,
        types: initialTypes || undefined,
        priorities: initialPriority || undefined,
      }),
    [initialQ, initialTypes, initialPriority]
  );
  const [filter, setFilter] = useState<IssueType | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [located, setLocated] = useState(false);

  const shown = useMemo(
    () => (data ?? []).filter((i) => filter === "all" || i.issue_type === filter),
    [data, filter]
  );
  const selectedIncident = shown.find((i) => i.id === selected) ?? null;

  /** Re-center on the user: pick the nearest incident so the view is useful. */
  function locateMe() {
    setLocated(true);
    // CivicMap centers on the user by default; nearest incident is auto-selected
    // so the sheet opens with something actionable.
    if (!data?.length) return;
    const home: [number, number] = [17.4127, 78.435];
    const nearest = [...data].sort((a, b) => {
      const da = (a.latitude - home[0]) ** 2 + (a.longitude - home[1]) ** 2;
      const db = (b.latitude - home[0]) ** 2 + (b.longitude - home[1]) ** 2;
      return da - db;
    })[0];
    if (nearest) setSelected(nearest.id);
  }

  return (
    <div className="relative h-[calc(100dvh-116px)] overflow-hidden lg:hidden">
      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : loading ? (
        <div className="flex h-full items-end justify-center bg-well pb-24">
          <div className="w-full space-y-2 px-8">
            <PenField className="h-2.5" />
            <PenField className="h-2.5 w-2/3" />
          </div>
        </div>
      ) : (
        <CivicMap
          incidents={shown}
          selectedId={selected}
          onSelect={setSelected}
          showUser
          fitAll={!located}
          chrome={["chips", "dock"]}
          className="absolute inset-0 h-full w-full"
        />
      )}

      {/* Filter chips */}
      <div
        className="no-scrollbar absolute inset-x-0 top-0 z-10 flex gap-1.5 overflow-x-auto px-3 py-2.5"
        style={{ WebkitOverflowScrolling: "touch" }}
        role="tablist"
        aria-label="Filter by issue type"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "press-mobile flex shrink-0 items-center gap-1.5 border px-3 py-1.5 font-data text-[10px] font-semibold uppercase tracking-[0.1em]",
              filter === f.key ? "border-ink bg-ink text-panel" : "border-rule-strong bg-panel/90 text-ink-soft"
            )}
          >
            {f.key !== "all" ? <IssueGlyph type={f.key} className="h-3.5 w-3.5" /> : null}
            {f.label}
          </button>
        ))}
      </div>

      {/* Locate me (right edge, thumb zone, above the dock) */}
      {selectedIncident ? null : (
        <button
          onClick={locateMe}
          aria-label="Locate me"
          aria-pressed={located}
          className={cn(
            "press-mobile absolute right-3 z-20 flex h-11 w-11 items-center justify-center border shadow-[3px_3px_0_0_var(--rule-strong)]",
            located ? "border-accent bg-accent text-panel" : "border-rule-strong bg-panel/95 text-ink-soft",
            "bottom-[168px]"
          )}
        >
          {located ? <GlyphReset className="h-5 w-5" /> : (
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="square" aria-hidden="true">
              <circle cx="10" cy="10" r="3.2" />
              <circle cx="10" cy="10" r="7" strokeWidth={1.1} />
              <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
            </svg>
          )}
        </button>
      )}

      {/* Bottom-sheet incident card */}
      {selectedIncident ? (
        <div className="absolute inset-x-2 bottom-2 z-20 animate-fade-up">
          <IncidentPreviewCard incident={selectedIncident} onClose={() => setSelected(null)} />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-[168px] z-10 text-center">
          <span className="border border-rule-strong bg-panel/90 px-3 py-1.5 font-data text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            {shown.length} incidents · tap a marker
          </span>
        </div>
      )}
    </div>
  );
}
