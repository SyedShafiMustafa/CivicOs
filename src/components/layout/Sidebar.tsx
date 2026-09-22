"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchMe, fetchNotifications, useApi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import {
  GlyphOverview,
  GlyphMap,
  GlyphCamera,
  GlyphLedger,
  GlyphBell,
  GlyphImpact,
  GlyphSettings,
  GlyphShield,
  GlyphLogomark,
} from "@/lib/glyphs";

const NAV = [
  { href: "/", label: "Overview", glyph: GlyphOverview },
  { href: "/map", label: "Civic Map", glyph: GlyphMap },
  { href: "/report", label: "File a report", glyph: GlyphCamera },
  { href: "/reports", label: "My reports", glyph: GlyphLedger },
  { href: "/alerts", label: "Alerts", glyph: GlyphBell, badge: true },
  { href: "/impact", label: "My impact", glyph: GlyphImpact },
  { href: "/settings", label: "Settings", glyph: GlyphSettings },
];

export default function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: notifications } = useApi(fetchNotifications, []);
  const { data: me } = useApi(fetchMe, []);
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-rule-strong bg-panel",
        className
      )}
    >
      {/* Logotype */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-rule-strong bg-panel px-5">
        <span className="text-accent">
          <GlyphLogomark className="h-7 w-7" />
        </span>
        <div className="leading-tight">
          <div className="font-display text-[17px] font-bold leading-none tracking-[-0.008em] text-ink">CIVICOS</div>
          <div className="mt-1 font-data text-[9px] font-medium uppercase tracking-[0.26em] text-ink-faint">
            Field survey network
          </div>
        </div>
      </div>

      {/* Nav — a table of contents */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scroll-thin">
        <p className="mb-3 px-2 font-data text-[9.5px] font-medium uppercase tracking-[0.26em] text-ink-faint">
          Survey sections
        </p>
        <ul className="space-y-0.5">
          {NAV.map((item, i) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Glyph = item.glyph;
            if (item.href === "/report") {
              return (
                <li key={item.href} className="py-2">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "btn-press flex h-10 items-center justify-center gap-2 border text-[13px] font-semibold",
                      active
                        ? "border-ink bg-accent text-panel"
                        : "border-ink bg-ink text-panel shadow-[3px_3px_0_0_var(--rule-strong)] hover:bg-accent hover:border-accent hover:shadow-[3px_3px_0_0_var(--accent-wash)]"
                    )}
                  >
                    <Glyph className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex h-9 items-center gap-2.5 px-2.5 text-[13px] transition-colors",
                    active
                      ? "bg-accent-wash font-semibold text-ink"
                      : "text-ink-soft hover:bg-well hover:text-ink"
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-4.5 w-[3px] -translate-y-1/2 bg-accent"
                    />
                  ) : null}
                  <span className={cn(
                    "w-4 text-center font-data text-[10px] tabular",
                    active ? "text-accent" : "text-ink-faint/70"
                  )}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Glyph className={cn(
                    "h-[15px] w-[15px] transition-colors",
                    active ? "text-accent" : "text-ink-faint group-hover:text-ink"
                 )} />
                  <span className="tracking-[0.005em]">{item.label}</span>
                  {item.badge && unread > 0 ? (
                    <span className="ml-auto border border-alert/40 bg-alert-wash px-1.5 font-data text-[10px] font-semibold leading-4 text-alert tabular shadow-[1.5px_1.5px_0_0_var(--alert-wash)]">
                      {unread}
                    </span>
 ) : null}
                  {active ? (
                    <span aria-hidden="true" className="ml-auto font-data text-[11px] leading-none text-accent">
                      ◂
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Registration footer */}
      <div className="shrink-0 border-t border-rule-strong bg-panel px-4 py-3.5">
        <Link
          href="/ops"
          onClick={onNavigate}
          className="group -mx-1 flex items-center gap-2 px-2 py-2 text-xs font-medium text-ink-faint transition-colors hover:bg-well hover:text-ink"
        >
          <GlyphShield className="h-3.5 w-3.5 transition-colors group-hover:text-hold" />
          Ops console
          <span className="ml-auto border border-hold/40 bg-hold-wash px-1.5 py-px font-data text-[9px] font-semibold uppercase tracking-[0.16em] text-hold">
            Demo
          </span>
        </Link>
        <div className="mt-3 flex items-center gap-2.5 border-t border-rule pt-3.5">          <Avatar
            src={me?.user.avatar_uri}
            name={me?.user.name}
            initials={me?.user.initials ?? "·"}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-accent/50 bg-accent-wash object-cover font-data text-[11px] font-semibold tracking-wide text-accent shadow-[1.5px_1.5px_0_0_var(--accent-wash)]"
          />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-medium tracking-[0.005em] text-ink">{me?.user.name ?? "—"}</div>
            <div className="mt-px truncate font-data text-[10px] text-ink-faint">{me?.user.area ?? ""}</div>
          </div>
        </div>
        <p className="mt-3 font-data text-[9px] font-medium uppercase leading-[1.7] tracking-[0.14em] text-ink-faint/90">
          Prototype sheet · v0.1
          <br />
          Deterministic demo data
        </p>
      </div>
    </aside>
  );
}
