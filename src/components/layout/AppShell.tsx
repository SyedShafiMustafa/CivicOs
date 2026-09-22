"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileShell from "@/components/mobile/MobileShell";

/**
 * App shell: desktop keeps the sidebar + top bar (lg and up). Below lg the
 * MobileShell takes over (glass top bar, dock, FAB) and renders the same
 * children — one mount, two presentations. The /mobile route renders its own
 * framed shell and marks <html data-framed-mobile>; the ambient shell then
 * renders children bare (no dock, no glass bar) so chrome is not doubled.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [framed, setFramed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setFramed(el.hasAttribute("data-framed-mobile")));
    obs.observe(el, { attributes: true, attributeFilter: ["data-framed-mobile"] });
    setFramed(el.hasAttribute("data-framed-mobile"));
    return () => obs.disconnect();
  }, []);

  if (framed) return <main>{children}</main>;

  return (
    <MobileShell>
      {isDesktop ? (
        <div className="min-h-screen">
          <Sidebar className="hidden lg:flex" />
          {mobileOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-ink/45" onClick={() => setMobileOpen(false)} />
              <Sidebar className="flex border-r-2 border-ink" onNavigate={() => setMobileOpen(false)} />
            </div>
          ) : null}
          <div className="lg:pl-60">
            <TopBar onMenu={() => setMobileOpen(false)} />
            <main>{children}</main>
          </div>
        </div>
      ) : (
        <main>{children}</main>
      )}
    </MobileShell>
  );
}
