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

/** Numeric hex mix — canvas/SVG safe, where CSS color-mix() is not. */
function mixHex(hex: string, into: string, t: number): string {
  const c = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [c(hex), c(into)];
  return (
    "#" +
    a
      .map((v, i) =>
        Math.round(v + (b[i] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

type SegmentsOf = (brand: string) => string[];

/**
 * Compare colours carry MEANING: a company wears its main segment's colour.
 * Collisions fall through the company's OTHER segments first, then tones of
 * the main colour (lighter, darker, lighter still), and past three of the
 * same colour the index palette steps in so lines never become identical.
 */
export function useCompareColors(segmentsOf: SegmentsOf) {
  const segColors = useSegColors();
  const cmp = useCmpColor();
  return (brands: string[]): Record<string, string> => {
    const taken = new Set<string>();
    const perBase = new Map<string, number>();
    const out: Record<string, string> = {};
    brands.forEach((brand, idx) => {
      const candidates = [
        ...new Set(
          segmentsOf(brand)
            .map((s) => segColors[s])
            .filter(Boolean),
        ),
      ];
      let color = candidates.find((c) => !taken.has(c));
      if (!color) {
        const base = candidates[0];
        const n = base ? (perBase.get(base) ?? 0) : 3;
        const tones = base
          ? [
              mixHex(base, "#ffffff", 0.35),
              mixHex(base, "#000000", 0.35),
              mixHex(base, "#ffffff", 0.6),
            ]
          : [];
        color = tones.find((t) => !taken.has(t)) ?? cmp(idx);
        if (base) perBase.set(base, n + 1);
      }
      taken.add(color);
      if (color === candidates[0]) perBase.set(color, 1);
      out[brand] = color;
    });
    return out;
  };
}
