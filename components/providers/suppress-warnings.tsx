"use client";

/**
 * Suppresses the React 19 dev warning triggered by next-themes rendering an
 * inline <script> tag from a client component. The script is intentional —
 * it runs during SSR to set the theme class before hydration, preventing a
 * flash of the wrong theme. React 19 doesn't know it runs via SSR and warns.
 *
 * Remove this file once next-themes ships a fix.
 * Tracking: https://github.com/pacocoursey/next-themes/issues
 */

import { useEffect } from "react";

export function SuppressNextThemesWarning() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const original = console.error.bind(console);
    console.error = (...args: Parameters<typeof console.error>) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("script") && msg.includes("React component")) return;
      original(...args);
    };
    return () => {
      console.error = original;
    };
  }, []);

  return null;
}
