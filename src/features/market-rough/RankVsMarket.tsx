"use client";

import { type BarRow, BarsSvg } from "./BarsSvg";
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
  year,
  perEmployee,
}: {
  model: MarketModel;
  brand: string;
  year: number;
  perEmployee: boolean;
}) {
  const row = model.byBrand[brand]?.[year];
  const partialYear = year > model.last;

  const pe = (metric: (r: CompanyYear) => number | null) => (candidate: CompanyYear) => {
    const value = metric(candidate);
    if (!perEmployee) return value;
    const staff = candidate.employees ?? 0;
    return value != null && staff > 0 ? value / staff : null;
  };
  const rk = (metric: (r: CompanyYear) => number | null) =>
    rankOf(model.rows, year, row, metric);

  const specs: { label: string; rank: Rank | null }[] = [
    { label: "Revenue", rank: rk(pe((r) => r.estimatedIncome)) },
    { label: "Turnover", rank: rk(pe((r) => r.revenue)) },
    { label: "Net profit", rank: rk(pe((r) => r.profit)) },
    { label: "Profit margin", rank: rk(margin) },
    ...(perEmployee || partialYear
      ? []
      : [{ label: "Employees", rank: rk((r) => r.employees) }]),
    ...(partialYear
      ? []
      : [
          {
            label: "Avg salary",
            rank: rk((r) => ((r.avgSalary ?? 0) > 500 ? r.avgSalary : null)),
          },
        ]),
  ];

  const withRank = specs.filter((s) => s.rank != null);
  if (!withRank.length) return null;

  const ranks = new Map(withRank.map((s) => [s.label, s.rank!]));
  const bars: BarRow[] = withRank.map((s) => ({
    label: s.label,
    value: s.rank!.pct,
    color: s.rank!.pct >= 50 ? "var(--color-gold)" : "var(--color-muted)",
  }));

  // Legacy: chart box grows with the row count — max(200, 44 + rows*32).
  const height = Math.max(200, 44 + bars.length * 32);

  return (
    <div className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h3 className="mb-2 text-[15px] font-semibold">
        {brand} vs the market ({year}
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
