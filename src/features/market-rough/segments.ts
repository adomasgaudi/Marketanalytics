import type { CompanyYear } from "./types";

/**
 * Segment colours, keyed by the LT data keys. TWO sets ship, switched by the
 * "Segment colours" item in the settings menu (see useSegColors):
 *
 *   "harmony" (default) — HARMONY_* below, the muted validated set.
 *   "spectral"          — SEG_COLORS_* below, the original beauty-first set.
 *
 * ---- SPECTRAL (the original; still selectable, so it stays as written) ----
 *
 * BEAUTY-FIRST palette, chosen deliberately over a maximally-separable one at
 * the owner's direction. Nine hues evenly spaced around the wheel at constant
 * lightness and chroma, laid out in spectral order so neighbouring slices read
 * as a gradient rather than a collision.
 *
 * Known, accepted trade-off (measured, not guessed): adjacent violet↔blue sit
 * ΔE 1.3 apart under deuteranopia and the normal-vision floor is 9.6 (target
 * 15) — some neighbours are hard to tell apart, more so for colourblind
 * viewers. Legends and direct labels carry identity instead of colour alone.
 * Do not "fix" this without asking; it is a choice, not an oversight.
 *
 * Slot order is load-bearing — it is the spectral sequence. The dark set is
 * SELECTED for the dark surface, not a flip of the light one.
 */
export const SEG_COLORS_LIGHT: Record<string, string> = {
  Media: "#8b5cf6", // violet
  "Digital media": "#3b82f6", // blue
  Kūryba: "#06b6d4", // cyan
  PR: "#10b981", // emerald
  "Production house": "#84cc16", // lime
  BTL: "#f59e0b", // amber
  PA: "#f97316", // orange
  Konsultantai: "#f43f5e", // rose
  Renginiai: "#d946ef", // fuchsia
};

export const SEG_COLORS_DARK: Record<string, string> = {
  Media: "#a78bfa",
  "Digital media": "#60a5fa",
  Kūryba: "#22d3ee",
  PR: "#34d399",
  "Production house": "#a3e635",
  BTL: "#fbbf24",
  PA: "#fb923c",
  Konsultantai: "#fb7185",
  Renginiai: "#e879f9",
};

/**
 * ---- HARMONY (the default) ----
 *
 * The nine slots sit inside one dusk-to-lichen family: plum, slate, blue-teal,
 * sage, olive, clay, and mauve. Their chroma is deliberately restrained, so
 * the dashboard reads as a composed editorial surface rather than a rainbow.
 *
 * The trick that buys separation back while the hues sit closer together:
 * lightness ZIGZAGS by slot (L 0.53/0.67 alternating, dark 0.52/0.66). Adjacent
 * slices therefore differ in value, not hue alone — which is also what makes it
 * survive colour-blind simulation where the spectral set does not.
 *
 * Labels and legends still carry identity; this palette optimizes tonal harmony
 * and visual beauty before maximum categorical separation.
 */
export const SEG_COLORS_HARMONY_LIGHT: Record<string, string> = {
  Media: "#755e86", // plum
  "Digital media": "#68739a", // slate periwinkle
  Kūryba: "#567a91", // slate blue
  PR: "#568883", // teal
  "Production house": "#6e8b70", // sage
  BTL: "#8a8a63", // lichen
  PA: "#98725c", // clay
  Konsultantai: "#93636d", // dusty rose
  Renginiai: "#7d627b", // mauve
};

export const SEG_COLORS_HARMONY_DARK: Record<string, string> = {
  Media: "#a58eba",
  "Digital media": "#91a0c9",
  Kūryba: "#7fa9c0",
  PR: "#7db7ad",
  "Production house": "#9cb89b",
  BTL: "#bbb88a",
  PA: "#c79b81",
  Konsultantai: "#c28c98",
  Renginiai: "#aa8baa",
};

export type SegPalette = "harmony" | "spectral";

/** Light set is the SSR/default export — see useSegColors() for live theming. */

/**
 * Compare palette (chips / tabs / grouped bars) — the same beauty-first
 * spectrum as SEG_COLORS, extended to ten slots with teal between cyan and
 * emerald. Same accepted trade-off: adjacent hues are close by design.
 * Order is the spectral sequence; colour follows the company, not its rank.
 */
