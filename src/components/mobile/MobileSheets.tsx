"use client";

/**
 * Mobile impact sheet — the My Impact numbers stacked into a single column.
 * Uses the same /impact endpoint and copy as the desktop sheet.
 */
import Link from "next/link";
import { fetchImpact, useApi } from "@/lib/api";
import { ErrorState, PenField, Stamp } from "@/components/ui/primitives";

export default function MobileImpact({
  onNavigate,
}: {
  onNavigate?: (screen: string, id?: string) => void;
} = {}) {
  const { data, error, loading, retry } = useApi(fetchImpact, []);

  return (
    <div className="px-3 pb-8 pt-4">
      <p className="font-data text-[9.5px] font-medium uppercase tracking-[0.26em] text-ink-faint">
        Sheet 06 · contribution record
      </p>
      <h1 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.012em] text-ink">My impact</h1>

      {error ? (
        <ErrorState message={error} onRetry={retry} className="mt-4" />
      ) : loading ? (
        <div className="mt-4 space-y-2.5">
          <div className="plate p-4">
            <PenField className="h-6 w-24" />
            <PenField className="mt-2 h-2.5 w-3/4" />
          </div>
          <div className="plate p-4">
            <PenField className="h-2.5 w-full" />
            <PenField className="mt-1.5 h-2.5 w-5/6" />
          </div>
        </div>
      ) : data ? (
        <>
          <section className="plate-ink mt-4 p-4">
            <p className="font-display text-[20px] font-semibold leading-snug text-ink">{data.headline}</p>
            <p className="mt-1.5 text-[12.5px] leading-5 text-ink-soft">{data.subline}</p>
          </section>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {[
              { n: data.observations, label: "Observations" },
              { n: data.verified_contributions, label: "Confirmed" },
              { n: data.incidents_resolved, label: "Resolved" },
              { n: data.areas_count, label: "Areas" },
            ].map((s) => (
              <div key={s.label} className="plate p-3.5">
                <p className="font-display text-[28px] font-semibold leading-none text-ink tabular">{s.n}</p>
                <p className="mt-1.5 font-data text-[9px] uppercase tracking-[0.16em] text-ink-faint">{s.label}</p>
              </div>
            ))}
          </div>

          {data.areas.length ? (
            <section className="plate mt-3 p-4">
              <p className="font-data text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">Areas you covered</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.areas.map((a) => (
                  <Stamp key={a.area} tone="neutral">
                    {a.area} · {a.count}
                  </Stamp>
                ))}
              </div>
            </section>
          ) : null}

          {data.contributions.length ? (
            <section className="mt-4">
              <h2 className="font-display text-[16px] font-semibold text-ink">Incidents you helped confirm</h2>
              <div className="mt-2.5 space-y-2.5">
                {data.contributions.map((c) => (
                  <Link
                    key={c.id}
                    href={`/incidents/${c.id}`}
                    onClick={(e) => {
                      if (onNavigate) {
                        e.preventDefault();
                        onNavigate("incident", c.id);
                      }
                    }}
                    className="press-mobile plate block p-3.5"
                  >
                    <p className="font-display text-[14px] font-semibold text-ink">{c.title}</p>
                    <p className="mt-0.5 font-data text-[10px] text-ink-faint">
                      {c.id} · {c.location_label}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
