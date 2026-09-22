"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchActivity,
  fetchIncidents,
  fetchMe,
  fetchStats,
  useApi,
} from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { ActivityGlyph, GlyphCamera, GlyphPlus } from "@/lib/glyphs";
import CivicMap, { MapLegend } from "@/components/map/CivicMap";
import { IncidentPreviewCard, IncidentRow } from "@/components/incident/shared";
import { Button, Card, EmptyState, ErrorState, PenField, PenPanel, SectionHead, cn } from "@/components/ui/primitives";
import MobileHome from "@/components/mobile/MobileHome";
import type { Incident } from "@/lib/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function OverviewPage() {
  const { data: me } = useApi(fetchMe, []);
  const stats = useApi(fetchStats, []);
  const all = useApi(() => fetchIncidents({}), []);
  const nearby = useApi(() => fetchIncidents({ radius: 2500 }), []);
  const activity = useApi(fetchActivity, []);
  const [selected, setSelected] = useState<string | null>(null);
  const [greet, setGreet] = useState("Good afternoon");

  useEffect(() => setGreet(greeting()), []);

  const selectedIncident = useMemo(
    () => all.data?.find((i) => i.id === selected) ?? null,
    [all.data, selected]
  );

  const figures = [
    { label: "Nearby issues", value: stats.data?.nearby_issues, note: "active within 2.5 km", href: "/map" },
    { label: "My observations", value: stats.data?.my_reports, note: "filed by you", href: "/reports" },
    { label: "Resolved", value: stats.data?.resolved, note: "incidents you supported", href: "/impact" },
    { label: "Open alerts", value: stats.data?.active_alerts, note: "unread notifications", href: "/alerts" },
  ];

  return (
    <>
      <div className="lg:hidden">
        <MobileHome />
      </div>
      <div className="mx-auto hidden max-w-[1400px] px-4 py-6 lg:block lg:px-8 lg:py-8">
      {/* ------- Masthead: asymmetric, left-weighted, double-ruled ---------- */}
      <header className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">        <div className="max-w-2xl">
            <p className="font-data text-[10px] font-medium uppercase tracking-[0.3em] text-ink-faint">
              Sheet 01 · {me?.user.area ?? "Banjara Hills"} · Ward 95
            </p>
            <h1 className="mt-3.5 font-display text-[31px] font-semibold leading-[1.1] tracking-[-0.014em] text-ink lg:text-[38px]">
              {greet}, {me?.user.first_name ?? "Tanisha"}.
              <span className="mt-1.5 block text-[19px] font-normal italic leading-snug tracking-[-0.005em] text-ink-soft lg:text-[23px]">
                Here is the state of your streets.
              </span>
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2 pb-1">
            <Link href="/report">
              <Button variant="ink">
                <GlyphPlus className="h-4 w-4" /> File an observation
              </Button>
            </Link>
            <p className="font-data text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              One photo is enough to start
            </p>
          </div>
        </div>
        <div className="rule-double mt-6" aria-hidden="true" />
      </header>

      {/* ------- Ledger figures: a single ruled strip, not four cards ------- */}
      <section className="plate mb-8 grid grid-cols-2 lg:grid-cols-4" aria-label="Survey figures">
        {figures.map((f, i) => (
          <Link
            key={f.label}
            href={f.href}
            className={cn(
              "group px-6 py-6 transition-colors hover:bg-well",
              i !== 0 && "border-l border-rule",
              i === 2 && "max-lg:border-l-0 max-lg:border-t max-lg:border-rule",
              i === 3 && "max-lg:border-t max-lg:border-rule"
            )}
          >
            <p className="font-data text-[9.5px] font-medium uppercase tracking-[0.22em] text-ink-faint">
              {String(i + 1).padStart(2, "0")} · {f.label}
            </p>
            <p className="mt-3 font-display text-[34px] font-semibold leading-none tracking-[-0.012em] text-ink tabular transition-colors group-hover:text-accent">
              {f.value ?? "—"}
            </p>
            <p className="mt-2.5 text-[11px] leading-4 text-ink-faint">{f.note}</p>
          </Link>
        ))}
      </section>

      {/* ------- Map plate (dominant) + margin notes (asymmetric 2:1) ------- */}
      <section className="mb-8 grid gap-7 lg:grid-cols-[1fr_320px]">
        <Card tone="ink" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
            <div>
              <h2 className="font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">The civic map</h2>
              <p className="mt-0.5 text-xs leading-5 text-ink-faint">
                Each diamond is one incident. Size grows with the number of observations.
              </p>
            </div>
            <Link href="/map" className="shrink-0">
              <Button variant="secondary" size="sm">Open full sheet</Button>
            </Link>
          </div>
          <div className="relative h-[440px] lg:h-[500px]">
            {all.error ? (
              <ErrorState message={all.error} onRetry={all.retry} />
            ) : all.loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-well">
                <svg viewBox="0 0 120 60" className="w-44 text-rule-strong" aria-hidden="true">
                  <rect x="1" y="1" width="118" height="58" fill="none" stroke="currentColor" strokeDasharray="5 4" strokeWidth="1.2" className="field-march" />
                  <path d="M10 45 L45 20 L75 38 L110 14" fill="none" stroke="currentColor" strokeWidth="1.2" className="field-march" strokeDasharray="5 4" />
                </svg>
                <p className="font-data text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  Plotting incidents…
                </p>
              </div>
            ) : (
              <>
                <CivicMap
                  incidents={all.data ?? []}
                  selectedId={selected}
                  onSelect={setSelected}
                  className="h-full w-full"
                />
                <MapLegend className="absolute bottom-10 left-3" />
                {selectedIncident ? (
                  <div className="absolute right-3 top-3 max-h-[calc(100%-1.5rem)] overflow-y-auto scroll-thin">
                    <IncidentPreviewCard incident={selectedIncident} onClose={() => setSelected(null)} />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </Card>

        {/* Margin notes — activity as annotations, not a card list */}
        <aside className="flex flex-col">
          <h2 className="font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">Margin notes</h2>
          <p className="mt-0.5 text-xs leading-5 text-ink-faint">What changed around you, most recent first</p>
          <div className="mt-5 flex-1 border-l-2 border-rule pl-5">
            {activity.error ? (
              <ErrorState message={activity.error} onRetry={activity.retry} />
            ) : activity.loading ? (
              <div className="space-y-5 py-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i}>
                    <PenField className="w-full" />
                    <PenField className="mt-1.5 h-2.5 w-1/3 opacity-60" />
                  </div>
                ))}
              </div>
            ) : (activity.data ?? []).length === 0 ? (
              <EmptyState title="Nothing logged yet" hint="Activity appears as your reports and nearby incidents move." />
            ) : (
              <ul className="space-y-6">
                {(activity.data ?? []).slice(0, 6).map((a) => (
                  <li key={a.id} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[27px] top-1.5 h-2 w-2 rotate-45 border border-accent/70 bg-panel shadow-[0_0_0_2px_var(--paper),0_0_0_3px_var(--rule)]"
                    />
                    {a.incident_id ? (
                      <Link href={`/incidents/${a.incident_id}`} className="text-[13px] leading-[1.45] text-ink decoration-rule underline-offset-4 hover:text-accent hover:decoration-accent hover:underline">
                        {a.text}
                      </Link>
                    ) : (
                      <p className="text-[13px] leading-[1.45] text-ink">{a.text}</p>
                    )}
                    <p className="mt-2 flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      <ActivityGlyph kind={a.kind} className="h-3 w-3 text-rule-strong" />
                      {timeAgo(a.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </section>

      {/* ------- Nearby incidents ledger ------------------------------------ */}
      <section>
        <SectionHead
          title="Nearby incidents"
          sub={`Open cases closest to ${me?.user.area ?? "you"}, sorted by distance`}
          action={
            <Link href="/map" className="group mt-1 shrink-0 text-xs font-medium text-accent hover:text-ink">
              Full survey <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          }
        />
        <Card className="-mt-0.5 overflow-hidden">
          {nearby.error ? (
            <ErrorState message={nearby.error} onRetry={nearby.retry} />
          ) : nearby.loading ? (
            <PenPanel rows={4} />
          ) : (nearby.data ?? []).length === 0 ? (
            <EmptyState
              title="No open incidents within 2.5 km"
              hint="Your area is quiet right now. New reports appear here as neighbours file them."
            />
          ) : (
            <ul className="divide-y divide-rule">
              {(nearby.data ?? []).slice(0, 7).map((inc: Incident) => (
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
        </Card>
        <p className="mt-2.5 text-right font-data text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          Showing {Math.min(7, nearby.data?.length ?? 0)} of {nearby.data?.length ?? 0} · distances measured from your registered area
        </p>
      </section>
      </div>
    </>
  );
}
