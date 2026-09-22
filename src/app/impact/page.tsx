"use client";

import Link from "next/link";
import { fetchImpact, useApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Card, PenPanel, EmptyState, ErrorState, Stamp, cn } from "@/components/ui/primitives";
import { GlyphNext, MarkSeal } from "@/lib/glyphs";
import MobileImpact from "@/components/mobile/MobileSheets";

export default function ImpactPage() {
  const { data, error, loading, retry } = useApi(fetchImpact, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <div className="plate-ink"><ErrorState message={error} onRetry={retry} /></div>
      </div>
    );
  }

  const maxArea = Math.max(1, ...(data?.areas.map((a) => a.count) ?? [1]));

  return (
    <>
      <div className="lg:hidden">
        <MobileImpact />
      </div>
      <div className="mx-auto hidden max-w-[1000px] space-y-6 p-4 lg:block lg:p-8">
      <header>
        <p className="font-data text-[10px] uppercase tracking-[0.22em] text-ink-faint">
          Sheet 06 · contribution record
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-ink lg:text-[30px]">
          My impact
        </h1>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">
          What your observations changed. No points, no streaks, no badges. Just the civic record.
        </p>
        <div className="rule-double mt-4" aria-hidden="true" />
      </header>

      {loading || !data ? (
        <>
          <div className="plate"><PenPanel rows={2} /></div>
          <div className="plate"><PenPanel rows={5} /></div>
        </>
      ) : (
        <>
          {/* Ledger strip: figures ruled like a survey summary table */}
          <section className="plate grid grid-cols-2 lg:grid-cols-4" aria-label="Contribution figures">
            {[
              { value: data.observations, label: "Observations filed" },
              { value: data.verified_contributions, label: "Joined verified incidents" },
              { value: data.incidents_resolved, label: "Incidents resolved" },
              { value: data.areas_count, label: "Areas contributed to" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "px-5 py-4",
                  i !== 0 && "border-l border-rule",
                  i === 2 && "max-lg:border-l-0 max-lg:border-t max-lg:border-rule",
                  i === 3 && "max-lg:border-t max-lg:border-rule"
                )}
              >
                <p className="font-display text-[30px] font-semibold leading-none text-ink tabular">{s.value}</p>
                <p className="mt-1.5 font-data text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">{s.label}</p>
              </div>
            ))}
          </section>

          <div className="plate px-5 py-4">
            <p className="font-display text-[15px] font-medium text-ink">{data.headline}</p>
            <p className="mt-0.5 text-xs leading-5 text-ink-soft">{data.subline}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Areas: hand-tally marks */}
            <Card tone="panel">
              <div className="px-5 pb-3 pt-4">
                <h2 className="font-display text-[15px] font-semibold text-ink">Areas</h2>
                <p className="text-xs text-ink-faint">Where your reports landed</p>
                <div className="rule-double mt-3" aria-hidden="true" />
              </div>
              <div className="space-y-4 border-t-0 px-5 pb-5">
                {data.areas.length === 0 ? (
                  <EmptyState title="No areas yet" />
                ) : (
                  data.areas.map((a) => (
                    <div key={a.area}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-medium text-ink">{a.area}</span>
                        <span className="font-data text-[11px] text-ink-faint tabular">{a.count}</span>
                      </div>
                      {/* tally rule: each unit is a short ink tick */}
                      <div className="mt-1.5 flex flex-wrap gap-[3px]" aria-hidden="true">
                        {Array.from({ length: a.count }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-3 w-[3px]",
                              i % 5 === 4 ? "bg-accent" : "bg-ink/70"
                            )}
                          />
                        ))}
                      </div>
                      <div className="mt-1 h-px w-full bg-rule" style={{ width: `${(a.count / maxArea) * 100}%` }} />
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Contributions register */}
            <Card>
              <div className="px-5 pb-3 pt-4">
                <h2 className="font-display text-[15px] font-semibold text-ink">Incidents you supported</h2>
                <p className="text-xs text-ink-faint">Every file your observations joined</p>
                <div className="rule-double mt-3" aria-hidden="true" />
              </div>
              <ul className="divide-y divide-rule border-t-0">
                {data.contributions.length === 0 ? (
                  <EmptyState
                    title="No contributions yet"
                    hint="File your first report to start building the civic record."
                    action={
                      <Link href="/report" className="mt-2">
                        <Stamp tone="accent">File a report</Stamp>
                      </Link>
                    }
                  />
                ) : (
                  data.contributions.map((inc) => (
                    <li key={inc.id}>
                      <Link
                        href={`/incidents/${inc.id}`}
                        className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-well"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[13.5px] font-medium text-ink group-hover:text-accent">{inc.title}</span>
                            <span className="font-data text-[10.5px] text-ink-faint">{inc.id}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            {inc.location_label} · on file since {fmtDate(inc.first_seen)} ·{" "}
                            {inc.observation_count} observations
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {inc.status.includes("verif") || inc.status === "resolved" ? (
                            <Stamp tone="ok"><MarkSeal className="h-3 w-3" /> closed</Stamp>
                          ) : (
                            <Stamp tone={inc.priority === "low" ? "hold" : inc.priority === "medium" ? "warn" : "alert"}>
                              {inc.priority}
                            </Stamp>
                          )}
                          <span className="text-rule-strong group-hover:text-accent">
                            <GlyphNext className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          </div>
        </>
      )}
      </div>
    </>
  );
}