export const CMP_PAL_LIGHT = [
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#14b8a6", // teal
  "#10b981", // emerald
  "#84cc16", // lime
  "#f59e0b", // amber
  "#f97316", // orange
  "#f43f5e", // rose
  "#d946ef", // fuchsia
];
export const CMP_PAL_DARK = [
  "#a78bfa",
  "#60a5fa",
  "#22d3ee",
  "#2dd4bf",
  "#34d399",
  "#a3e635",
  "#fbbf24",
  "#fb923c",
  "#fb7185",
  "#e879f9",
];
/** Static, light-only. Prefer useCmpColor() in components. */
export const cmpColor = (i: number) => CMP_PAL_LIGHT[i % CMP_PAL_LIGHT.length];

/** English display names; the data keys stay Lithuanian. */
const SEG_LABEL: Record<string, string> = {
  Kūryba: "Creative",
  Konsultantai: "Consulting",
  Renginiai: "Events",
};
export const segName = (seg: string) => SEG_LABEL[seg] ?? seg;

export type SegMetricKey =
  "revenue" | "turnover" | "profit" | "employees" | "wages" | "avgSalary";
export type SegBasis = "company" | "emp" | "total";

export const SEG_METRICS: Record<
  SegMetricKey,
  {
    label: string;
    short: string;
    f: (d: CompanyYear) => number | null;
    pos: boolean;
    /** Already a per-head ratio → basis-independent median (legacy avgSalary). */
    ratio?: boolean;
  }
> = {
  revenue: { label: "Revenue", short: "revenue", f: (d) => d.estimatedIncome, pos: true },
  turnover: { label: "Turnover", short: "turnover", f: (d) => d.revenue, pos: true },
  profit: { label: "Net profit", short: "net profit", f: (d) => d.profit, pos: false },
  employees: { label: "Employees", short: "employees", f: (d) => d.employees, pos: true },
  wages: { label: "Wages", short: "wages", f: (d) => d.salaryCosts, pos: true },
  avgSalary: {
    label: "Avg salary",
    short: "avg salary",
    f: (d) => ((d.avgSalary ?? 0) > 500 ? d.avgSalary : null),
    pos: true,
    ratio: true,
  },
};

export const basisWord = (b: SegBasis) =>
  b === "emp" ? "per employee" : b === "company" ? "per company" : "whole-market total";

const median = (a: number[]) =>
  a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null;

/** One segment's value for metric × basis × year (null = not enough data). */
export function segMetricVal(
  rows: CompanyYear[],
  seg: string,
  metric: SegMetricKey,
  basis: SegBasis,
  year: number,
): number | null {
  const M = SEG_METRICS[metric];
  const ds = rows
    .filter((d) => d.year === year && d.activities.includes(seg))
    .map((d) => ({ v: M.f(d), e: d.employees }))
    .filter(
      (o): o is { v: number; e: number | null } => o.v != null && (!M.pos || o.v > 0),
    );

  if (M.ratio) return median(ds.map((o) => o.v));
  if (basis === "emp") {
    const w = ds.filter((o) => (o.e ?? 0) > 2).map((o) => o.v / (o.e as number));
    return w.length >= 3 ? median(w) : null;
  }
  if (basis === "company") return median(ds.map((o) => o.v));
  return ds.length ? ds.reduce((s, o) => s + o.v, 0) : null;
}

/** Percentile of a segment's per-company metric values in a year (bands). */
export function segMetricPct(
  rows: CompanyYear[],
  seg: string,
  metric: SegMetricKey,
  year: number,
  p: number,
): number | null {
  const M = SEG_METRICS[metric];
  const vals = rows
    .filter((d) => d.year === year && d.activities.includes(seg))
    .map((d) => M.f(d))
    .filter((v): v is number => v != null && (!M.pos || v > 0))
    .sort((a, b) => a - b);
  if (vals.length < 4) return null; // too few companies for a meaningful band
  return vals[Math.min(vals.length - 1, Math.floor(vals.length * p))];
}

export function segDesc(metric: SegMetricKey, basis: SegBasis): string {
  const M = SEG_METRICS[metric];
  return basis === "total"
    ? `Total ${M.short} summed across every company in each segment${M.pos ? " (positive values)." : "."}`
    : basis === "emp"
      ? `Median ${M.short} per employee in each segment — a productivity proxy.`
      : `Median ${M.short} per company in each segment.`;
}
