"use client";

/**
 * Mobile settings sheet — includes the light/dark survey toggle, backed by
 * the shared global theme hook so it stays in sync with every other toggle.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMe, useApi } from "@/lib/api";
import { Stamp, cn } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/lib/useTheme";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-0.5 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] leading-4 text-ink-faint">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Switch({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "press-mobile relative h-7 w-12 shrink-0 border border-ink transition-colors duration-200",
        checked ? "bg-ink" : "bg-well"
      )}
    >
      <span
        className="absolute top-1/2 h-5 w-5 -translate-y-1/2 border border-ink bg-panel transition-all duration-200"
        style={{ left: checked ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

export default function MobileSettings() {
  const { data: me } = useApi(fetchMe, []);
  const { theme, setTheme } = useTheme();
  const [haptics, setHaptics] = useState(true);

  useEffect(() => {
    setHaptics(localStorage.getItem("civicos-haptics") !== "off");
  }, []);

  return (
    <div className="px-3 pb-8 pt-4">
      <p className="font-data text-[9.5px] font-medium uppercase tracking-[0.26em] text-ink-faint">Preferences</p>
      <h1 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.012em] text-ink">Settings</h1>

      {/* Profile */}
      <section className="plate mt-4 flex items-center gap-3.5 p-4">
        <Avatar
          src={me?.user.avatar_uri}
          name={me?.user.name}
          initials={me?.user.initials ?? "·"}
          className="flex h-11 w-11 items-center justify-center border border-accent/50 bg-accent-wash object-cover font-data text-[13px] font-semibold text-accent"
        />
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink">{me?.user.name ?? "—"}</p>
          <p className="truncate text-[11.5px] text-ink-faint">{me?.user.email ?? ""}</p>
          <p className="mt-0.5 font-data text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">
            {me?.user.area ?? ""}
          </p>
        </div>
        {me?.demo_mode ? (
          <Stamp tone="accent" className="ml-auto shrink-0">
            Demo
          </Stamp>
        ) : null}
      </section>

      <section className="plate mt-3 px-3.5 py-1" aria-label="Display">
        <div className="divide-y divide-rule">
          <Row label="Night survey" hint="Ink ground, paper text. Same records, different light.">
            <Switch checked={theme === "dark"} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} label="Night survey theme" />
          </Row>
          <Row label="Tactile feedback" hint="A short buzz on confirmations and errors.">
            <Switch
              checked={haptics}
              onToggle={() => {
                const next = !haptics;
                setHaptics(next);
                localStorage.setItem("civicos-haptics", next ? "on" : "off");
                try {
                  if (next && "vibrate" in navigator) navigator.vibrate(15);
                } catch {
                  /* ignore */
                }
              }}
              label="Tactile feedback"
            />
          </Row>
        </div>
      </section>

      <section className="plate mt-3 px-3.5 py-1" aria-label="Legal">
        <div className="divide-y divide-rule">
          <Row label="Terms of service" hint="Prototype status and acceptable use.">
            <Link href="/legal/terms" className="press-mobile font-data text-[10px] uppercase tracking-[0.12em] text-accent">
              Read
            </Link>
          </Row>
          <Row label="Privacy policy" hint="What the survey stores and why.">
            <Link href="/legal/privacy" className="press-mobile font-data text-[10px] uppercase tracking-[0.12em] text-accent">
              Read
            </Link>
          </Row>
        </div>
      </section>

      <p className="mt-4 font-data text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
        CIVICOS · Prototype build · Hyderabad demo
      </p>
    </div>
  );
}
