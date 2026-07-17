"use client";

import { margin, type Rank, rankOf } from "./metrics";
import type { CompanyYear, MarketModel } from "./types";

/**
 * "vs the market" percentile bars: one bar per metric, 100 = market top.
 * Gold when the company sits in the upper half, muted otherwise (legacy rule).
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

  const pe = (metric: (r: CompanyYear) => number | null) => (candidate: CompanyYear) => {
    const value = metric(candidate);
    if (!perEmployee) return value;
    const staff = candidate.employees ?? 0;
    return value != null && staff > 0 ? value / staff : null;
  };

  const specs: { label: string; rank: Rank | null }[] = [
    {
      label: "Revenue",
      rank: rankOf(
        model.rows,
        year,
        row,
        pe((r) => r.estimatedIncome),
      ),
    },
    {
      label: "Turnover",
      rank: rankOf(
        model.rows,
        year,
        row,
        pe((r) => r.revenue),
      ),
    },
    {
      label: "Net profit",
      rank: rankOf(
        model.rows,
        year,
        row,
        pe((r) => r.profit),
      ),
    },
    { label: "Profit margin", rank: rankOf(model.rows, year, row, margin) },
    ...(perEmployee
      ? []
      : [
          { label: "Employees", rank: rankOf(model.rows, year, row, (r) => r.employees) },
        ]),
    {
      label: "Avg salary",
      rank: rankOf(model.rows, year, row, (r) =>
        (r.avgSalary ?? 0) > 500 ? r.avgSalary : null,
      ),
    },
  ];

  const rows = specs.filter((s) => s.rank != null);
  if (!rows.length) return null;

  return (
    <div className="border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h3 className="mb-2 text-[15px] font-semibold">vs the market ({year})</h3>
      <div className="flex flex-col gap-1.5">
        {rows.map(({ label, rank }) => (
          <div key={label} className="flex items-center gap-2 text-[12px]">
            <span className="text-muted w-[92px] flex-none text-right">{label}</span>
            <div className="bg-panel2 h-[18px] flex-1 overflow-hidden rounded-sm">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${Math.max(2, rank!.pct)}%`,
                  background:
                    rank!.pct >= 50 ? "var(--color-gold)" : "var(--color-muted)",
                }}
              />
            </div>
            <span className="w-[110px] flex-none font-semibold">
              {rank!.pct}th · #{rank!.pos} of {rank!.total}
            </span>
          </div>
        ))}
      </div>
      <p className="text-muted mt-2 text-[11px]">
        Percentile vs {model.brands.length} agencies (100 = top)
      </p>
    </div>
  );
}
