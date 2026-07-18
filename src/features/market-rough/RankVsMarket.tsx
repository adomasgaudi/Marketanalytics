"use client";

import { type BarRow, BarsSvg } from "./BarsSvg";
import { cmpColor } from "./CompanySelector";
import { EngTag } from "./SegmentChart";
import { margin, type Rank, rankOf } from "./metrics";
import type { CompanyYear, MarketModel } from "./types";

/**
 * "{brand} vs the market" percentile chart on the drawBarsSvg engine (legacy):
 * one bar per metric, 100 = market top, gold when in the upper half. On partial
 * years (2025+) Employees/Avg-salary are dropped — only ~12 companies report.
 */
export function RankVsMarket({
  model,
  brand,
  brands,
  year,
  perEmployee,
}: {
  model: MarketModel;
  brand: string;
  /** Full compare pool — >1 switches to grouped mode (one bar per company). */
  brands?: string[];
  year: number;
  perEmployee: boolean;
}) {
  const pool = brands?.length ? brands : [brand];
  const grouped = pool.length > 1;
  const row = model.byBrand[brand]?.[year];
  const partialYear = year > model.last;

  const pe = (metric: (r: CompanyYear) => number | null) => (candidate: CompanyYear) => {
    const value = metric(candidate);
    if (!perEmployee) return value;
    const staff = candidate.employees ?? 0;
    return value != null && staff > 0 ? value / staff : null;
  };
  const metricDefs: { label: string; f: (r: CompanyYear) => number | null }[] = [
    { label: "Revenue", f: pe((r) => r.estimatedIncome) },
    { label: "Turnover", f: pe((r) => r.revenue) },
    { label: "Net profit", f: pe((r) => r.profit) },
    { label: "Profit margin", f: margin },
    ...(perEmployee || partialYear
      ? []
      : [{ label: "Employees", f: (r: CompanyYear) => r.employees }]),
    ...(partialYear
      ? []
      : [
          {
            label: "Avg salary",
            f: (r: CompanyYear) => ((r.avgSalary ?? 0) > 500 ? r.avgSalary : null),
          },
        ]),
  ];
  const rankFor = (b: string, f: (r: CompanyYear) => number | null) =>
    rankOf(model.rows, year, model.byBrand[b]?.[year], f);

  // Grouped (>1 company): one bar per company per metric, chip colours.
  const entries = metricDefs.flatMap((m) =>
    (grouped ? pool : [brand]).map((b) => ({
      label: grouped ? `${m.label} — ${b}` : m.label,
      rank: rankFor(b, m.f),
      color: grouped ? cmpColor(pool.indexOf(b)) : undefined,
    })),
  );

  const withRank = entries.filter((s): s is typeof s & { rank: Rank } => s.rank != null);
  if (!withRank.length) return null;

  const ranks = new Map(withRank.map((s) => [s.label, s.rank]));
  const bars: BarRow[] = withRank.map((s) => ({
    label: s.label,
    value: s.rank.pct,
    color: s.color ?? (s.rank.pct >= 50 ? "var(--color-gold)" : "var(--color-muted)"),
  }));

  // Legacy: chart box grows with the row count — 32px/row, 24px grouped.
  const height = Math.max(200, 44 + bars.length * (grouped ? 24 : 32));

  return (
    <div className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h3 className="mb-2 text-[15px] font-semibold">
        {grouped ? "Selected companies" : brand} vs the market ({year}
        {perEmployee ? ", per employee" : ""})
      </h3>
      <div className="chartbox relative" style={{ height }}>
        <EngTag label="SVG" />
        <BarsSvg
          rows={bars}
          fmt={(v) => String(Math.round(v))}
          xTitle={`Percentile vs ${model.brands.length} agencies (100 = top)`}
          tip={(bar) => {
            const r = ranks.get(bar.label)!;
            return `${bar.label}: ${r.pct}th percentile · #${r.pos} of ${r.total}`;
          }}
        />
      </div>
    </div>
  );
}
