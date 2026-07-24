"use client";

import { useEffect, useState } from "react";
import {
  CMP_PAL_DARK,
  CMP_PAL_LIGHT,
  SEG_COLORS_DARK,
  SEG_COLORS_LIGHT,
} from "./segments";

/**
 * Live value of one <html> attribute. Starts at `fallback` so SSR and the first
 * client render agree — no hydration mismatch — then corrects in an effect. The
 * MutationObserver is what keeps canvas charts in step with the settings menu,
 * which mutates the attribute without any React state change.
 */
function useRootAttr(attr: string, fallback: string | null): string | null {
  const [value, setValue] = useState<string | null>(fallback);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setValue(root.getAttribute(attr));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: [attr] });
    return () => observer.disconnect();
  }, [attr]);
  return value;
}

/** True when the dark theme attribute is on <html>. Shared by the colour hooks. */
function useDarkTheme(): boolean {
  return useRootAttr("data-theme", null) === "dark";
}

/** Theme-correct compare palette; use instead of the static cmpColor(). */
export function useCmpColor(): (i: number) => string {
  const dark = useDarkTheme();
  const pal = dark ? CMP_PAL_DARK : CMP_PAL_LIGHT;
  return (i: number) => pal[i % pal.length];
}

/**
 * Live segment palette — the spectral set, in its theme-correct variant. Charts
 * re-read on a theme change rather than reusing one set everywhere.
 */
export function useSegColors(): Record<string, string> {
  const dark = useDarkTheme();
  return dark ? SEG_COLORS_DARK : SEG_COLORS_LIGHT;
}

/** Segment palette for LINE charts. Spectral separates well on thin strokes, so
 *  lines use the same set as the doughnut. */
export function useSegLineColors(): Record<string, string> {
  const dark = useDarkTheme();
  return dark ? SEG_COLORS_DARK : SEG_COLORS_LIGHT;
}
