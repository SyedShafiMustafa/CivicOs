"use client";

/**
 * CIVICOS · iOS — hyper-realistic native-style prototype inside an iPhone 16 Pro
 * frame. Liquid Glass over Editorial Paper.
 *
 * Navigation model (per product spec):
 *   - Home and Map are ONE viewport pair, navigated by SCROLLING: drag/swipe
 *     up on home → Map page; drag/swipe down on map → Home. The dock's first
 *     two tabs and the back-chevron do the same, without scrolling.
 *   - The map canvas exists ONLY on the map screen. Every other screen sits
 *     on the editorial paper ground (no map behind anything).
 *   - Report / Filed / Alerts / Settings are full paper screens in the same
 *     viewport column; dock switching is instant, no page transitions.
 *
 * Runs on the LIVE backend: report wizard (analyze → match → submit),
 * before/after verification (resolution + after-samples), GHMC complaint
 * draft + demo submission, stats, incidents, notifications. Deterministic
 * fallbacks keep the frame rendering if the API is unreachable.
 *
 * All styling is scoped under .civ-ios-frame; night mode re-inks via
 * [data-night] INSIDE the frame only. No global tokens are changed.
 * Sets <html data-framed-mobile> so the ambient app shell goes bare here.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAfterSamples,
  fetchIncidents,
  fetchMe,
  fetchMine,
  fetchNotifications,
  fetchSamples,
  fetchStats,
  matchIncidents,
  analyzeImage,
  submitReport,
  verifyResolution,
  createComplaint,
  submitComplaintDemo,
  useApi,
} from "@/lib/api";
import type {
  AfterSample,
  Analysis,
  Complaint,
  Incident,
  IssueType,
  MatchResult,
  Notification,
  ReportBody,
  SamplePhoto,
  StatsOverview,
  Verification,
} from "@/lib/types";
import { GlyphLogomark } from "@/lib/glyphs";
import { Avatar } from "@/components/ui/Avatar";

/* ------------------------------------------------------------------ *
 * Frame-scoped stylesheet
 * ------------------------------------------------------------------ */
const CSS = `
.civ-ios-frame{--fpaper:#F4F1EA;--fpanel:#FBF9F5;--fwell:#EDE9DF;--fink:#2C2A29;--fink2:#5A564F;--fink3:#8F897D;
--frule:#D8D2C4;--frule2:#B9B1A0;--facc:#175E54;--faccw:#E3E9E3;
--falert:#C84B31;--falertw:#F5E3E1;--fwarn:#D99B26;--fwarnw:#F3E9D7;--fhold:#A3702C;--fholdw:#F0EAD8;--fok:#2D4A3E;--fokw:#E4ECDF;
--fglass:rgba(251,249,245,0.78);--fhi:rgba(255,255,255,0.6);--fgb:rgba(44,42,41,0.16);--fgsh:0 12px 32px rgba(44,42,41,0.14);
--fspring:cubic-bezier(0.34,1.56,0.64,1);}
.civ-ios-frame[data-night="1"]{--fpaper:#1C1A19;--fpanel:#26241F;--fwell:#2E2B26;--fink:#ECE7DC;--fink2:#C2BCAE;--fink3:#8B8578;
--frule:#3B3831;--frule2:#514D43;--facc:#4EA08E;--faccw:#24352F;
--falert:#D96A50;--falertw:#3A2724;--fwarn:#E0AC4A;--fwarnw:#383021;--fhold:#C09256;--fholdw:#352F20;--fok:#5FA071;--fokw:#253326;
--fglass:rgba(28,26,25,0.85);--fhi:rgba(255,255,255,0.12);--fgb:rgba(236,231,220,0.14);--fgsh:0 12px 32px rgba(0,0,0,0.45);}
.civ-ios-frame{position:relative;width:430px;height:902px;border-radius:48px;flex:none;
background:linear-gradient(145deg,#3f434b,#14161b 30%,#262a31 60%,#0e1013);
padding:12px;
box-shadow:0 0 0 1.5px rgba(255,255,255,.18),0 25px 50px -12px rgba(0,0,0,.25),0 40px 90px rgba(0,0,0,.5);
font-family:var(--font-body),system-ui,sans-serif;color:var(--fink)}
.civ-ios-frame *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.fscreen{position:relative;width:100%;height:100%;border-radius:38px;overflow:hidden;background:var(--fpaper);color:var(--fink)}
.fserif{font-family:var(--font-display),Georgia,serif;font-optical-sizing:auto}
.fmono{font-family:var(--font-mono),ui-monospace,SFMono-Regular,monospace;letter-spacing:.08em;text-transform:uppercase}
.nosb{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch}
.nosb::-webkit-scrollbar{display:none}
.fglass{background:var(--fglass);-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);
border:1px solid var(--fgb);box-shadow:inset 0 1px 1px 0 var(--fhi),var(--fgsh)}
.fpress{transition:transform .28s var(--fspring),background-color .16s ease,color .16s ease,border-color .16s ease}
.fpress:active{transform:scale(.95)}
.fcard{background:var(--fpanel);border:1px solid var(--frule2);box-shadow:3px 3px 0 0 var(--fwell);padding:13px}
.fplate{background:var(--fpanel);border:1px solid var(--frule2);box-shadow:3px 3px 0 0 var(--fwell)}
.fbadge{display:inline-flex;align-items:center;gap:4px;border:1px solid;padding:2px 7px;font-size:9.5px;font-weight:700;line-height:1.5;white-space:nowrap}
.fdot{width:7px;height:7px;transform:rotate(45deg);display:inline-block;flex:none}
.fhex{position:relative;width:22px;height:22px;flex:none;background:none;border:none;padding:0;cursor:pointer}
.fhex i{position:absolute;inset:3px;transform:rotate(45deg);background:var(--mk)}
.fhex s{position:absolute;inset:0;border:1.5px solid var(--frule2);transform:rotate(45deg);text-decoration:none}
.fhex.sel s{border-color:var(--fink);box-shadow:0 0 0 2px var(--fpanel),0 0 0 3.5px var(--fink)}
.fhandle{width:44px;height:5px;border-radius:3px;background:var(--frule2);margin:8px auto 0}
.fchip{border:1px solid var(--frule2);background:var(--fglass);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);padding:6px 11px;font-size:10px;font-weight:700;color:var(--fink2);white-space:nowrap;letter-spacing:.06em;text-transform:uppercase}
.fchip.on{background:var(--fink);color:var(--fpanel);border-color:var(--fink);box-shadow:0 0 0 1.5px var(--faccw),0 0 14px rgba(23,94,84,.35)}
.fscan{position:relative;overflow:hidden}
.fscan::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(23,94,84,.16),transparent);animation:fscan 1.1s ease-in-out infinite}
@keyframes fscan{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
@keyframes fpulse{0%,100%{transform:rotate(45deg) scale(1)}50%{transform:rotate(45deg) scale(1.5)}}
.fpulse{animation:fpulse 1.6s ease-in-out infinite}
@keyframes fpop{from{opacity:0;transform:translateY(14px) scale(.92)}to{opacity:1;transform:none}}
.fpop{animation:fpop .32s var(--fspring) both}
/* Screen rail: home and map live side by side; vertical scroll navigates. */
.frail{position:absolute;inset:0;display:flex;flex-direction:column;will-change:transform}
.fpage{position:relative;flex:none;height:100%;width:100%}
`;

