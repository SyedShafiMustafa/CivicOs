"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  fetchMe,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  useApi,
} from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { ActivityGlyph, GlyphSearch, GlyphClose } from "@/lib/glyphs";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const { data: me } = useApi(fetchMe, []);
  const { data: notifications, setData: setNotifications } = useApi(fetchNotifications, []);
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function openNotification(id: string, incidentId: string | null, read: boolean) {
    if (!read) {
      await markNotificationRead(id);
      setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? prev);
    }
    setBellOpen(false);
    if (incidentId) router.push(`/incidents/${incidentId}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-rule-strong bg-panel px-4 lg:px-6">
      <button
        onClick={onMenu}
        className="border border-rule-strong px-2 py-1.5 text-ink-soft hover:bg-well lg:hidden"
        aria-label="Open navigation"
      >
        <span className="block h-px w-4 bg-current shadow-[0_4px_0_currentColor,0_-4px_0_currentColor]" />
      </button>

      <form
        className="relative w-full max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/map?q=${encodeURIComponent(q)}`);
        }}
      >
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          <GlyphSearch className="h-4 w-4" />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the survey: incidents, areas, registry IDs"
          className="h-9 w-full border border-rule-strong bg-paper pl-9 pr-14 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 border border-rule bg-well px-1.5 py-0.5 font-data text-[9.5px] uppercase tracking-wide text-ink-faint sm:block">
          Enter
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="mr-1 hidden items-center gap-1.5 border border-rule bg-paper px-2 py-1 font-data text-[9.5px] uppercase tracking-[0.12em] text-ink-faint lg:inline-flex">
          <span className="h-1.5 w-1.5 rotate-45 bg-ok" />
          Demo sheet · live data resets on restart
        </span>

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative border border-transparent p-2 text-ink-soft hover:border-rule hover:bg-well hover:text-ink"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="square">
              <path d="M6 14V9.5a4 4 0 018 0V14" />
              <path d="M4.5 14h11" />
              <path d="M8.5 16.5a1.6 1.6 0 003 0" />
              <path d="M10 3.4v2" />
            </svg>
            {unread > 0 ? (
              <span className="absolute right-1 top-1 h-2 w-2 rotate-45 bg-alert" />
            ) : null}
          </button>

          {bellOpen ? (
            <div className="plate-ink absolute right-0 top-11 w-[380px] max-w-[calc(100vw-2rem)] animate-fade-up overflow-hidden">
              <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
                <span className="font-display text-sm font-semibold text-ink">Notifications</span>
                {unread > 0 ? (
                  <button
                    className="text-xs font-medium text-accent hover:text-ink"
                    onClick={async () => {
                      await markAllNotificationsRead();
                      setNotifications((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
                    }}
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>
              <div className="max-h-96 overflow-y-auto scroll-thin">
                {(notifications ?? []).length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-ink-faint">No notifications yet</p>
                ) : (
                  (notifications ?? []).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n.id, n.incident_id, n.read)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-rule px-4 py-3 text-left last:border-0 hover:bg-well",
                        !n.read && "bg-accent-wash/50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border",
                          n.read ? "border-rule bg-paper text-ink-faint" : "border-accent/40 bg-accent-wash text-accent"
                        )}
                      >
                        <ActivityGlyph kind={n.type} className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium text-ink">{n.title}</span>
                          {!n.read ? <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" /> : null}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-ink-soft">{n.body}</span>
                        <span className="mt-1 block font-data text-[10px] text-ink-faint">{timeAgo(n.timestamp)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <span className="mx-1 hidden h-6 w-px bg-rule sm:block" />

        <Link href="/settings" className="flex items-center gap-2.5 px-1.5 py-1 hover:bg-well">
          <Avatar
            src={me?.user.avatar_uri}
            name={me?.user.name}
            initials={me?.user.initials ?? "·"}
            className="flex h-8 w-8 items-center justify-center border border-accent/50 bg-accent-wash object-cover font-data text-xs font-semibold text-accent"
          />
          <span className="hidden leading-tight sm:block">
            <span className="block text-[13px] font-medium text-ink">{me?.user.name ?? "—"}</span>
            <span className="block font-data text-[10px] text-ink-faint">{me?.user.area ?? ""}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
