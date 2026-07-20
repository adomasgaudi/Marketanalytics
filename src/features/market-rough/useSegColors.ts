"use client";

import { useEffect, useState } from "react";
import {
  CMP_PAL_DARK,
  CMP_PAL_LIGHT,
  SEG_COLORS_DARK,
  SEG_COLORS_LIGHT,
} from "./segments";

/** True when the dark theme attribute is on <html>. Shared by the colour hooks. */
function useDarkTheme(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.getAttribute("data-theme") === "dark");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** Theme-correct compare palette; use instead of the static cmpColor(). */
export function useCmpColor(): (i: number) => string {
  const dark = useDarkTheme();
  const pal = dark ? CMP_PAL_DARK : CMP_PAL_LIGHT;
  return (i: number) => pal[i % pal.length];
}

/**
 * Live segment palette. The light and dark sets are separately validated
 * (see segments.ts), so charts must re-read on a theme change rather than
 * reusing one set for both surfaces.
 *
 * Starts on the light set so SSR and first client render agree — no hydration
 * mismatch — then corrects in an effect. A MutationObserver on <html>'s
 * data-theme keeps canvas charts in step with the settings toggle, which
 * mutates the attribute without any React state change.
 */
export function useSegColors(): Record<string, string> {
  return useDarkTheme() ? SEG_COLORS_DARK : SEG_COLORS_LIGHT;
}
