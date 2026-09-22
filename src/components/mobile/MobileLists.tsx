"use client";

/**
 * Mobile registry + alerts sheets. Mobile-only presentations of /reports and
 * /alerts data; the route pages gate them below lg and keep the desktop view.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMine, fetchNotifications, markAllNotificationsRead, markNotificationRead, useApi } from "@/lib/api";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { markerColor } from "@/lib/colors";
import { ActivityGlyph } from "@/lib/glyphs";
import { Button, Dot, ErrorState, PenField, Stamp, cn } from "@/components/ui/primitives";

/* ------------------------------------------------ my reports registry */

export function MobileReports({ onNavigate }: { onNavigate?: (screen: string, id?: string) => void }) {
  const { data, error, loading, retry } = useApi(fetchMine, []);
  const rows = data ?? [];

  return (
    <div className="px-3 pb-8 pt-4">
      <p className="font-data text-[9.5px] font-medium uppercase tracking-[0.26em] text-ink-faint">Registry</p>
      <h1 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.012em] text-ink">Your filings</h1>

      {error ? (
        <ErrorState message={error} onRetry={retry} className="mt-4" />
      ) : loading ? (
        <div className="mt-4 space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="plate p-3.5">
              <PenField className="h-3 w-1/2" />
              <PenField className="mt-2 h-2.5 w-3/4" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="plate mt-4 p-5 text-center">
          <p className="text-[13px] text-ink-faint">No filings yet. Your first observation starts the record.</p>
          <Link href="/report" className="press-mobile mt-3 inline-block border border-ink bg-ink px-4 py-2 font-data text-[10.5px] font-semibold uppercase tracking-[0.12em] text-panel">
            File a report
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <Link
              key={r.observation.id}
              href={`/incidents/${r.incident.id}`}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate("incident", r.incident.id);
                }
              }}
              className="press-mobile plate block p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-[14.5px] font-semibold text-ink">{r.incident.title}</p>
                  <p className="mt-0.5 font-data text-[10px] text-ink-faint">
                    {fmtDateTime(r.observation.timestamp)} · {r.incident.location_label}
                  </p>
                </div>
                <Dot color={markerColor(r.incident)} className="mt-1.5 shrink-0" />
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-rule pt-2.5">
                <Stamp
                  tone={
                    r.incident.status.includes("verif") || r.incident.status === "resolved"
                      ? "ok"
                      : r.incident.status === "assigned"
                        ? "warn"
                        : "neutral"
                  }
                >
                  {r.incident.status_label}
                </Stamp>
                <span className="font-data text-[10px] text-ink-faint">{r.incident.id}</span>
                <span className="ml-auto font-data text-[9.5px] uppercase tracking-[0.1em] text-accent">Open</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ alerts */

export function MobileAlerts({ onNavigate }: { onNavigate?: (screen: string, id?: string) => void }) {
  const { data, error, loading, retry, setData } = useApi(fetchNotifications, []);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read).length;
  const shown = tab === "unread" ? notifications.filter((n) => !n.read) : notifications;

  async function open(n: (typeof notifications)[number]) {
    if (!n.read) {
      await markNotificationRead(n.id);
      setData((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev);
    }
    if (n.incident_id) {
      if (onNavigate) onNavigate("incident", n.incident_id);
      else location.href = `/incidents/${n.incident_id}`;
    }
  }

  return (
    <div className="px-3 pb-8 pt-4">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-data text-[9.5px] font-medium uppercase tracking-[0.26em] text-ink-faint">Notice board</p>
          <h1 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.012em] text-ink">Alerts</h1>
        </div>
        {unread > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="btn-press"
            onClick={async () => {
              await markAllNotificationsRead();
              setData((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
            }}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 border border-rule-strong">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-r border-rule-strong py-1.5 text-[11.5px] font-medium capitalize transition-colors last:border-r-0",
              tab === t ? "bg-ink text-panel" : "bg-panel text-ink-soft"
            )}
          >
            {t}
            {t === "unread" && unread > 0 ? ` · ${unread}` : ""}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={retry} className="mt-4" />
      ) : loading ? (
        <div className="mt-4 space-y-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="plate p-3.5">
              <PenField className="h-3 w-1/2" />
              <PenField className="mt-2 h-2.5 w-2/3" />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-4 text-center text-[13px] text-ink-faint">
          {tab === "unread" ? "You are all caught up." : "No notices. The survey is quiet."}
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {shown.map((n) => (
            <button key={n.id} onClick={() => open(n)} className="press-mobile plate block w-full p-3.5 text-left">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center border",
                    n.read ? "border-rule bg-paper text-ink-faint" : "border-accent/50 bg-accent-wash text-accent"
                  )}
                >
                  <ActivityGlyph kind={n.type} className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-[13px] font-medium text-ink">{n.title}</span>
                <span className="ml-auto shrink-0 font-data text-[9.5px] uppercase tracking-[0.1em] text-ink-faint">
                  {timeAgo(n.timestamp)}
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-5 text-ink-soft">{n.body}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
