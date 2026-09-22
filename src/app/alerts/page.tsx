"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  useApi,
} from "@/lib/api";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { ActivityGlyph } from "@/lib/glyphs";
import { EmptyState, ErrorState, PenPanel, Button, cn } from "@/components/ui/primitives";
import { MobileAlerts } from "@/components/mobile/MobileLists";

export default function AlertsPage() {
  const router = useRouter();
  const { data, error, loading, retry, setData } = useApi(fetchNotifications, []);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read).length;
  const shown = tab === "unread" ? notifications.filter((n) => !n.read) : notifications;

  async function open(id: string, incidentId: string | null, read: boolean) {
    if (!read) {
      await markNotificationRead(id);
      setData((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? prev);
    }
    if (incidentId) router.push(`/incidents/${incidentId}`);
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileAlerts />
      </div>
      <div className="mx-auto hidden max-w-[860px] space-y-6 p-4 lg:block lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            Sheet 05 · notification register
          </p>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-ink lg:text-[30px]">
            Alerts
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Updates about your reports and incidents near you.
          </p>
        </div>
        {unread > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await markAllNotificationsRead();
              setData((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
            }}
          >
            Mark all read ({unread})
          </Button>
        ) : null}
        <div className="rule-double pointer-events-none absolute" aria-hidden="true" />
      </header>
      <div className="rule-double" aria-hidden="true" />

      <div className="plate overflow-hidden">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3">
          <div className="grid grid-cols-2 border border-rule-strong">
            {(["all", "unread"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "border-r border-rule-strong px-4 py-1.5 text-xs font-medium capitalize transition-colors last:border-r-0",
                  tab === t ? "bg-ink text-panel" : "bg-panel text-ink-soft hover:bg-well"
                )}
              >
                {t}
                {t === "unread" && unread > 0 ? ` · ${unread}` : ""}
              </button>
            ))}
          </div>
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {shown.length} entries
          </span>
        </div>

        <div className="border-t-0">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : loading ? (
            <PenPanel rows={4} />
          ) : shown.length === 0 ? (
            <EmptyState
              title={tab === "unread" ? "You are all caught up" : "No notifications yet"}
              hint="Alerts appear when your reports move forward or incidents near you change."
            />
          ) : (
            <ul className="divide-y divide-rule">
              {shown.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => open(n.id, n.incident_id, n.read)}
                    className={cn(
                      "flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-well",
                      !n.read && "bg-accent-wash/40"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border",
                        n.read
                          ? "border-rule bg-paper text-ink-faint"
                          : "border-accent/50 bg-accent-wash text-accent"
                      )}
                    >
                      <ActivityGlyph kind={n.type} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[13.5px] font-medium text-ink">{n.title}</span>
                        {!n.read ? <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" /> : null}
                        <span className="ml-auto shrink-0 font-data text-[10px] uppercase tracking-wide text-ink-faint">
                          {timeAgo(n.timestamp)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-ink-soft">{n.body}</span>
                      {n.incident_id ? (
                        <span className="mt-1.5 inline-block font-data text-[10.5px] text-ink-faint">
                          {n.incident_id} · {fmtDateTime(n.timestamp)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
