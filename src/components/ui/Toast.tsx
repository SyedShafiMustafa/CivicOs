"use client";

import { MarkSeal, GlyphClose } from "@/lib/glyphs";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Toast = { id: number; kind: "success" | "error"; text: string };

const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
    // Light haptic tick on real devices when the user opted in.
    try {
      if (localStorage.getItem("civicos-haptics") !== "off" && "vibrate" in navigator) {
        navigator.vibrate(kind === "error" ? [12, 40, 12] : 10);
        }
    } catch {
      /* storage unavailable */
    }
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-28 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-80 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 border px-4 py-3 animate-fade-up",
              t.kind === "success"
                ? "border-accent bg-panel text-ink shadow-[3px_3px_0_0_var(--accent-wash)]"
                : "border-alert bg-panel text-ink shadow-[3px_3px_0_0_var(--alert-wash)]"
            )}
          >
            <span className={cn("mt-0.5 shrink-0 text-[16px]", t.kind === "success" ? "text-accent" : "text-alert")}>
              {t.kind === "success" ? <MarkSeal className="h-4 w-4" /> : <GlyphClose className="h-4 w-4" />}
            </span>
            <p className="text-[13px] leading-5 text-ink-soft">{t.text}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
