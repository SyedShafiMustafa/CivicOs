"use client";

/**
 * Mobile prototype shell — glass top bar, FAB, bottom dock.
 *
 * Two modes:
 *  - default: active only below 430px on real viewports; chrome is fixed and
 *    page content scrolls with the body.
 *  - force: renders inside the /mobile device frame. In this mode the
 *    prototype is FULLY SELF-CONTAINED: screens (home, map, report, filed,
 *    alerts, settings, incident detail) switch via internal state instead of
 *    URL routes, so tapping any dock tab, card or link stays inside the
 *    frame on a desktop viewport. The dock also renders a translucent
 *    scroll-progress hairline above it (iOS-style).
 *
 * Liquid glass is reserved for the surfaces the thumb touches; paper cards
 * stay hard-edged ink plates. Dark mode re-inks the paper via the shared
 * global theme ([data-theme="dark"] on <html>, see lib/useTheme.ts).
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fetchIncident, fetchMe, fetchNotifications, useApi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import {
  GlyphLogomark,
  GlyphMap,
  GlyphCamera,
  GlyphLedger,
  GlyphBell,
  GlyphSettings,
  GlyphSearch,
  GlyphClose,
  GlyphOverview,
} from "@/lib/glyphs";
import MobileHome from "@/components/mobile/MobileHome";
import MobileMapView from "@/components/mobile/MobileMapView";
import MobileReport from "@/components/mobile/MobileReport";
import { MobileReports, MobileAlerts } from "@/components/mobile/MobileLists";
import MobileImpact from "@/components/mobile/MobileSheets";
import MobileSettings from "@/components/mobile/MobileSettings";
import IncidentDetail from "@/components/mobile/IncidentDetail";

type Screen = "home" | "map" | "report" | "reports" | "impact" | "alerts" | "settings" | "incident";

type DockItem = {
  href: string;
  screen: Screen;
  label: string;
  glyph: (p: { className?: string }) => React.ReactElement;
  primary?: boolean;
  badge?: boolean;
};

const DOCK: DockItem[] = [
  { href: "/", screen: "home", label: "Sheet", glyph: GlyphOverview },
  { href: "/map", screen: "map", label: "Map", glyph: GlyphMap },
  { href: "/report", screen: "report", label: "Report", glyph: GlyphCamera, primary: true },
  { href: "/reports", screen: "reports", label: "Filed", glyph: GlyphLedger },
  { href: "/alerts", screen: "alerts", label: "Alerts", glyph: GlyphBell, badge: true },
  { href: "/settings", screen: "settings", label: "More", glyph: GlyphSettings },
];

const FILTER_CHIPS: { key: string; label: string }[] = [
  { key: "roads", label: "Roads" },
  { key: "water", label: "Water" },
  { key: "drainage", label: "Drainage" },
  { key: "urgent", label: "Urgent" },
];

export default function MobileShell({
  children,
  force = false,
}: {
  children?: React.ReactNode;
  force?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useApi(fetchMe, []);
  const { data: notifications } = useApi(fetchNotifications, []);
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ----- framed mode: internal screen state instead of URL routes -----
  const [screen, setScreen] = useState<Screen>("home");
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const go = useCallback((s: Screen, id?: string) => {
    setScreen(s);
    if (s === "incident") setIncidentId(id ?? null);
    setSearchOpen(false);
    setFabOpen(false);
    // scroll the inner body back to the top on screen change
    requestAnimationFrame(() => {
      const el = scrollBodyRef.current;
      if (el) el.scrollTop = 0;
    });
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (force) return; // inside the device frame the shell always renders
    const mq = window.matchMedia("(max-width: 1023.98px)"); // matches the lg: gating of the mobile sheets
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [force]);

  const { theme } = useTheme();
  // The shared hook owns persistence + the <html> attribute; nothing to sync
  // here beyond keeping any stale frame attribute cleared.
  useEffect(() => {
    document.documentElement.removeAttribute("data-mobile-theme");
  }, []);

  // Inside the /mobile device frame, suppress the ambient shell chrome
  // (AppShell would otherwise render the desktop sidebar behind the frame).
  useEffect(() => {
    if (!force) return;
    document.documentElement.setAttribute("data-framed-mobile", "");
    return () => document.documentElement.removeAttribute("data-framed-mobile");
  }, [force]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    setFabOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setMapQuery(q.trim());
    if (chip && chip !== "urgent") setMapTypes(chip);
    if (chip === "urgent") setMapPriority("critical,high");
    go("map");
  }

  // Map query state lives in the shell so the search bar and chips feed it.
  const [mapQuery, setMapQuery] = useState("");
  const [mapTypes, setMapTypes] = useState("");
  const [mapPriority, setMapPriority] = useState("");

  // Intercept internal Link clicks inside the frame: keep navigation
  // self-contained instead of routing to desktop pages.
  useEffect(() => {
    if (!force) return;
    const root = document.querySelector("[data-mobile-frame-root]");
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const target = a.getAttribute("target");
      if (!href.startsWith("/") || target === "_blank") return;
      e.preventDefault();
      if (href.startsWith("/incidents/")) {
        go("incident", href.replace("/incidents/", ""));
        return;
      }
      if (href === "/") return go("home");
      if (href === "/map") return go("map");
      if (href === "/report") return go("report");
      if (href === "/reports") return go("reports");
      if (href === "/impact") return go("impact");
      if (href === "/alerts") return go("alerts");
      if (href === "/settings") return go("settings");
      // legal pages: route to settings, where they are linked
      go("settings");
    };
    const listener = onClick as EventListener;
    root.addEventListener("click", listener);
    return () => root.removeEventListener("click", listener);
  }, [force, go]);

  // Dock highlight + scroll progress.
  const [scrollPct, setScrollPct] = useState(0);
  useEffect(() => {
    if (!force) return;
    const el = scrollBodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setScrollPct(max > 8 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [force, screen]);

  if (!force && !isMobile) return <>{children}</>;

  const activeIdx = DOCK.findIndex((d) => d.screen === screen);

  const goAny = go as unknown as (screen: string, id?: string) => void;

  const body = force ? (
    <div data-mobile-frame-root className="relative h-full w-full">
      {screen === "home" ? <MobileHome onNavigate={goAny} /> : null}
      {screen === "map" ? (
        <MobileMapView
          initialQ={mapQuery}
          initialTypes={mapTypes}
          initialPriority={mapPriority}
          onNavigate={goAny}
        />
      ) : null}
      {screen === "report" ? <MobileReport onFiled={(id) => go("incident", id)} onNavigate={goAny} /> : null}
      {screen === "reports" ? <MobileReports onNavigate={goAny} /> : null}
      {screen === "impact" ? <MobileImpact onNavigate={goAny} /> : null}
      {screen === "alerts" ? <MobileAlerts onNavigate={goAny} /> : null}
      {screen === "settings" ? <MobileSettings /> : null}
      {screen === "incident" && incidentId ? (
        <IncidentDetail id={incidentId} onNavigate={goAny} />
      ) : null}
    </div>
  ) : (
    children
  );

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col bg-paper text-ink",
        force ? "overflow-hidden" : "min-h-dvh"
      )}
    >
      {/* ---------- Liquid top bar (glass, sticky) ---------- */}
      <div
        className={cn(
          "z-40 shrink-0",
          force ? "absolute inset-x-0 top-0 px-2 pt-2" : "fixed inset-x-0 top-0 px-2 pt-2"
        )}
      >
        <div className="flex h-12 items-center gap-2 rounded-2xl px-3 glass-mobile">
          <Link href="/" aria-label="CIVICOS overview" className="press-mobile flex items-center gap-1.5">
            <span className="text-accent">
              <GlyphLogomark className="h-5 w-5" />
            </span>
            <span className="font-display text-[15px] font-bold tracking-[-0.005em] text-ink">CIVICOS</span>
          </Link>
          <span className="ml-1 flex items-center gap-1 border border-rule bg-panel/60 px-1.5 py-0.5 font-data text-[8.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            <span className="h-1 w-1 rotate-45 bg-ok" />
            Net: online
          </span>

          <div className="ml-auto flex items-center gap-0.5">
            <button
              aria-label="Search"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
              className="press-mobile flex h-9 w-9 items-center justify-center text-ink-soft active:text-accent"
            >
              {searchOpen ? <GlyphClose className="h-[18px] w-[18px]" /> : <GlyphSearch className="h-[18px] w-[18px]" />}
            </button>
            <button
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              onClick={() => go("alerts")}
              className="press-mobile relative flex h-9 w-9 items-center justify-center text-ink-soft"
            >
              <GlyphBell className="h-[18px] w-[18px]" />
              {unread > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rotate-45 bg-alert animate-pulse-dot" />
              ) : null}
            </button>
            <button
              onClick={() => go("settings")}
              className="press-mobile ml-0.5 border border-accent/50 bg-accent-wash p-0"
              aria-label="Profile and settings"
            >
              <Avatar src={me?.user.avatar_uri} name={me?.user.name} initials={me?.user.initials ?? "·"} className="flex h-8 w-8 items-center justify-center object-cover font-data text-[10.5px] font-semibold text-accent" />
            </button>
          </div>
        </div>

        {/* Expanding glass search + quick chips */}
        {searchOpen ? (
          <div className="mt-1.5 rounded-2xl p-2.5 glass-mobile animate-fade-up">
            <form onSubmit={runSearch} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search incidents, areas, registry IDs"
                className="h-9 w-full border border-rule bg-panel px-3 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="press-mobile border border-ink bg-ink px-3 py-2 font-data text-[10px] font-semibold uppercase tracking-[0.12em] text-panel"
              >
                Go
              </button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FILTER_CHIPS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setChip(chip === c.key ? null : c.key)}
                  aria-pressed={chip === c.key}
                  className={cn(
                    "press-mobile border px-2.5 py-1 font-data text-[10px] uppercase tracking-[0.1em]",
                    chip === c.key ? "border-accent bg-accent text-panel" : "border-rule-strong bg-panel text-ink-soft"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-4 text-ink-faint">
              Filters apply to the civic map and its incident list.
            </p>
          </div>
        ) : null}
      </div>

      {/* ---------- Scrollable page body, clear of chrome ---------- */}
      <div
        ref={scrollBodyRef}
        className={cn(
          "min-h-0 w-full flex-1",
          force ? "overflow-y-auto overscroll-contain pt-16 no-scrollbar" : "pt-16 scroll-thin"
        )}
        style={force ? { WebkitOverflowScrolling: "touch" } : undefined}
      >
        {body}
        {force ? <div className="h-28" aria-hidden="true" /> : null}
      </div>

      {/* ---------- Translucent scroll-progress hairline (iOS style) ----------
          Width updates on rAF via transform (never layout thrash); hidden
          once the user reaches either end so it reads as an edge hint. */}
      {force ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-[92px] z-40 flex justify-center transition-opacity duration-200",
            scrollPct <= 0.5 || scrollPct >= 99.5 ? "opacity-0" : "opacity-100"
          )}
        >
          <div className="h-[3px] w-24 rounded-full bg-ink/25 backdrop-blur-sm" style={{ position: "relative", overflow: "hidden" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-ink/70 will-change-transform"
              style={{ transform: `scaleX(${scrollPct / 100})`, transformOrigin: "left", transition: "transform .15s linear" }}
            />
          </div>
        </div>
      ) : null}

      {/* ---------- FAB + spring menu ---------- */}
      <div
        className={cn(
          "z-40 flex flex-col items-end gap-2",
          force ? "absolute bottom-[86px] right-3" : "fixed bottom-[86px] right-3"
        )}
      >
        {fabOpen
          ? [
              { label: "Quick capture", glyph: GlyphCamera, tone: "text-alert", screen: "report" as Screen, delay: "0ms" },
              { label: "Pin location", glyph: GlyphMap, tone: "text-warn", screen: "map" as Screen, delay: "45ms" },
              { label: "Detailed survey", glyph: GlyphLedger, tone: "text-accent", screen: "report" as Screen, delay: "90ms" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  setFabOpen(false);
                  go(a.screen);
                }}
                style={{ animationDelay: a.delay }}
                className="press-mobile flex items-center gap-2 rounded-2xl py-2 pl-3 pr-3.5 glass-mobile animate-spring-pop"
              >
                <a.glyph className={cn("h-4 w-4", a.tone)} />
                <span className="text-[12.5px] font-medium text-ink">{a.label}</span>
              </button>
            ))
          : null}
        <button
          onClick={() => setFabOpen((v) => !v)}
          aria-expanded={fabOpen}
          aria-label={fabOpen ? "Close quick actions" : "File an observation"}
          title={fabOpen ? "Close" : "File observation"}
          className={cn(
            "press-mobile flex h-14 w-14 items-center justify-center rounded-full glass-mobile",
            fabOpen && "fab-open"
          )}
        >
          {fabOpen ? (
            <GlyphClose className="h-5 w-5 text-ink" />
          ) : (
            <GlyphCamera className="h-[22px] w-[22px] text-accent" />
          )}
        </button>
      </div>
      {fabOpen ? (
        <div
          className={cn("z-30 bg-ink/30", force ? "absolute inset-0" : "fixed inset-0")}
          onClick={() => setFabOpen(false)}
        />
      ) : null}

      {/* ---------- Bottom dock ---------- */}
      <nav
        aria-label="Primary"
        className={cn(
          "z-40 shrink-0 pb-1.5 pt-1",
          force ? "absolute inset-x-0 bottom-0" : "fixed inset-x-0 bottom-0 pb-[max(env(safe-area-inset-bottom),8px)]"
        )}
      >
        <div className="relative mx-2 mb-0.5 flex h-16 items-stretch rounded-2xl px-1.5 glass-mobile">
          {activeIdx >= 0 ? (
            <span
              aria-hidden="true"
              className="absolute bottom-1.5 top-1.5 w-[calc(100%/6-4px)] border border-accent/30 bg-accent-wash shadow-[inset_0_1px_0_0_var(--glass-highlight)] transition-[left] duration-300"
              style={{
                left: `calc(${activeIdx} * (100%/6) + 2px)`,
                transitionTimingFunction: "var(--spring)",
              }}
            />
          ) : null}
          {DOCK.map((d) => {
            const active = d.screen === screen;
            const Glyph = d.glyph;
            if (d.primary) {
              return (
                <button
                  key={d.screen}
                  onClick={() => go(d.screen)}
                  aria-label={d.label}
                  className="press-mobile relative z-10 flex flex-1 flex-col items-center justify-center"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 -mt-5 items-center justify-center border bg-accent text-panel shadow-[3px_3px_0_0_var(--rule-strong)]",
                      active ? "border-ink" : "border-accent"
                    )}
                  >
                    <Glyph className="h-5 w-5" />
                  </span>
                  <span className="mt-0.5 font-data text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink">
                    {d.label}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={d.screen}
                onClick={() => go(d.screen)}
                aria-label={d.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press-mobile relative z-10 flex flex-1 flex-col items-center justify-center gap-1",
                  active ? "text-accent" : "text-ink-faint"
                )}
              >
                <span className="relative">
                  <Glyph className={cn("h-[18px] w-[18px]", active && "text-accent")} />
                  {d.badge && unread > 0 ? (
                    <span className="absolute -right-2 -top-1.5 border border-panel bg-alert px-1 font-data text-[8px] font-semibold leading-[13px] text-panel tabular">
                      {unread}
                    </span>
                  ) : null}
                </span>
                <span className="font-data text-[8.5px] font-medium uppercase tracking-[0.12em]">{d.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Keep real-viewport body content clear of the fixed chrome */}
      {!force ? (
        <style>{`
          @media (max-width: 1023.98px) {
            body { padding-bottom: 84px; }
          }
        `}</style>
      ) : null}
      {force ? (
        <style>{`
          /* Frame is a self-contained scroll container: kill rubber-band at the
             document level so only the sheet scrolls, and let taps respond at
             touch speed instead of the 300ms legacy delay. */
          html[data-framed-mobile] {
            overflow: hidden;
            touch-action: manipulation;
          }
        `}</style>
      ) : null}
    </div>
  );
}