const FALLBACK_INCIDENTS: Incident[] = [
  {
    id: "HYD-RD-2048", title: "Road Damage", issue_type: "roads", latitude: 17.4142, longitude: 78.4336,
    location_label: "Road No. 12, Banjara Hills", severity: "high", priority: "high", status: "assigned",
    status_label: "Awaiting repair", first_seen: "2026-06-14", last_seen: "2026-09-20",
    observation_count: 23, contributor_count: 17, image_count: 9, department: "GHMC Roads & Transportation",
    summary: "Deep pothole cluster near the junction.", thumbnail_uri: null, distance_m: 240,
  },
  {
    id: "HYD-DR-1176", title: "Drainage Overflow", issue_type: "drainage", latitude: 17.4615, longitude: 78.3639,
    location_label: "Kondapur Main Road", severity: "high", priority: "high", status: "verified",
    status_label: "Verified", first_seen: "2026-08-30", last_seen: "2026-09-19",
    observation_count: 14, contributor_count: 10, image_count: 6, department: "GHMC Storm Water Drains",
    summary: "Storm drain overflowing across the service lane.", thumbnail_uri: null, distance_m: 5200,
  },
  {
    id: "HYD-GR-2941", title: "Garbage Accumulation", issue_type: "garbage", latitude: 17.4483, longitude: 78.393,
    location_label: "Ayyappa Society, Madhapur", severity: "medium", priority: "medium", status: "in_progress",
    status_label: "In progress", first_seen: "2026-08-02", last_seen: "2026-09-19",
    observation_count: 7, contributor_count: 5, image_count: 3, department: "GHMC Solid Waste Management",
    summary: "Transfer point overflowing near metro pillar 1247.", thumbnail_uri: null, distance_m: 6100,
  },
  {
    id: "HYD-ST-1093", title: "Broken Streetlight", issue_type: "streetlights", latitude: 17.4156, longitude: 78.4351,
    location_label: "Road No. 12, Banjara Hills", severity: "low", priority: "low", status: "reported",
    status_label: "Reported", first_seen: "2026-09-15", last_seen: "2026-09-19",
    observation_count: 3, contributor_count: 3, image_count: 1, department: "GHMC Electric Wing",
    summary: "Two poles dark near the park stretch.", thumbnail_uri: null, distance_m: 380,
  },
];
const FALLBACK_STATS: StatsOverview = {
  nearby_issues: 6, my_reports: 8, resolved: 3, active_alerts: 3, nearby_radius_m: 2500,
};

const PRIORITY_HEX: Record<string, string> = { critical: "#C84B31", high: "#C84B31", medium: "#D99B26", low: "#A3702C" };

const inkHex = (i: Incident) =>
  i.status === "resolved" || i.status === "resolution_verified" ? "#2D4A3E" : PRIORITY_HEX[i.priority] ?? "#A3702C";

const timeAgo = (iso: string) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/* ------------------------------------------------------------------ */

type Screen = "home" | "map" | "report" | "reports" | "alerts" | "settings";
type Overlay =
  | { kind: "verify"; inc: Incident }
  | { kind: "complaint"; inc: Incident }
  | null;

const DOCK: { k: Screen; label: string; icon: React.ReactNode }[] = [
  { k: "home", label: "Home", icon: null },
  { k: "map", label: "Map", icon: null },
  { k: "report", label: "Report", icon: null },
  { k: "reports", label: "Filed", icon: null },
  { k: "alerts", label: "Alerts", icon: null },
  { k: "settings", label: "More", icon: null },
];

