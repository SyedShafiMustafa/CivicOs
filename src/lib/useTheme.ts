"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Global theme state — one storage key ("civicos-theme"), one <html> attribute
 * ([data-theme="dark"]), used by the desktop top bar, desktop settings, the
 * mobile shell and the mobile settings sheet.
 *
 * - Applies the attribute during the first render effect (post-hydration; the
 *   inline boot script in layout.tsx has already set it pre-paint, so there is
 *   no flash either way).
 * - Adds .theme-swap for one frame so colors cross-fade instead of snapping.
 * - Syncs across tabs via the storage event.
 */

export type Theme = "light" | "dark";

const KEY = "civicos-theme";

function readStored(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setTheme(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const apply = useCallback((t: Theme) => {
    const root = document.documentElement;
    root.classList.add("theme-swap");
    root.setAttribute("data-theme", t === "dark" ? "dark" : "");
    window.setTimeout(() => root.classList.remove("theme-swap"), 320);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable; theme still applies for the session */
    }
    setTheme(t);
  }, []);

  const toggle = useCallback(() => apply(readStored() === "dark" ? "light" : "dark"), [apply]);

  return { theme, setTheme: apply, toggle };
}
