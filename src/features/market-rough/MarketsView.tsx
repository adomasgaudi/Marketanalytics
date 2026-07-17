"use client";

import { Kpi, KpiGrid } from "@/components/ui/card";
import { Pill, PillRow } from "@/components/ui/pills";
import { fmtEur, fmtInt, fmtPct } from "./format";
import { marketTotals, medianSalary } from "./metrics";
import type { MarketModel } from "./types";
import { type MarketMode, useDashboardParams } from "./useDashboardParams";
import { YearRow } from "./YearRow";

/** Legacy basis row: average per company (default), per employee, whole market. */
const MODE_OPTIONS: { value: MarketMode; label: string }[] = [
  { value: "avg", label: "Average / company" },
  { value: "emp", label: "Per employee" },
  { value: "whole", label: "Whole market" },
];

/** Coloured YoY line under a KPI, as on every legacy market card. */
function Delta({ ratio }: { ratio: number | null }) {
  if (ratio == null) return <span>—</span>;
  return (
    <span className={ratio >= 0 ? "text-green" : "text-red"}>{fmtPct(ratio)}</span>
  );
}

export function MarketsView({ model }: { model: MarketModel }) {
  const [{ year, market }, setParams] = useDashboardParams(model.last);

  // Derived from the selected year, never stored: React recomputes these on
  // render, so there is no cached aggregate that can fall out of sync.
  const cur = marketTotals(model.rows, year);
  const prev = marketTotals(model.rows, year - 1);
  const hasPrev = prev.count > 0;

  // Three views of the same money: ÷ companies, ÷ employees, or raw totals.
  const div =
    market === "avg" ? cur.count : market === "emp" ? cur.employees : 1;
  const divPrev =
    market === "avg" ? prev.count : market === "emp" ? prev.employees : 1;
  const scale = (value: number) => (div > 0 ? value / div : 0);
  const scalePrev = (value: number) => (divPrev > 0 ? value / divPrev : 0);
  const yoy = (get: (t: typeof cur) => number) => {
    if (!hasPrev) return null;
    const before = scalePrev(get(prev));
    return before > 0 ? scale(get(cur)) / before - 1 : null;
  };

  // "24→25" range label, as the legacy cards title themselves.
  const yrLabel = hasPrev
    ? `${String(year - 1).slice(2)}→${String(year).slice(2)}`
    : String(year);

  const salary = medianSalary(model.rows, year);
  const salaryPrev = medianSalary(model.rows, year - 1);
  const avgEmployees = cur.count > 0 ? cur.employees / cur.count : 0;
  const avgEmployeesPrev = prev.count > 0 ? prev.employees / prev.count : 0;

  return (
    <section id="markets" className="mb-7">
      <h2 className="mt-7 mb-3.5 text-[18px] font-bold">Market data</h2>

      <YearRow years={model.finYears} defaultYear={model.last} />

      <PillRow label="Basis" className="mb-3.5">
        {MODE_OPTIONS.map((option) => (
          <Pill
            key={option.value}
            selected={market === option.value}
            onClick={() => setParams({ market: option.value })}
          >
            {option.label}
          </Pill>
        ))}
      </PillRow>

      {/* Legacy card order: Revenue, Employees, Salary, Turnover. */}
      <KpiGrid>
        <Kpi
          label={`Revenue ${yrLabel}`}
          value={fmtEur(scale(cur.estimatedIncome))}
          sub={<Delta ratio={yoy((t) => t.estimatedIncome)} />}
        />
        <Kpi
          label={
            market === "avg" ? `Avg employees/co ${yrLabel}` : `Employees ${yrLabel}`
          }
          value={
            market === "avg" ? avgEmployees.toFixed(1) : fmtInt(cur.employees)
          }
          sub={
            <Delta
              ratio={
                market === "avg"
                  ? avgEmployeesPrev > 0
                    ? avgEmployees / avgEmployeesPrev - 1
                    : null
                  : hasPrev && prev.employees > 0
                    ? cur.employees / prev.employees - 1
                    : null
              }
            />
          }
        />
        <Kpi
          label={`Median salary ${yrLabel}`}
          value={salary == null ? "–" : `€${Math.round(salary).toLocaleString()}/mo`}
          sub={
            <Delta
              ratio={
                salary != null && salaryPrev != null && salaryPrev > 0
                  ? salary / salaryPrev - 1
                  : null
              }
            />
          }
        />
        <Kpi
          label={`Turnover ${yrLabel}`}
          value={fmtEur(scale(cur.revenue))}
          sub={<Delta ratio={yoy((t) => t.revenue)} />}
        />
      </KpiGrid>
    </section>
  );
}
