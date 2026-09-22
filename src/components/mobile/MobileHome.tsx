"use client";

/**
 * Mobile overview sheet — editorial index-card metrics, the civic map card,
 * and the survey feed. Mobile-only presentation of the live API data; the
 * route page gates it below lg so desktop keeps its own layout.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchActivity, fetchIncidents, fetchMe, fetchStats, useApi } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { markerColor } from "@/lib/colors";
import { ActivityGlyph, GlyphMap } from "@/lib/glyphs";
import CivicMap from "@/components/map/CivicMap";
import { IncidentPreviewCard } from "@/components/incident/shared";
import { Dot, ErrorState, PenField, Stamp, cn } from "@/components/ui/primitives";
import type { ActivityItem, Incident } from "@/lib/types";

function StatCard({
  n,
  label,
  note,
  href,
  dotColor,
  onNavigate,
}: {
  n: string;
  label: string;
  note: string;
  href: string;
  dotColor?: string;
  onNavigate?: (screen: string, id?: string) => void;
}) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate(href.replace("/", "") || "home");
        }
      }}
      className="press-mobile plate block p-3.5"
    >
      <div className="flex items-center justify-between">
        <span className="font-data text-[9px] font-medium uppercase tracking-[0.18em] text-ink-faint">{label}</span>
        {dotColor ? <Dot color={dotColor} className="h-1.5 w-1.5" /> : null}
      </div>
      <p className="mt-1.5 font-display text-[30px] font-semibold leading-none tracking-[-0.01em] text-ink tabular">{n}</p>
      <p className="mt-1.5 text-[10.5px] leading-4 text-ink-faint">{note}</p>
    </Link>
  );
}

function FeedCard({ a, incidents }: { a: ActivityItem; incidents: Incident[] }) {
  const inc = a.incident_id ? incidents.find((i) => i.id === a.incident_id) : undefined;
  const [verified, setVerified] = useState(false);
  const [count, setCount] = useState(inc ? Math.max(2, inc.contributor_count - 1) : 1);
  useEffect(() => {
    if (inc && count === 1) setCount(Math.max(2, inc.contributor_count - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inc]);

  return (
    <article className="plate p-3.5">
      <div className="flex items-center gap-2 font-data text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">
        <span className="flex h-5 w-5 items-center justify-center border border-rule-strong bg-well text-ink-soft">
          <ActivityGlyph kind={a.kind} className="h-3 w-3" />
        </span>
        <span>Tanisha Rao · Agent #409</span>
        <span aria-hidden="true">·</span>
        <span>{timeAgo(a.timestamp)}</span>
      </div>
      {inc ? (
        <Link href={`/incidents/${inc.id}`} className="mt-2 flex gap-3">
          {inc.thumbnail_uri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={inc.thumbnail_uri} alt="" className="h-14 w-[74px] shrink-0 border border-ink object-cover" />
          ) : null}
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <Dot color={markerColor(inc)} className="h-1.5 w-1.5 shrink-0" />
              <span className="truncate font-display text-[13.5px] font-semibold text-ink">{inc.title}</span>
            </span>
            <span className="mt-0.5 block font-data text-[10px] leading-4 text-ink-faint">
              {inc.location_label} · {inc.latitude.toFixed(4)}° N, {inc.longitude.toFixed(4)}° E
            </span>
          </span>
        </Link>
      ) : (
        <p className="mt-2 text-[13px] leading-[1.5] text-ink">{a.text}</p>
      )}
      <div className="mt-2.5 flex items-center justify-between border-t border-rule pt-2.5">
        {inc ? (
          <>
            <Stamp tone={inc.priority === "low" ? "hold" : inc.priority === "medium" ? "warn" : "alert"}>
              {inc.priority} priority
            </Stamp>
            <button
              onClick={() => {
                setVerified((v) => !v);
                setCount((c) => (verified ? Math.max(0, c - 1) : c + 1));
              }}
              className={cn(
                "press-mobile flex items-center gap-1.5 border px-2 py-1 font-data text-[10px] font-semibold uppercase tracking-[0.1em]",
                verified ? "border-accent bg-accent text-panel" : "border-rule-strong bg-panel text-ink-soft"
              )}
              aria-pressed={verified}
            >
              ▲ Verify · <span className="tabular">{count}</span>
            </button>
          </>
        ) : (
          <span className="font-data text-[10px] uppercase tracking-[0.1em] text-ink-faint">Survey log</span>
        )}
      </div>
    </article>
  );
}

export default function MobileHome({
  onNavigate,
}: {
  onNavigate?: (screen: string, id?: string) => void;
} = {}) {
  const stats = useApi(fetchStats, []);
  const all = useApi(() => fetchIncidents({}), []);
  const activity = useApi(fetchActivity, []);
  const { data: me } = useApi(fetchMe, []);
  const [selected, setSelected] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [greet, setGreet] = useState("Good day");

  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const selectedIncident = all.data?.find((i) => i.id === selected) ?? null;

  return (
    <div>
      {/* Masthead */}
      <header className="px-3 pt-4">
        <p className="font-data text-[9.5px] font-medium uppercase tracking-[0.26em] text-ink-faint">
          {greet}, {me?.user.first_name ?? "Tanisha"} · {me?.user.area ?? "Banjara Hills"}
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-[1.12] tracking-[-0.012em] text-ink">
          The state of your streets.
        </h1>
        <p className="mt-1 text-[12px] leading-5 text-ink-soft">
          One photo is enough to start. Your observations join your neighbours&rsquo; to build a verified record.
        </p>
      </header>

      {/* Index-card metrics */}
      <section aria-label="Survey figures" className="mt-4 grid grid-cols-2 gap-2.5 px-3">
        <StatCard n={String(stats.data?.nearby_issues ?? "—")} label="Nearby" note="issues within 2.5 km" href="/map" dotColor="#a03430" onNavigate={onNavigate} />
        <StatCard n={String(stats.data?.my_reports ?? "—")} label="Filed" note="observations by you" href="/reports" dotColor="#175e54" onNavigate={onNavigate} />
        <StatCard n={String(stats.data?.resolved ?? "—")} label="Resolved" note="incidents closed" href="/impact" dotColor="#3d7a4a" onNavigate={onNavigate} />
        <StatCard n={String(stats.data?.active_alerts ?? "—")} label="Alerts" note="unread notices" href="/alerts" dotColor="#a4691c" onNavigate={onNavigate} />
      </section>

      {/* Civic map card */}
      <section className="mt-4 px-3" aria-label="Civic map">
        <div className="plate-ink overflow-hidden">
          <div className="relative h-[300px]">
            {all.error ? (
              <ErrorState message={all.error} onRetry={all.retry} />
            ) : all.loading ? (
              <div className="flex h-full items-center justify-center bg-well">
                <div className="w-full space-y-2 px-8">
                  <PenField className="h-2.5" />
                  <PenField className="h-2.5 w-3/4" />
                  <PenField className="h-2.5 w-1/2" />
                </div>
              </div>
            ) : (
              <>
                <CivicMap
                  incidents={all.data ?? []}
                  selectedId={selected}
                  onSelect={setSelected}
                  showUser
                  fitAll
                  chrome={["dock"]}
                  className="absolute inset-0 h-full w-full"
                />
                <button
                  onClick={() => setLegendOpen((v) => !v)}
                  aria-expanded={legendOpen}
                  className="press-mobile absolute bottom-2.5 left-2.5 z-10 border border-rule-strong bg-panel/95 px-2.5 py-1.5 font-data text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft shadow-[2px_2px_0_0_var(--rule-strong)]"
                >
                  {legendOpen ? "Hide legend" : "Legend"}
                </button>
                {legendOpen ? (
                  <div className="absolute bottom-11 left-2.5 z-10 border border-rule-strong bg-panel/95 px-3 py-2 shadow-[2px_2px_0_0_var(--rule-strong)]">
                    {[
                      ["#a03430", "High / critical"],
                      ["#a4691c", "Medium"],
                      ["#8d7430", "Low"],
                      ["#3d7a4a", "Resolved"],
                    ].map(([c, l]) => (
                      <div key={l} className="flex items-center gap-2 py-0.5 font-data text-[9.5px] uppercase tracking-[0.1em] text-ink-soft">
                        <span className="h-1.5 w-1.5 rotate-45 shadow-[0_0_0_1.5px_var(--panel)]" style={{ backgroundColor: c }} />
                        {l}
                      </div>
                    ))}
                  </div>
                ) : null}
                {selectedIncident ? (
                  <div className="absolute inset-x-2 bottom-2 z-20 animate-fade-up">
                    <IncidentPreviewCard incident={selectedIncident} onClose={() => setSelected(null)} />
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-rule px-3.5 py-2.5">
            <span className="font-data text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">
              {all.data?.length ?? 0} incidents plotted
            </span>
            <Link
              href="/map"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate("map");
                }
              }}
              className="press-mobile flex items-center gap-1 font-data text-[10px] font-semibold uppercase tracking-[0.12em] text-accent"
            >
              <GlyphMap className="h-3.5 w-3.5" /> Full sheet
            </Link>
          </div>
        </div>
      </section>

      {/* Survey feed */}
      <section className="mt-5 px-3 pb-2" aria-label="Survey feed">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">Margin notes</h2>
          <span className="font-data text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">Most recent first</span>
        </div>
        {activity.error ? (
          <ErrorState message={activity.error} onRetry={activity.retry} />
        ) : activity.loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="plate p-3.5">
                <PenField className="h-3 w-1/3" />
                <PenField className="mt-2 h-2.5 w-full" />
                <PenField className="mt-1.5 h-2.5 w-2/3" />
              </div>
            ))}
          </div>
        ) : (activity.data ?? []).length === 0 ? (
          <div className="plate p-5 text-center text-[12.5px] text-ink-faint">Nothing logged yet.</div>
        ) : (
          <div className="space-y-3">
            {(activity.data ?? []).slice(0, 6).map((a) => (
              <FeedCard key={a.id} a={a} incidents={all.data ?? []} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
