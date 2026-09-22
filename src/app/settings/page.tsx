"use client";

import { useState } from "react";
import { fetchMe, useApi } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/lib/useTheme";
import {
  Card,
  ErrorState,
  SectionHead,
  PenField,
  Toggle,
  Stamp,
} from "@/components/ui/primitives";
import MobileSettings from "@/components/mobile/MobileSettings";

function ConnectionCard() {
  const { data: me, error, loading, retry } = useApi(fetchMe, []);

  return (
    <Card>
      <SectionHead title="Connection" sub="Backend and AI mode for this prototype" />
      <div className="space-y-3 border-t border-rule p-5 text-sm">
        {loading ? (
          <>
            <PenField className="w-2/3" />
            <PenField className="w-1/2 opacity-70" />
          </>
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13.5px] font-medium text-ink">CIVICOS API</p>
                <p className="text-xs leading-5 text-ink-faint">FastAPI · deterministic demo store</p>
              </div>
              <Stamp tone="ok">Connected</Stamp>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-rule pt-3">
              <div>
                <p className="text-[13.5px] font-medium text-ink">Vision and language model</p>
                <p className="max-w-md text-xs leading-5 text-ink-faint">
                  {me?.live_ai
                    ? "Live model configured (OPENAI_API_KEY) with demo fallback on failure."
                    : "Demo heuristics: deterministic and fully offline. Add OPENAI_API_KEY in backend/.env for live analysis."}
                </p>
              </div>
              <Stamp tone={me?.live_ai ? "ok" : "hold"}>{me?.live_ai ? "Live" : "Demo"}</Stamp>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { data: me } = useApi(fetchMe, []);
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState({
    nearby: true,
    resolution: true,
    digest: false,
  });

  return (
    <>
      <div className="lg:hidden">
        <MobileSettings />
      </div>
      <div className="mx-auto hidden max-w-[760px] space-y-6 p-4 lg:block lg:p-8">
      <header>
        <p className="font-data text-[10px] uppercase tracking-[0.22em] text-ink-faint">
          Sheet 07 · account
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-ink lg:text-[30px]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Profile and prototype preferences.</p>
        <div className="rule-double mt-4" aria-hidden="true" />
      </header>

      {/* Profile */}
      <Card>
        <SectionHead title="Profile" sub="Demo account. Authentication is not part of this prototype." />
        <div className="flex items-center gap-4 border-t border-rule p-5">
          <Avatar
            src={me?.user.avatar_uri}
            name={me?.user.name}
            initials={me?.user.initials ?? "·"}
            className="flex h-12 w-12 items-center justify-center border border-accent/50 bg-accent-wash object-cover font-data text-sm font-semibold text-accent"
          />
          <div>
            <p className="text-sm font-medium text-ink">{me?.user.name ?? "—"}</p>
            <p className="text-xs text-ink-faint">{me?.user.email ?? ""}</p>
            <p className="mt-0.5 font-data text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">
              Home area: {me?.user.area ?? ""}
            </p>
          </div>
        </div>
      </Card>

      {/* Display */}
      <Card>
        <SectionHead title="Display" sub="Light is for the field; dark is for the evening review." />
        <div className="border-t border-rule px-5">
          <Toggle
            checked={theme === "dark"}
            onChange={(v) => setTheme(v ? "dark" : "light")}
            label="Night survey theme"
            hint="Re-inks every sheet to the night ledger: charcoal paper, cream ink, brightened registration green."
          />
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <SectionHead title="Notifications" sub="Stored locally in this prototype" />
        <div className="divide-y divide-rule border-t border-rule px-5">
          <Toggle
            checked={prefs.nearby}
            onChange={(v) => setPrefs((p) => ({ ...p, nearby: v }))}
            label="Nearby incident alerts"
            hint="Notify me when new observations cluster within 2 km of my area."
          />
          <Toggle
            checked={prefs.resolution}
            onChange={(v) => setPrefs((p) => ({ ...p, resolution: v }))}
            label="Resolution updates"
            hint="Notify me when an incident I contributed to is marked resolved, so I can verify it."
          />
          <Toggle
            checked={prefs.digest}
            onChange={(v) => setPrefs((p) => ({ ...p, digest: v }))}
            label="Weekly neighbourhood digest"
            hint="A quiet weekly summary of what changed around me."
          />
        </div>
      </Card>

      <ConnectionCard />

      {/* About */}
      <Card>
        <SectionHead title="About CIVICOS" />
        <div className="space-y-2 border-t border-rule p-5 text-xs leading-5 text-ink-soft">
          <p>
            <span className="font-semibold text-ink">CIVICOS prototype v0.1.</span> An AI-powered
            civic intelligence platform. Citizen observations are clustered into verified incidents,
            prioritized with explainable factors, routed to departments, and closed only after
            citizen before/after verification.
          </p>
          <p>
            All data is a deterministic demo fixture. No real government system is contacted; GHMC
            submission is simulated behind a future connector interface. See the{" "}
            <a href="/legal/terms" className="text-accent underline underline-offset-2 hover:text-ink">Terms</a>{" "}
            and{" "}
            <a href="/legal/privacy" className="text-accent underline underline-offset-2 hover:text-ink">Privacy Policy</a>.
          </p>
        </div>
      </Card>
      </div>
    </>
  );
}
