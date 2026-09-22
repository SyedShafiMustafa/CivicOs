"use client";

import { useRouter } from "next/navigation";
import { fetchMine, useApi } from "@/lib/api";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PRIORITY_INK, markerColor } from "@/lib/colors";
import { EvidencePlate, PenPanel, EmptyState, ErrorState, Stamp, Dot, cn } from "@/components/ui/primitives";
import { MobileReports } from "@/components/mobile/MobileLists";
import { GlyphNext, IssueGlyph } from "@/lib/glyphs";

export default function MyReportsPage() {
  const router = useRouter();
  const { data, error, loading, retry } = useApi(fetchMine, []);
  const rows = data ?? [];

  return (
    <>
      <div className="lg:hidden">
        <MobileReports />
      </div>
      <div className="mx-auto hidden max-w-[1100px] space-y-6 p-4 lg:block lg:p-8">
      <header>
        <p className="font-data text-[10px] uppercase tracking-[0.22em] text-ink-faint">
          Sheet 04 · personal register
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-ink lg:text-[30px]">
          My reports
        </h1>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">
          Every observation you have filed, the incident file it joined, and its latest entry.
        </p>
        <div className="rule-double mt-4" aria-hidden="true" />
      </header>

      {error ? (
        <div className="plate"><ErrorState message={error} onRetry={retry} /></div>
      ) : loading ? (
        <div className="plate"><PenPanel rows={6} /></div>
      ) : rows.length === 0 ? (
        <div className="plate">
          <EmptyState
            icon={<IssueGlyph type="other" className="h-5 w-5" />}
            title="You have not filed anything yet"
            hint="Your first observation takes one photo. Start from the File a report page."
          />
        </div>
      ) : (
        <>
          {/* Desktop register */}
          <div className="plate hidden overflow-hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-rule-strong bg-well/60 font-data text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
                  <th className="px-5 py-2.5 font-medium">Entry</th>
                  <th className="px-4 py-2.5 font-medium">Plot</th>
                  <th className="px-4 py-2.5 font-medium">Filed</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">File</th>
                  <th className="px-4 py-2.5 font-medium">Latest entry</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((r, i) => (
                  <tr
                    key={r.observation.id}
                    onClick={() => router.push(`/incidents/${r.incident.id}`)}
                    className="cursor-pointer transition-colors hover:bg-well"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="font-data text-[10px] text-ink-faint tabular">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <EvidencePlate src={r.incident.thumbnail_uri} alt="" className="h-10 w-14" />
                        <div>
                          <p className="text-[13px] font-medium text-ink">{r.incident.title}</p>
                          <p className="max-w-[260px] truncate text-xs text-ink-faint">
                            {r.observation.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-ink-soft">{r.incident.location_label}</td>
                    <td className="px-4 py-3.5 font-data text-[11.5px] text-ink-soft">{fmtDate(r.observation.timestamp)}</td>
                    <td className="px-4 py-3.5">
                      <Stamp tone={
                        r.incident.status.includes("verif") || r.incident.status === "resolved" ? "ok"
                        : r.incident.status === "assigned" ? "warn"
                        : r.incident.status === "reported" ? "neutral" : "accent"
                      }>
                        {r.incident.status_label}
                      </Stamp>
                    </td>
                    <td className="px-4 py-3.5 font-data text-[11px] text-ink-faint">{r.incident.id}</td>
                    <td className="px-4 py-3.5 text-xs text-ink-soft">{r.latest_update}</td>
                    <td className="pr-4 text-rule-strong">
                      <GlyphNext className="h-3.5 w-3.5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile register */}
          <ul className="space-y-2.5 md:hidden">
            {rows.map((r) => (
              <li
                key={r.observation.id}
                onClick={() => router.push(`/incidents/${r.incident.id}`)}
                className="plate cursor-pointer p-4"
              >
                <div className="flex items-center gap-2.5">
                  <Dot color={markerColor(r.incident)} />
                  <span className="text-sm font-medium text-ink">{r.incident.title}</span>
                  <Stamp
                    tone={r.incident.priority === "low" ? "hold" : r.incident.priority === "medium" ? "warn" : "alert"}
                    className="ml-auto"
                  >
                    <span aria-hidden="true" className="text-[0.7em]">{PRIORITY_INK[r.incident.priority].tick}</span>
                    {r.incident.priority}
                  </Stamp>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {r.incident.location_label} · {fmtDateTime(r.observation.timestamp)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Stamp tone={
                    r.incident.status.includes("verif") || r.incident.status === "resolved" ? "ok"
                    : r.incident.status === "assigned" ? "warn" : "neutral"
                  }>
                    {r.incident.status_label}
                  </Stamp>
                  <span className="font-data text-[10.5px] text-ink-faint">{r.incident.id}</span>
                </div>
                <p className="mt-1.5 text-xs text-ink-soft">{r.latest_update}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      </div>
    </>
  );
}