export default function IosPrototypePage() {
  const [mounted, setMounted] = useState(false);
  const [night, setNight] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [fab, setFab] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ y0: number; dy: number } | null>(null);

  const say = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 2400);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.documentElement.setAttribute("data-framed-mobile", "");
    return () => document.documentElement.removeAttribute("data-framed-mobile");
  }, []);

  const stats = useApi(fetchStats, []);
  const notifs = useApi(fetchNotifications, []);
  const incidents = useApi(fetchIncidents, []);
  const samples = useApi(fetchSamples, []);

  const incList = incidents.data ?? FALLBACK_INCIDENTS;
  const statData: StatsOverview = stats.data ?? FALLBACK_STATS;
  const unread = (notifs.data ?? []).filter((n) => !n.read).length;

  const shown = useMemo(
    () =>
      incList.filter(
        (i) =>
          (filter === "all" || i.issue_type === filter) &&
          (q.trim() === "" ||
            `${i.title} ${i.id} ${i.location_label}`.toLowerCase().includes(q.trim().toLowerCase()))
      ),
    [incList, filter, q]
  );

  const selInc = incList.find((i) => i.id === selected) ?? null;
  const onMap = screen === "home" || screen === "map";

  /* ------- home <-> map vertical swipe -------
     Tracking runs on native window listeners: the drag keeps working even if
     the finger leaves the rail, and gesture events are never lost to React
     synthetic-event edge cases. Finger up (dy > 0) reveals the page BELOW
     (the map); finger down returns home. */
  const dragRef = useRef<{ y0: number; dy: number } | null>(null);

  function onDown(e: React.PointerEvent) {
    if (dragRef.current) return;
    dragRef.current = { y0: e.clientY, dy: 0 };
    setDrag({ y0: e.clientY, dy: 0 });
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const next = { y0: d.y0, dy: d.y0 - ev.clientY };
      dragRef.current = next;
      setDrag(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      if (d.dy > 70) setScreen("map");
      else if (d.dy < -70) setScreen("home");
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  /* Wheel on the paper areas of home navigates down to the map; wheel at the
     top of the map navigates back up. The map itself pans, so only the top
     120px band (above the focus card zone) triggers back-navigation. */
  function onWheelHome(e: React.WheelEvent) {
    const el = e.currentTarget as HTMLElement;
    const scroller = el.querySelector("[data-home-scroll]") as HTMLElement | null;
    const atBottom = !scroller || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8;
    if (e.deltaY > 24 && atBottom) setScreen("map");
  }
  function onWheelMap(e: React.WheelEvent) {
    if (e.deltaY < -40 && e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top < 150) {
      setScreen("home");
    }
  }

  const dockIdx = DOCK.findIndex((t) => t.k === screen);

  const filterChips = ["all", "roads", "garbage", "water", "streetlights", "drainage"];

  if (!mounted) {
    return (
      <div className="relative flex min-h-dvh w-full items-center justify-center bg-[#0b0a10] p-4 sm:p-8">
        <div className="civ-ios-frame" aria-hidden style={{ visibility: "hidden" }} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-[#0b0a10] p-4 sm:p-8">
      <div className="civ-ios-frame" data-night={night ? "1" : "0"}>
        <style>{CSS}</style>
        <div className="fscreen">
          {/* ================= SCREEN RAIL (home | map) — scroll navigates ================= */}
          <div
            className="frail nosb"
            style={{
              transform: `translateY(${screen === "map" ? "-100%" : "0"}${drag && onMap ? `, ${-drag.dy * 0.35}px` : ""})`,
              transition: drag ? "none" : "transform .5s var(--fspring)",
              touchAction: onMap ? "none" : "auto",
              visibility: onMap ? "visible" : "hidden",
            }}
            onPointerDown={onMap ? onDown : undefined}
          >
            {/* ---------------- HOME PAGE ---------------- */}
            <div className="fpage" onWheel={onWheelHome}>
              <div data-home-scroll className="nosb absolute inset-x-2.5 bottom-[100px] top-[150px] overflow-y-auto">
                <SheetHome
                  stats={statData}
                  incidents={shown}
                  onOpen={(id) => { setSelected(id); setScreen("map"); }}
                />
              </div>
            </div>
            {/* ---------------- MAP PAGE ---------------- */}
            <div className="fpage" onWheel={onWheelMap}>
              <MapCanvas
                incidents={shown}
                selectedId={selected}
                onSelect={(id) => setSelected(id)}
              />
              {selInc ? (
                <FocusCard
                  inc={selInc}
                  onClose={() => setSelected(null)}
                  onVerify={() => setOverlay({ kind: "verify", inc: selInc })}
                  onComplaint={() => setOverlay({ kind: "complaint", inc: selInc })}
                />
              ) : null}
            </div>
          </div>

          {/* ================= PAPER SCREENS (report / filed / alerts / more) ================= */}
          {!onMap ? (
            <div className="nosb absolute inset-x-2.5 bottom-[100px] top-[150px] z-10 overflow-y-auto">
              <div className="space-y-2.5 pb-6">
                {screen === "report" ? (
                  <ReportWizard
                    samples={samples.data ?? []}
                    say={say}
                    onFiled={(id) => { setSelected(id); setScreen("map"); }}
                  />
                ) : null}
                {screen === "reports" ? (
                  <FiledSheet incidents={incList} onOpen={(id) => { setSelected(id); setScreen("map"); }} />
                ) : null}
                {screen === "alerts" ? (
                  <AlertsSheet notifs={notifs.data ?? []} onOpen={(id) => { setSelected(id); setScreen("map"); }} />
                ) : null}
                {screen === "settings" ? (
                  <SettingsSheet
                    night={night}
                    onNight={(v) => { setNight(v); say(v ? "Night survey on" : "Day survey on"); }}
                    onLegal={(k) => say(k === "terms" ? "Terms of Service: see the desktop app" : "Privacy Policy: see the desktop app")}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ================= STATUS BAR ================= */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[60]">
            <div
              className="flex items-center justify-between px-8 pt-3.5 text-[14px] font-semibold"
              style={{ color: "var(--fink)" }}
            >
              <span className="fmono" style={{ letterSpacing: "0.02em" }}>9:41</span>
              <span className="flex items-center gap-1.5">
                <IconSig /><IconWifi /><IconBatt />
              </span>
            </div>
          </div>
          <div className="fist"><span className="cam" /></div>

          {/* ================= GLASS TOP BAR ================= */}
          <header className="absolute inset-x-2.5 top-[50px] z-50 rounded-[22px] fglass px-3.5 py-2.5">
            {searchOpen ? (
              <div className="fpop">
                <div className="frow gap-2">
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search incidents, areas, registry IDs"
                    className="fgrow h-9 border bg-[var(--fpanel)] px-3 text-[13px] outline-none"
                    style={{ borderColor: "var(--frule2)", color: "var(--fink)" }}
                  />
                  <button
                    className="fpress fmono border px-3 py-2 text-[10px] font-bold"
                    style={{ background: "var(--fink)", color: "var(--fpanel)", borderColor: "var(--fink)" }}
                    onClick={() => { setSearchOpen(false); if (q.trim()) say(`Filtering: ${q.trim()}`); }}
                  >
                    Go
                  </button>
                </div>
                <div className="nosb mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
                  {["Pothole", "Road No. 12", "GHMC Drain", "Urgent"].map((c) => (
                    <button key={c} className="fchip fpress" onClick={() => setQ(c)}>{c}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="frow gap-2">
                <GlyphLogomark style={{ fontSize: 20, color: "var(--facc)" }} />
                <span className="fserif text-[16px] font-bold tracking-[-0.01em]">CIVICOS</span>
                <span
                  className="fmono ml-1 inline-flex items-center gap-1 border px-1.5 py-0.5 text-[8px] font-bold"
                  style={{ borderColor: "var(--frule2)", color: "var(--fink3)" }}
                >
                  <span className="fdot" style={{ background: "var(--facc)", width: 6, height: 6 }} /> Net: online
                </span>
                <span className="frow ml-auto gap-0.5">
                  <button aria-label="Search" className="fpress grid h-9 w-9 place-items-center" onClick={() => setSearchOpen(true)}>
                    <IconSearch />
                  </button>
                  <button
                    aria-label={`Notifications, ${unread} unread`}
                    className="fpress relative grid h-9 w-9 place-items-center"
                    onClick={() => setScreen("alerts")}
                  >
                    <IconBell />
                    {unread > 0 ? (
                      <span
                        className="fpulse absolute right-1.5 top-1.5 h-2 w-2 rotate-45"
                        style={{ background: "var(--falert)", boxShadow: "0 0 0 1.5px var(--fpanel)" }}
                      />
                    ) : null}
                  </button>
                  <button
                    aria-label="Profile"
                    className="fpress fmono grid h-8 w-8 place-items-center border text-[10px] font-bold"
                    style={{ borderColor: "var(--facc)", background: "var(--faccw)", color: "var(--facc)" }}
                    onClick={() => setScreen("settings")}
                  >
                    TR
                  </button>
                </span>
              </div>
            )}
          </header>

          {/* ================= FILTER RAIL (map screen) ================= */}
          {screen === "map" ? (
            <div className="nosb absolute inset-x-2.5 top-[110px] z-30 flex gap-1.5 overflow-x-auto pb-1">
              {filterChips.map((c) => (
                <button key={c} className={`fchip fpress ${filter === c ? "on" : ""}`} onClick={() => setFilter(c)}>
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          ) : null}

          {/* ================= BACK CHEVRON (map -> home) ================= */}
          {screen === "map" ? (
            <button
              aria-label="Back to home"
              className="fpress fglass absolute right-2.5 top-[110px] z-30 grid h-8 w-8 place-items-center rounded-full"
              onClick={() => setScreen("home")}
            >
              <span className="fdot" style={{ background: "var(--fink)", width: 8, height: 8 }} />
            </button>
          ) : null}

          {/* ================= FAB ================= */}
          {onMap ? (
            <>
              {fab ? (
                <div
                  className="absolute inset-0 z-[45]"
                  style={{ background: "rgba(20,18,16,.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
                  onClick={() => setFab(false)}
                />
              ) : null}
              <div className="absolute bottom-[100px] right-3 z-[46] flex flex-col items-end gap-2">
                {fab
                  ? [
                      { label: "Capture evidence", act: () => { setFab(false); setScreen("report"); } },
                      { label: "Pin geo-location", act: () => { setFab(false); setScreen("map"); say("Pick a spot on the map"); } },
                      {
                        label: "Verify repair",
                        act: () => {
                          setFab(false);
                          const t =
                            incList.find((i) => i.status === "resolved" || i.status === "resolution_verified") ??
                            incList.find((i) => i.status === "in_progress");
                          if (t) setOverlay({ kind: "verify", inc: t });
                          else say("No repairs awaiting verification yet");
                        },
                      },
                    ].map((a, i) => (
                      <button
                        key={a.label}
                        onClick={a.act}
                        style={{ animationDelay: `${i * 45}ms` }}
                        className="fpress fpop fglass flex items-center gap-2 rounded-full py-2 pl-3 pr-4 text-[12.5px] font-semibold"
                      >
                        <span className="fdot" style={{ background: ["var(--falert)", "var(--fwarn)", "var(--facc)"][i] }} />
                        {a.label}
                      </button>
                    ))
                  : null}
                <button
                  aria-label="File an observation"
                  aria-expanded={fab}
                  onClick={() => setFab((v) => !v)}
                  className="fpress fglass flex h-14 items-center gap-2 rounded-full px-5"
                  style={{ borderColor: "var(--facc)" }}
                >
                  <IconPlus open={fab} />
                  {!fab ? <span className="text-[12.5px] font-bold">File observation</span> : null}
                </button>
              </div>
            </>
          ) : null}

          {/* ================= DOCK ================= */}
          <nav aria-label="Primary" className="absolute inset-x-2.5 bottom-[22px] z-50">
            <div className="fglass relative flex h-[62px] rounded-[24px] px-1.5">
              <span
                aria-hidden
                className="absolute bottom-1.5 top-1.5 rounded-[18px] border"
                style={{
                  width: `calc((100% - 12px) / 6)`,
                  left: `calc(6px + ${Math.max(0, dockIdx)} * ((100% - 12px) / 6))`,
                  background: "var(--faccw)",
                  borderColor: "var(--facc)",
                  boxShadow: "inset 0 1px 1px 0 var(--fhi), 0 4px 14px rgba(23,94,84,.28)",
                  transition: "left .42s var(--fspring)",
                }}
              />
              {DOCK.map((t) => (
                <button
                  key={t.k}
                  aria-label={t.label}
                  onClick={() => setScreen(t.k)}
                  className="fpress relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5"
                  style={{ color: screen === t.k ? "var(--facc)" : "var(--fink3)" }}
                >
                  <DockGlyph k={t.k} />
                  <span className="fmono text-[8px] font-bold">{t.label}</span>
                  {t.k === "alerts" && unread > 0 ? (
                    <span
                      className="fmono absolute right-2 top-1 border px-1 text-[8px] font-bold"
                      style={{ background: "var(--falert)", color: "#FBF9F5", borderColor: "var(--fpanel)" }}
                    >
                      {unread}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </nav>

          {/* ================= OVERLAYS ================= */}
          {overlay?.kind === "verify" ? (
            <VerifyModal inc={overlay.inc} onClose={() => setOverlay(null)} say={say} />
          ) : null}
          {overlay?.kind === "complaint" ? (
            <ComplaintModal inc={overlay.inc} onClose={() => setOverlay(null)} say={say} />
          ) : null}

          {/* ================= TOAST ================= */}
          {toast ? (
            <div
              className="fpop fglass absolute left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2.5 text-[12px] font-semibold"
              style={{ bottom: 102 }}
            >
              {toast}
            </div>
          ) : null}

          {/* ================= HOME INDICATOR ================= */}
          <div
            className="pointer-events-none absolute bottom-2 left-1/2 z-[80] h-[5px] w-[134px] -translate-x-1/2 rounded-[3px]"
            style={{ background: night ? "rgba(236,231,220,.5)" : "rgba(20,18,16,.55)" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== *
 * Map canvas — exists only on the map page; paper everywhere else.
 * ==================================================================== */
function MapCanvas({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const map = useRef<import("maplibre-gl").Map | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef<Map<string, import("maplibre-gl").Marker>>(new Map());
  const selRef = useRef(onSelect);
  selRef.current = onSelect;
  const incRef = useRef(incidents);
  incRef.current = incidents;
  const buildRef = useRef<() => void>(() => {});

  useEffect(() => {
    let dead = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (dead || !wrap.current || map.current) return;
      mlRef.current = ml;
      const m = new ml.Map({
        container: wrap.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            { id: "bg", type: "background", paint: { "background-color": "#e6ebf0" } },
            { id: "osm", type: "raster", source: "osm" },
          ],
        },
        center: [78.415, 17.432],
        zoom: 11.4,
        attributionControl: false,
      });
      map.current = m;
      m.on("load", () => buildRef.current());
      m.on("idle", () => buildRef.current());
    })();
    return () => {
      dead = true;
      map.current?.remove();
      map.current = null;
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  buildRef.current = () => {
    const m = map.current;
    const ml = mlRef.current;
    if (!m || !ml) return;
    try {
      const seen = new Set<string>();
      for (const inc of incRef.current) {
        seen.add(inc.id);
        let mk = markers.current.get(inc.id);
        if (!mk) {
          const el = document.createElement("button");
          el.className = "fhex";
          el.dataset.inc = inc.id;
          el.style.setProperty("--mk", inkHex(inc));
          el.innerHTML = "<i></i><s></s>";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            selRef.current(inc.id);
          });
          mk = new ml.Marker({ element: el, anchor: "center" })
            .setLngLat([inc.longitude, inc.latitude])
            .addTo(m);
          mk.getElement().setAttribute("aria-label", `${inc.title} · ${inc.id}`);
          markers.current.set(inc.id, mk);
        }
      }
      for (const [id, mk] of markers.current) {
        if (!seen.has(id)) {
          mk.remove();
          markers.current.delete(id);
        }
      }
    } catch (e) {
      console.error("CIVICOS · marker build failed", e);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const attempt = () => {
      if (cancelled) return;
      if (!map.current) {
        if (tries++ < 60) window.setTimeout(attempt, 200);
        return;
      }
      buildRef.current();
    };
    attempt();
    return () => {
      cancelled = true;
    };
  }, [incidents]);

  useEffect(() => {
    for (const [id, mk] of markers.current) {
      mk.getElement().classList.toggle("sel", id === selectedId);
    }
    const sel = incidents.find((i) => i.id === selectedId);
    if (sel && map.current) {
      map.current.flyTo({ center: [sel.longitude, sel.latitude], zoom: Math.max(map.current.getZoom(), 13.2), duration: 700 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div className="fmapwrap" ref={wrap} />;
}

/* ==================================================================== *
 * Screen header (small-caps eyebrow + serif title, paper screens)
 * ==================================================================== */
function ScreenHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="pb-1">
      <p className="fmono text-[9px] font-bold" style={{ color: "var(--fink3)" }}>{eyebrow}</p>
      <h1 className="fserif mt-1 text-[24px] font-semibold leading-tight tracking-[-0.012em]">{title}</h1>
      {sub ? <p className="mt-1 text-[12px] leading-5" style={{ color: "var(--fink2)" }}>{sub}</p> : null}
    </div>
  );
}

/* ==================================================================== *
 * Home sheet — masthead, stats, nearby incidents, recent activity.
 * ==================================================================== */
function SheetHome({
  stats,
  incidents,
  onOpen,
}: {
  stats: StatsOverview;
  incidents: Incident[];
  onOpen: (id: string) => void;
}) {
  const near = [...incidents]
    .sort((a, b) => (a.distance_m ?? 9e9) - (b.distance_m ?? 9e9))
    .slice(0, 5);
  const hours = new Date().getHours();
  const greet = hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <p className="fmono text-[9.5px] font-bold" style={{ color: "var(--fink3)" }}>
        {greet}, Tanisha · Road No. 12, Banjara Hills
      </p>
      <h1 className="fserif mt-1.5 text-[27px] font-semibold leading-[1.15] tracking-[-0.015em]">
        The state of your streets.
      </h1>
      <p className="mt-1.5 text-[12.5px] leading-5" style={{ color: "var(--fink2)" }}>
        One photo is enough to start. Your observations join your neighbours’ to build a verified
        record.
      </p>

      {/* stat strip */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          { n: stats.nearby_issues, l: "Nearby", note: "issues within 2.5 km", c: "var(--falert)" },
          { n: stats.my_reports, l: "Filed", note: "observations by you", c: "var(--facc)" },
          { n: stats.resolved, l: "Resolved", note: "incidents closed", c: "var(--fok)" },
          { n: stats.active_alerts, l: "Alerts", note: "unread notices", c: "var(--fwarn)" },
        ].map((s) => (
          <div key={s.l} className="fplate p-3">
            <div className="frow justify-between">
              <span className="fmono text-[8.5px] font-bold" style={{ color: "var(--fink3)" }}>{s.l}</span>
              <span className="fdot" style={{ background: s.c, width: 6, height: 6 }} />
            </div>
            <p className="fserif mt-1.5 text-[30px] font-semibold leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{s.n}</p>
            <p className="mt-1 text-[10px] leading-3.5" style={{ color: "var(--fink3)" }}>{s.note}</p>
          </div>
        ))}
      </div>

      {/* nearby incidents */}
      <div className="frow mt-5 justify-between">
        <p className="fmono text-[9px] font-bold" style={{ color: "var(--fink3)" }}>Nearby issues</p>
        <span className="fmono text-[8.5px]" style={{ color: "var(--fink3)" }}>{incidents.length} active</span>
      </div>
      <div className="mt-2 space-y-2">
        {near.map((inc) => (
          <button key={inc.id} onClick={() => onOpen(inc.id)} className="fpress fcard block w-full text-left">
            <div className="frow justify-between gap-2">
              <span className="fmono text-[8.5px] font-bold" style={{ color: "var(--fink3)" }}>{inc.id}</span>
              <span className="fdot" style={{ background: inkHex(inc) }} />
            </div>
            <p className="fserif mt-1 text-[15px] font-semibold leading-snug">{inc.title}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--fink2)" }}>{inc.location_label}</p>
            <div className="frow mt-2 justify-between border-t pt-2" style={{ borderColor: "var(--frule)" }}>
              <span className="fmono text-[8.5px]" style={{ color: "var(--fink3)" }}>
                {inc.observation_count} obs · {inc.contributor_count} people
              </span>
              <span className="fbadge" style={{ borderColor: inkHex(inc), color: inkHex(inc) }}>
                {inc.status_label}
              </span>
            </div>
          </button>
        ))}
        {near.length === 0 ? (
          <div className="fplate p-4 text-center text-[12px]" style={{ color: "var(--fink3)" }}>
            No incidents match this filter.
          </div>
        ) : null}
      </div>

      <p className="fmono mt-5 text-[9px] font-bold" style={{ color: "var(--fink3)" }}>
        Recent activity
      </p>
      <div className="mt-2 space-y-1.5">
        {(incidents.slice(0, 3) ?? []).map((inc, i) => (
          <div key={inc.id + i} className="frow gap-2 px-0.5 py-1.5">
            <span className="fdot mt-0.5" style={{ background: inkHex(inc), width: 6, height: 6 }} />
            <p className="text-[11.5px] leading-4" style={{ color: "var(--fink2)" }}>
              {inc.title} · {inc.location_label} · {inc.status_label.toLowerCase()}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-[10px]" style={{ color: "var(--fink3)" }}>
        Swipe up for the civic map
      </p>
    </div>
  );
}

/* ==================================================================== *
 * Filed sheet (My reports)
 * ==================================================================== */
function FiledSheet({ incidents, onOpen }: { incidents: Incident[]; onOpen: (id: string) => void }) {
  const { data } = useApi(fetchMine, []);
  const rows = (data ?? []).slice(0, 10);
  return (
    <div>
      <ScreenHead eyebrow="Sheet 04 · personal register" title="Your filings" sub="Every observation you have filed, and where it landed." />
      {rows.length === 0 ? (
        <div className="fplate mt-3 p-4 text-center text-[12px]" style={{ color: "var(--fink3)" }}>
          No filings yet. Your first observation starts the record.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <button key={r.observation.id} onClick={() => onOpen(r.incident.id)} className="fpress fcard block w-full text-left">
              <div className="frow justify-between gap-2">
                <span className="fserif truncate text-[14px] font-semibold">{r.incident.title}</span>
                <span className="fdot" style={{ background: inkHex(r.incident) }} />
              </div>
              <p className="fmono mt-0.5 text-[8.5px]" style={{ color: "var(--fink3)" }}>
                {r.incident.id} · {r.incident.location_label}
              </p>
              <div className="frow mt-2 justify-between border-t pt-2" style={{ borderColor: "var(--frule)" }}>
                <span className="text-[10.5px]" style={{ color: "var(--fink2)" }}>{r.latest_update}</span>
                <span className="fbadge" style={{ borderColor: inkHex(r.incident), color: inkHex(r.incident) }}>
                  {r.incident.status_label}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================================================================== *
 * Alerts sheet
 * ==================================================================== */
function AlertsSheet({ notifs, onOpen }: { notifs: Notification[]; onOpen: (id: string) => void }) {
  return (
    <div>
      <ScreenHead eyebrow="Sheet 05 · notices" title="Alerts" sub="Changes to incidents you follow. Tap to open the file." />
      {notifs.length === 0 ? (
        <div className="fplate mt-3 p-4 text-center text-[12px]" style={{ color: "var(--fink3)" }}>
          Nothing yet. Alerts arrive when your incidents move.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {notifs.map((n) => (
            <button
              key={n.id}
              onClick={() => (n.incident_id ? onOpen(n.incident_id) : undefined)}
              className="fpress fcard block w-full text-left"
              style={{ borderColor: n.read ? "var(--frule2)" : "var(--fink)" }}
            >
              <div className="frow justify-between gap-2">
                <span className="fmono text-[8.5px] font-bold" style={{ color: n.read ? "var(--fink3)" : "var(--facc)" }}>
                  {n.read ? "Read" : "New"}
                </span>
                <span className="fmono text-[8.5px]" style={{ color: "var(--fink3)" }}>{timeAgo(n.timestamp)}</span>
              </div>
              <p className="fserif mt-1 text-[13.5px] font-semibold">{n.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-4" style={{ color: "var(--fink2)" }}>{n.body}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================================================================== *
 * Settings sheet
 * ==================================================================== */
function SettingsSheet({
  night,
  onNight,
  onLegal,
}: {
  night: boolean;
  onNight: (v: boolean) => void;
  onLegal: (k: "terms" | "privacy") => void;
}) {
  const { data: me } = useApi(fetchMe, []);
  const [haptics, setHaptics] = useState(false);
  useEffect(() => {
    setHaptics(window.localStorage.getItem("civicos-haptics") === "on");
  }, []);
  return (
    <div>
      <ScreenHead eyebrow="Sheet 07 · surveyor" title="Settings" />
      <div className="fplate mt-3 p-4">
        <div className="frow gap-3">
          <Avatar
            src={me?.user.avatar_uri}
            name={me?.user.name}
            initials={me?.user.initials ?? "TR"}
            className="fmono grid h-11 w-11 place-items-center border object-cover text-[13px] font-bold"
            style={{ borderColor: "var(--facc)", background: "var(--faccw)", color: "var(--facc)" }}
          />
          <div className="min-w-0">
            <p className="fserif text-[15px] font-semibold">{me?.user.name ?? "Tanisha Rao"}</p>
            <p className="fmono mt-0.5 text-[8.5px]" style={{ color: "var(--fink3)" }}>
              Surveyor · {me?.user.area ?? "Banjara Hills, Hyderabad"}
            </p>
          </div>
        </div>
      </div>

      <div className="fplate mt-2.5 divide-y" style={{ borderColor: "var(--frule)" }}>
        <SettingRow
          label="Night survey"
          hint="Dark ink for evening field work."
          on={night}
          onToggle={() => onNight(!night)}
        />
        <SettingRow
          label="Tactile feedback"
          hint="Vibration on confirmations where supported."
          on={haptics}
          onToggle={() => {
            const next = !haptics;
            setHaptics(next);
            window.localStorage.setItem("civicos-haptics", next ? "on" : "off");
            if (next && "vibrate" in navigator) navigator.vibrate(15);
          }}
        />
      </div>

      <div className="fplate mt-2.5 divide-y" style={{ borderColor: "var(--frule)" }}>
        <LegalRow label="Terms of service" hint="Prototype status and acceptable use." onClick={() => onLegal("terms")} />
        <LegalRow label="Privacy policy" hint="What the survey stores and why." onClick={() => onLegal("privacy")} />
      </div>

      <p className="mt-3 text-center text-[10px]" style={{ color: "var(--fink3)" }}>
        Prototype · demo store · no real municipal submissions
      </p>
    </div>
  );
}

function SettingRow({ label, hint, on, onToggle }: { label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="frow justify-between gap-3 p-3.5" style={{ borderColor: "var(--frule)" }}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="mt-0.5 text-[10.5px] leading-4" style={{ color: "var(--fink3)" }}>{hint}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        className="fpress relative h-7 w-12 shrink-0 border"
        style={{ borderColor: "var(--fink)", background: on ? "var(--fink)" : "var(--fwell)" }}
      >
        <span
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 border transition-all duration-200"
          style={{
            borderColor: "var(--fink)",
            background: "var(--fpanel)",
            left: on ? 24 : 2,
          }}
        />
      </button>
    </div>
  );
}

function LegalRow({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="fpress frow w-full justify-between gap-3 p-3.5 text-left" style={{ borderColor: "var(--frule)" }}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="mt-0.5 text-[10.5px] leading-4" style={{ color: "var(--fink3)" }}>{hint}</p>
      </div>
      <span className="fmono text-[9px] font-bold" style={{ color: "var(--facc)" }}>Read</span>
    </button>
  );
}

/* ==================================================================== *
 * Report wizard — camera-first: evidence → AI analysis → clustering → filed.
 * ==================================================================== */
function ReportWizard({
  samples,
  say,
  onFiled,
}: {
  samples: SamplePhoto[];
  say: (m: string) => void;
  onFiled: (incidentId: string) => void;
}) {
  const [sample, setSample] = useState<SamplePhoto | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [category, setCategory] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = !sample ? 0 : !analysis ? 1 : !match ? 2 : 3;

  async function pick(s: SamplePhoto) {
    setSample(s);
    setAnalysis(null);
    setMatch(null);
    setAnalyzing(true);
    try {
      // Curated samples carry their ground truth via sample_id (no image bytes
      // needed). Re-uploading the photo would be a cross-origin fetch from the
      // prototype hosts, which static assets do not allow.
      const form = new FormData();
      form.append("sample_id", s.id);
      form.append("latitude", String(s.latitude));
      form.append("longitude", String(s.longitude));
      const a = await analyzeImage(form);
      setAnalysis(a);
      setCategory(a.issue_type);
      const m = await matchIncidents(a);
      setMatch(m);
    } catch {
      say("Analysis unavailable — check the survey network");
      setAnalyzing(false);
    }
    setAnalyzing(false);
  }

  async function submit(decision: "attach" | "new") {
    if (!analysis || !sample) return;
    setSubmitting(true);
    try {
      const body: ReportBody = {
        issue_type: (category || analysis.issue_type) as IssueType,
        description: analysis.description,
        severity: analysis.severity,
        confidence: analysis.confidence,
        mode: analysis.mode,
        latitude: sample.latitude,
        longitude: sample.longitude,
        image_data: null,
        sample_id: sample.id,
        match_decision: decision,
        attach_incident_id: decision === "attach" ? match?.candidates[0]?.incident.id ?? null : null,
        embedding: analysis.embedding,
      };
      const res = await submitReport(body);
      say(res.attached ? `Observation added to ${res.incident.id}` : `New incident ${res.incident.id} opened`);
      onFiled(res.incident.id);
    } catch {
      say("Submission failed — try again");
    }
    setSubmitting(false);
  }

  return (
    <div>
      <ScreenHead eyebrow="Sheet 03 · field capture" title="File a report" sub="Camera first. The system reads the issue, checks for existing incidents nearby, and asks you before it files anything." />

      {/* step rail */}
      <div className="frow mt-3 gap-1.5">
        {["Evidence", "Analysis", "Match", "Filed"].map((s, i) => (
          <div key={s} className="frow flex-1 gap-1.5">
            <div className="frow items-center gap-1.5">
              <span
                className="fmono grid h-5 w-5 place-items-center border text-[9px] font-bold"
                style={{
                  borderColor: i <= step ? "var(--facc)" : "var(--frule2)",
                  background: i < step ? "var(--facc)" : "transparent",
                  color: i < step ? "var(--fpanel)" : i === step ? "var(--facc)" : "var(--fink3)",
                }}
              >
                {i + 1}
              </span>
              <span className="fmono text-[7.5px] font-bold" style={{ color: i <= step ? "var(--facc)" : "var(--fink3)" }}>{s}</span>
            </div>
            {i < 3 ? <span className="h-px flex-1" style={{ background: "var(--frule2)" }} /> : null}
          </div>
        ))}
      </div>

      {/* step 0: sample evidence */}
      {!sample ? (
        <div className="mt-3">
          <p className="fmono text-[9px] font-bold" style={{ color: "var(--fink3)" }}>Sample evidence</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {samples.map((s) => (
              <button key={s.id} onClick={() => pick(s)} className="fpress fcard block w-full text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image_uri} alt={s.label} className="h-20 w-full border object-cover" style={{ borderColor: "var(--frule2)" }} />
                <p className="fserif mt-1.5 text-[12px] font-semibold">{s.label}</p>
                <p className="fmono mt-0.5 text-[7.5px]" style={{ color: "var(--fink3)" }}>{s.hint ?? s.issue_type}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          {/* evidence + analysis */}
          <div className="fcard">
            <div className="frow gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sample.image_uri} alt={sample.label} className="h-24 w-32 shrink-0 border object-cover" style={{ borderColor: "var(--frule2)" }} />
              <div className="min-w-0 flex-1">
                <p className="fmono text-[8.5px] font-bold" style={{ color: "var(--fink3)" }}>AI detection</p>
                {analyzing ? (
                  <div className="mt-2">
                    <p className="fserif text-[15px] font-semibold">Reading the scene…</p>
                    <div className="fscan mt-2 h-1.5" style={{ background: "var(--fwell)" }} />
                  </div>
                ) : analysis ? (
                  <>
                    <p className="fserif mt-0.5 text-[16px] font-semibold leading-tight">{analysis.issue_label}</p>
                    <p className="fmono mt-0.5 text-[8.5px]" style={{ color: "var(--fink3)" }}>
                      Confidence {Math.round(analysis.confidence * 100)}% · {analysis.severity} severity · {analysis.mode === "demo" ? "demo analysis" : "live analysis"}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-4" style={{ color: "var(--fink2)" }}>Location detected · evidence clear</p>
                  </>
                ) : null}
              </div>
            </div>
            {analysis ? (
              <div className="mt-2.5 border-t pt-2.5" style={{ borderColor: "var(--frule)" }}>
                <p className="fmono text-[8.5px] font-bold" style={{ color: "var(--fink3)" }}>Why this classification</p>
                <div className="mt-1.5 space-y-1">
                  {analysis.why.map((w) => (
                    <p key={w.label} className="text-[11px] leading-4" style={{ color: "var(--fink2)" }}>
                      <span className="font-semibold" style={{ color: "var(--fink)" }}>{w.label}:</span> {w.detail}
                    </p>
                  ))}
                </div>
                <div className="frow mt-2.5 justify-between gap-2">
                  <span className="fmono text-[8.5px]" style={{ color: "var(--fink3)" }}>Not right? Correct it</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="fchip fpress"
                    style={{ color: "var(--fink)", background: "var(--fpanel)" }}
                    aria-label="Correct the category"
                  >
                    {["roads", "garbage", "water", "streetlights", "drainage", "accessibility", "other"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </div>

          {/* clustering candidate */}
          {match ? (
            <div className="fcard mt-2.5">
              <p className="fmono text-[8.5px] font-bold" style={{ color: "var(--fink3)" }}>Incident clustering</p>
              {match.decision === "new" || match.candidates.length === 0 ? (
                <p className="fserif mt-1 text-[13.5px] font-semibold">No existing incident found nearby</p>
              ) : (
                <>
                  <p className="fserif mt-1 text-[13.5px] font-semibold">
                    Possible existing incident found
                  </p>
                  <div className="frow mt-1.5 justify-between">
                    <span className="fmono text-[9px] font-bold" style={{ color: "var(--facc)" }}>
                      {match.candidates[0].incident.id} · {Math.round(match.candidates[0].similarity * 100)}% similar
                    </span>
                    <span className="fbadge" style={{ borderColor: inkHex(match.candidates[0].incident), color: inkHex(match.candidates[0].incident) }}>
                      {match.candidates[0].incident.status_label}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    {match.candidates[0].reasons.map((r) => (
                      <p key={r} className="text-[10.5px] leading-4" style={{ color: "var(--fink2)" }}>· {r}</p>
                    ))}
                  </div>
                </>
              )}
              <div className="frow mt-3 gap-2">
                {match.decision !== "new" && match.candidates.length > 0 ? (
                  <button
                    onClick={() => submit("attach")}
                    disabled={submitting}
                    className="fpress flex-1 border py-2.5 text-[11px] font-bold"
                    style={{ background: "var(--facc)", borderColor: "var(--facc)", color: "var(--fpanel)" }}
                  >
                    {submitting ? "Filing…" : `Add to ${match.candidates[0].incident.id}`}
                  </button>
                ) : null}
                <button
                  onClick={() => submit("new")}
                  disabled={submitting}
                  className="fpress flex-1 border py-2.5 text-[11px] font-bold"
                  style={{ background: "var(--fink)", borderColor: "var(--fink)", color: "var(--fpanel)" }}
                >
                  {submitting ? "Filing…" : "Create new incident"}
                </button>
              </div>
            </div>
          ) : null}

          <button
            onClick={() => { setSample(null); setAnalysis(null); setMatch(null); }}
            className="fpress fmono mt-2.5 text-[9px] font-bold"
            style={{ color: "var(--fink3)" }}
          >
            ← Choose different evidence
          </button>
        </div>
      )}
    </div>
  );
}

/* ==================================================================== *
 * Focus card — incident preview after tapping a marker (map screen).
 * ==================================================================== */
function FocusCard({
  inc,
  onClose,
  onVerify,
  onComplaint,
}: {
  inc: Incident;
  onClose: () => void;
  onVerify: () => void;
  onComplaint: () => void;
}) {
  const canVerify = inc.status === "resolved" || inc.status === "resolution_verified";
  return (
    <div className="absolute inset-x-2.5 bottom-[100px] z-40 fpop">
      <div className="fglass rounded-[20px] p-4">
        <div className="frow justify-between">
          <span className="fmono text-[8.5px] font-bold" style={{ color: "var(--fink3)" }}>{inc.id}</span>
          <button aria-label="Close" onClick={onClose} className="fpress text-[14px] leading-none" style={{ color: "var(--fink3)" }}>×</button>
        </div>
        <div className="frow mt-1 items-start justify-between gap-2">
          <p className="fserif text-[18px] font-semibold leading-tight">{inc.title}</p>
          <span className="fdot mt-1.5" style={{ background: inkHex(inc) }} />
        </div>
        <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--fink2)" }}>{inc.location_label}</p>
        <div className="frow mt-2.5 gap-4 border-t pt-2.5" style={{ borderColor: "var(--fgb)" }}>
          {[
            ["Observations", inc.observation_count],
            ["Contributors", inc.contributor_count],
            ["Images", inc.image_count],
          ].map(([l, n]) => (
            <div key={l as string}>
              <p className="fserif text-[17px] font-semibold leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{n}</p>
              <p className="fmono mt-0.5 text-[7.5px]" style={{ color: "var(--fink3)" }}>{l}</p>
            </div>
          ))}
          <span className="fbadge ml-auto mt-0.5" style={{ borderColor: inkHex(inc), color: inkHex(inc) }}>
            {inc.status_label}
          </span>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-4" style={{ color: "var(--fink2)" }}>{inc.summary}</p>
        <div className="frow mt-3 gap-2">
          <button
            onClick={onComplaint}
            className="fpress flex-1 border py-2.5 text-[11px] font-bold"
            style={{ background: "var(--fink)", borderColor: "var(--fink)", color: "var(--fpanel)" }}
          >
            Draft GHMC complaint
          </button>
          {canVerify ? (
            <button
              onClick={onVerify}
              className="fpress flex-1 border py-2.5 text-[11px] font-bold"
              style={{ background: "var(--facc)", borderColor: "var(--facc)", color: "var(--fpanel)" }}
            >
              Verify this repair
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== *
 * Verify modal — before/after with honest outcomes.
 * ==================================================================== */
function VerifyModal({
  inc,
  onClose,
  say,
}: {
  inc: Incident;
  onClose: () => void;
  say: (m: string) => void;
}) {
  const [samples, setSamples] = useState<AfterSample[]>([]);
  const [sample, setSample] = useState<AfterSample | null>(null);
  const [scanning, setScanning] = useState(false);
  const [verdict, setVerdict] = useState<Verification | null>(null);

  useEffect(() => {
    if (inc.status !== "resolved" && inc.status !== "resolution_verified") return;
    let alive = true;
    fetchAfterSamples("res-3")
      .then((s) => alive && setSamples(s))
      .catch(() => alive && setSamples([]));
    return () => {
      alive = false;
    };
  }, [inc]);

  async function run() {
    if (!sample) return;
    setScanning(true);
    try {
      const v = await verifyResolution("res-3", {
        after_image_data: null,
        sample_id: sample.id,
        latitude: null,
        longitude: null,
      });
      setVerdict(v);
    } catch {
      say("Verification unavailable");
    }
    setScanning(false);
  }

  return (
    <div className="absolute inset-0 z-[75] fpop" style={{ background: "rgba(20,18,16,.4)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}>
      <div className="fglass absolute inset-x-2.5 bottom-[90px] rounded-[22px] p-4">
        <div className="frow justify-between">
          <p className="fmono text-[8.5px] font-bold" style={{ color: "var(--fink3)" }}>Before / after verification</p>
          <button aria-label="Close" onClick={onClose} className="fpress text-[15px] leading-none" style={{ color: "var(--fink3)" }}>×</button>
        </div>
        <p className="fserif mt-1 text-[16px] font-semibold">{inc.title} · {inc.id}</p>

        <div className="frow mt-3 gap-2">
          <div className="flex-1">
            <p className="fmono text-[7.5px] font-bold" style={{ color: "var(--fink3)" }}>Before</p>
            <div className="mt-1 h-20 border" style={{ borderColor: "var(--frule2)", background: "var(--fwell)" }} />
          </div>
          <div className="flex-1">
            <p className="fmono text-[7.5px] font-bold" style={{ color: "var(--fink3)" }}>After (capture)</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {samples.map((s) => (
                <button key={s.id} onClick={() => setSample(s)} className="fpress border" style={{ borderColor: sample?.id === s.id ? "var(--facc)" : "var(--frule2)", borderWidth: 2 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image_uri} alt={s.label} className="h-[38px] w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <p className="fmono text-[7.5px] font-bold" style={{ color: "var(--fink3)" }}>Verdict</p>
            <div className="mt-1 grid h-20 place-items-center border" style={{ borderColor: "var(--frule2)", background: "var(--fwell)" }}>
              {scanning ? (
                <div className="fscan h-1.5 w-3/4" style={{ background: "var(--faccw)" }} />
              ) : verdict ? (
                <div className="text-center">
                  <p className="fserif text-[12px] font-bold" style={{ color: verdict.result === "verified" ? "var(--fok)" : verdict.result === "issue_present" ? "var(--falert)" : "var(--fhold)" }}>
                    {verdict.result === "verified" ? "Repair verified" : verdict.result === "issue_present" ? "Issue still present" : "Needs review"}
                  </p>
                  <p className="fmono mt-0.5 text-[7px]" style={{ color: "var(--fink3)" }}>
                    {verdict.location_match ? "location match" : "location differs"}{verdict.visual_match != null ? ` · ${Math.round(verdict.visual_match * 100)}% visual` : ""}
                  </p>
                </div>
              ) : (
                <p className="text-[10px]" style={{ color: "var(--fink3)" }}>Awaiting capture</p>
              )}
            </div>
          </div>
        </div>

        {verdict ? (
          <div className="mt-2.5 space-y-0.5 border-t pt-2.5" style={{ borderColor: "var(--fgb)" }}>
            {verdict.rationale.map((r) => (
              <p key={r} className="text-[10.5px] leading-4" style={{ color: "var(--fink2)" }}>· {r}</p>
            ))}
          </div>
        ) : null}

        <button
          onClick={run}
          disabled={!sample || scanning}
          className="fpress mt-3 w-full border py-2.5 text-[11.5px] font-bold"
          style={{
            background: !sample || scanning ? "var(--fwell)" : "var(--facc)",
            borderColor: "var(--facc)",
            color: !sample || scanning ? "var(--fink3)" : "var(--fpanel)",
          }}
        >
          {scanning ? "Scanning the scene…" : "Run before/after scan"}
        </button>
      </div>
    </div>
  );
}

/* ==================================================================== *
 * GHMC complaint modal — draft, then simulated submission.
 * ==================================================================== */
function ComplaintModal({ inc, onClose, say }: { inc: Incident; onClose: () => void; say: (m: string) => void }) {
  const [draft, setDraft] = useState<Complaint | null>(null);
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    createComplaint(inc.id)
      .then((c) => alive && setDraft(c))
      .catch(() => alive && say("Draft generation unavailable"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inc.id]);

  async function submitDemo() {
    if (!draft) return;
    setBusy(true);
    try {
      const r = await submitComplaintDemo(draft.id);
      setRef(r.demo_reference);
      say(`Prototype submission created · ${r.demo_reference}`);
    } catch {
      say("Submission failed");
    }
    setBusy(false);
  }

  return (
    <div className="absolute inset-0 z-[75] fpop" style={{ background: "rgba(20,18,16,.4)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}>
      <div className="fglass absolute inset-x-2.5 bottom-[90px] max-h-[70%] overflow-y-auto nosb rounded-[22px] p-4">
        <div className="frow justify-between">
          <p className="fmono text-[8.5px] font-bold" style={{ color: "var(--fink3)" }}>GHMC complaint draft</p>
          <button aria-label="Close" onClick={onClose} className="fpress text-[15px] leading-none" style={{ color: "var(--fink3)" }}>×</button>
        </div>
        {draft ? (
          <>
            <div className="mt-2 space-y-1.5">
              {[
                ["Issue", draft.issue],
                ["Location", draft.location],
                ["Severity / context", draft.severity_context],
                ["Recommended department", draft.department],
                ["Evidence refs", draft.evidence_refs.join(", ")],
              ].map(([l, v]) => (
                <div key={l} className="frow justify-between gap-3 border-b pb-1.5" style={{ borderColor: "var(--fgb)" }}>
                  <span className="fmono shrink-0 text-[8px] font-bold" style={{ color: "var(--fink3)" }}>{l}</span>
                  <span className="text-right text-[11px] leading-4">{v}</span>
                </div>
              ))}
            </div>
            <p className="fmono mt-2 text-[7.5px] leading-3.5" style={{ color: "var(--fink3)" }}>
              {draft.description}
            </p>
            {ref ? (
              <div className="fplate mt-3 p-3 text-center">
                <p className="fserif text-[13px] font-bold" style={{ color: "var(--fok)" }}>Prototype submission created</p>
                <p className="fmono mt-0.5 text-[9px] font-bold" style={{ color: "var(--fink2)" }}>Ref {ref}</p>
                <p className="mt-1 text-[9.5px]" style={{ color: "var(--fink3)" }}>
                  Demo connector only. No real GHMC complaint was filed.
                </p>
              </div>
            ) : (
              <button
                onClick={submitDemo}
                disabled={busy}
                className="fpress mt-3 w-full border py-2.5 text-[11.5px] font-bold"
                style={{ background: "var(--fink)", borderColor: "var(--fink)", color: "var(--fpanel)" }}
              >
                {busy ? "Submitting…" : "Submit to GHMC (demo)"}
              </button>
            )}
          </>
        ) : (
          <div className="mt-3">
            <p className="fserif text-[13.5px] font-semibold">Drafting the complaint…</p>
            <div className="fscan mt-2 h-1.5" style={{ background: "var(--fwell)" }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================================================================== *
 * Small line glyphs (status bar, top bar, FAB) — same 1.5px language.
 * ==================================================================== */
function IconSig() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
      <rect x="0" y="7" width="3" height="4" rx="0.5" />
      <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" />
      <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
    </svg>
  );
}
function IconWifi() {
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <path d="M1 3.5a9.5 9.5 0 0 1 13 0" />
      <path d="M3.4 6a6 6 0 0 1 8.2 0" />
      <path d="M5.8 8.4a2.8 2.8 0 0 1 3.4 0" />
    </svg>
  );
}
function IconBatt() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.4" />
      <rect x="2" y="2" width="15" height="8" rx="1.8" fill="currentColor" />
      <path d="M23.5 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.5 13.5 3.5 3.5" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden>
      <path d="M10 3a5 5 0 0 1 5 5v3.5l1.5 2.5H3.5L5 11.5V8a5 5 0 0 1 5-5z" />
      <path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}
function IconPlus({ open }: { open: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      style={{ transform: open ? "rotate(45deg)" : "none", transition: "transform .3s var(--fspring)" }}
      aria-hidden
    >
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

/* ==================================================================== *
 * Dock glyphs — same surveyor line language as the app.
 * ==================================================================== */
function DockGlyph({ k }: { k: Screen }) {
  const p = { width: 17, height: 17, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "square" as const };
  switch (k) {
    case "home":
      return (
        <svg {...p} aria-hidden>
          <path d="M3.5 9.5 10 3.5l6.5 6v7h-13z" />
          <path d="M7.5 16.5v-5h5v5" />
        </svg>
      );
    case "map":
      return (
        <svg {...p} aria-hidden>
          <path d="M2.5 5.5 7 3.5l6 2 4.5-2v11L13 16.5l-6-2-4.5 2z" />
          <path d="M7 3.5v11M13 5.5v11" />
        </svg>
      );
    case "report":
      return (
        <svg {...p} aria-hidden>
          <rect x="2.5" y="5.5" width="15" height="11" />
          <path d="M6.5 5.5 8 3h4l1.5 2.5" />
          <circle cx="10" cy="11" r="3" />
        </svg>
      );
    case "reports":
      return (
        <svg {...p} aria-hidden>
          <rect x="4" y="3" width="12" height="14" />
          <path d="M7 7h6M7 10h6M7 13h4" />
        </svg>
      );
    case "alerts":
      return (
        <svg {...p} aria-hidden>
          <path d="M10 3a5 5 0 0 1 5 5v3.5l1.5 2.5H3.5L5 11.5V8a5 5 0 0 1 5-5z" />
          <path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" />
        </svg>
      );
    case "settings":
      return (
        <svg {...p} aria-hidden>
          <circle cx="10" cy="10" r="2.5" />
          <path d="M10 2.5v2.5M10 15v2.5M17.5 10H15M5 10H2.5M15.3 4.7l-1.8 1.8M6.5 13.5l-1.8 1.8M15.3 15.3l-1.8-1.8M6.5 6.5 4.7 4.7" />
        </svg>
      );
  }
}
