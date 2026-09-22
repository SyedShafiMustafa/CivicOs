"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { fetchIncidents, useApi } from "@/lib/api";
import { ISSUE_LABELS, PRIORITY_INK, markerColor } from "@/lib/colors";
import type { IssueType } from "@/lib/types";
import CivicMap, { MapLegend } from "@/components/map/CivicMap";
import { IncidentPreviewCard, IncidentRow } from "@/components/incident/shared";
import { Button, EmptyState, ErrorState, PenPanel, Stamp, cn } from "@/components/ui/primitives";
import { GlyphClose, GlyphFilters, GlyphSearch, IssueGlyph } from "@/lib/glyphs";
import MobileMapView from "@/components/mobile/MobileMapView";

const ISSUE_TYPES: IssueType[] = [
  "roads",
  "garbage",
  "water",
  "streetlights",
  "drainage",
  "accessibility",
];

const STATUS_GROUPS = [
  { key: "all", label: "All", statuses: "" },
  { key: "active", label: "Active", statuses: "reported,verified,in_progress,assigned" },
  { key: "resolved", label: "Resolved", statuses: "resolved,resolution_verified" },
];

const PRIORITIES = ["critical", "high", "medium", "low"] as const;

function MapPageInner() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [types, setTypes] = useState<Set<IssueType>>(new Set());
  const [priority, setPriority] = useState<string>("all");
  const [statusGroup, setStatusGroup] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const statusCfg = STATUS_GROUPS.find((s) => s.key === statusGroup)!;
  const typesKey = [...types].sort().join(",");

  const query = useMemo(
    () => ({
      types: typesKey || undefined,
      priorities: priority !== "all" ? priority : undefined,
      statuses: statusCfg.statuses || undefined,
      q: debouncedQ || undefined,
    }),
    [typesKey, priority, statusCfg, debouncedQ]
  );

  const { data, error, loading, retry } = useApi(() => fetchIncidents(query), [query]);

  const incidents = data ?? [];
  const selectedIncident = incidents.find((i) => i.id === selected) ?? null;
  const activeFilterCount =
    (types.size > 0 ? 1 : 0) + (priority !== "all" ? 1 : 0) + (statusGroup !== "all" ? 1 : 0);

  const filters = (
    <div className="space-y-6 p-4">
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint">
          <GlyphSearch className="h-4 w-4" />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search incidents…"
          className="h-9 w-full border border-rule-strong bg-paper pl-8 pr-7 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        {q ? (
          <button
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            aria-label="Clear search"
          >
            <GlyphClose className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <fieldset>
        <legend className="mb-2 font-data text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
          Issue type
        </legend>
        <div className="space-y-0.5">
          {ISSUE_TYPES.map((t) => {
            const checked = types.has(t);
            const Glyph = IssueGlyph;
            return (
              <button
                key={t}
                onClick={() =>
                  setTypes((prev) => {
                    const next = new Set(prev);
                    if (next.has(t)) next.delete(t);
                    else next.add(t);
                    return next;
                  })
                }
                className={cn(
                  "flex w-full items-center gap-2.5 px-2 py-1.5 text-left text-[13px] transition-colors",
                  checked ? "bg-accent-wash font-medium text-ink" : "text-ink-soft hover:bg-well"
                )}
                aria-pressed={checked}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center border",
                    checked ? "border-accent bg-accent text-panel" : "border-rule-strong bg-panel"
                  )}
                >
                  {checked ? <span className="h-1.5 w-1.5 rotate-45 bg-panel" /> : null}
                </span>
                <Glyph type={t} className={cn("h-4 w-4", checked ? "text-accent" : "text-ink-faint")} />
                {ISSUE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-data text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
          Priority
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...PRIORITIES] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={cn(
                "border px-2 py-1 font-data text-[11px] uppercase tracking-[0.06em] transition-colors",
                priority === p
                  ? "border-ink bg-ink text-panel"
                  : "border-rule-strong bg-panel text-ink-soft hover:border-ink"
              )}
            >
              {p === "all" ? "All" : (
                <>
                  <span aria-hidden="true" className="mr-1 text-[0.7em]">{PRIORITY_INK[p as keyof typeof PRIORITY_INK].tick}</span>
                  {p}
                </>
              )}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-data text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
          Status
        </legend>
        <div className="grid grid-cols-3 border border-rule-strong">
          {STATUS_GROUPS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusGroup(s.key)}
              className={cn(
                "border-r border-rule-strong py-1.5 text-[11.5px] font-medium transition-colors last:border-r-0",
                statusGroup === s.key ? "bg-ink text-panel" : "bg-panel text-ink-soft hover:bg-well"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      {activeFilterCount > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            setTypes(new Set());
            setPriority("all");
            setStatusGroup("all");
            setQ("");
          }}
        >
          <GlyphClose className="h-3.5 w-3.5" /> Reset filters
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile full-map sheet (below lg) */}
      <div className="lg:hidden">
        <MobileMapView initialQ={debouncedQ} />
      </div>

      {/* Desktop map workspace (lg and up) */}
      <div className="hidden h-[calc(100vh-3.5rem)] flex-col lg:flex lg:flex-row">
      {/* Filter rail */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-rule-strong bg-panel scroll-thin lg:block">
        <p className="border-b border-rule px-4 py-3 font-data text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
          Survey filters
        </p>
        {filters}
      </aside>

      {/* Map */}
      <div className="relative min-h-[320px] flex-1">
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          <CivicMap
            incidents={incidents}
            selectedId={selected}
            onSelect={(id) => setSelected(id === selected ? null : id)}
            className="absolute inset-0"
          />
        )}
        <MapLegend className="absolute bottom-10 left-3" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFilters(true)}
          >
            <GlyphFilters className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="ml-1 border border-panel bg-ink px-1 font-data text-[10px] text-panel">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
          <span className="plate px-2.5 py-1.5 font-data text-[11px] text-ink-soft">
            {loading ? "Surveying…" : `${incidents.length} incidents plotted`}
          </span>
        </div>

        {selectedIncident ? (
          <div className="absolute right-3 top-3">
            <IncidentPreviewCard incident={selectedIncident} onClose={() => setSelected(null)} />
          </div>
        ) : null}

        {/* Mobile filter sheet */}
        {mobileFilters ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink/45" onClick={() => setMobileFilters(false)} />
            <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r-2 border-ink bg-panel scroll-thin">
              <div className="flex items-center justify-between border-b border-rule-strong px-4 py-3">
                <span className="font-display text-sm font-semibold text-ink">Survey filters</span>
                <button onClick={() => setMobileFilters(false)} aria-label="Close filters" className="text-ink-faint hover:text-ink">
                  <GlyphClose className="h-4 w-4" />
                </button>
              </div>
              {filters}
            </div>
          </div>
        ) : null}
      </div>

      {/* Incident ledger */}
      <aside className="hidden w-[340px] shrink-0 flex-col border-l border-rule-strong bg-panel xl:flex">
        <div className="border-b border-rule px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Incident register</h2>
          <p className="font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            Sorted by distance from you
          </p>
        </div>
        <div className="flex-1 overflow-y-auto border-t border-rule scroll-thin">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : loading ? (
            <PenPanel rows={6} />
          ) : incidents.length === 0 ? (
            <EmptyState title="No incidents match these filters" hint="Try widening the filters or clearing the search." />
          ) : (
            <ul className="divide-y divide-rule">
              {incidents.map((inc) => (
                <li key={inc.id}>
                  <IncidentRow
                    incident={inc}
                    selected={selected === inc.id}
                    onClick={() => setSelected(inc.id === selected ? null : inc.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
      </div>
    </>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-3.5rem)]" />}>
      <MapPageInner />
    </Suspense>
  );
}
