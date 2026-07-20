"use client";

import { useEffect, useState } from "react";
import {
  CMP_PAL_DARK,
  CMP_PAL_LIGHT,
  SEG_COLORS_DARK,
  SEG_COLORS_HARMONY_DARK,
  SEG_COLORS_HARMONY_LIGHT,
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
 * Live segment palette — four sets, picked by theme × palette choice. Each is
 * separately validated against its own surface (see segments.ts), so charts
 * re-read on a change rather than reusing one set everywhere.
 *
 * data-seg-palette is absent by default, which means "harmony"; the settings
 * menu writes "spectral" to switch back to the original set.
 */
export function useSegColors(): Record<string, string> {
  const dark = useDarkTheme();
  const spectral = useRootAttr("data-seg-palette", null) === "spectral";
  if (spectral) return dark ? SEG_COLORS_DARK : SEG_COLORS_LIGHT;
  return dark ? SEG_COLORS_HARMONY_DARK : SEG_COLORS_HARMONY_LIGHT;
}
