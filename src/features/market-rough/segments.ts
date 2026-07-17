import type { CompanyYear } from "./types";

/** Segment colours (classic palette), keyed by the LT data keys. */
export const SEG_COLORS: Record<string, string> = {
  Media: "#4f8ef7",
  "Digital media": "#34c98e",
  Kūryba: "#f0b04f",
  PR: "#a78bfa",
  "Production house": "#f06a6a",
  BTL: "#5dd0d6",
  PA: "#e58fc5",
  Konsultantai: "#9aa56b",
  Renginiai: "#c9a26b",
};

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
