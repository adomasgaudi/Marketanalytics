"use client";

import { Kpi, KpiGrid } from "@/components/ui/card";
import { Pill, PillRow } from "@/components/ui/pills";
import { fmtEur, fmtEurFull, fmtInt } from "./format";
import { marketTotals, medianSalary } from "./metrics";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";
import { YearRow } from "./YearRow";

const BASIS_OPTIONS = [
  { value: "total", label: "Whole market" },
  { value: "emp", label: "Per employee" },
] as const;

export function MarketsView({ model }: { model: MarketModel }) {
  const [{ year, basis }, setParams] = useDashboardParams(model.last);

  // Derived from the selected year, never stored: React recomputes these on
  // render, so there is no cached aggregate that can fall out of sync.
  const totals = marketTotals(model.rows, year);
  const salary = medianSalary(model.rows, year);
  const perEmployee = basis === "emp" && totals.employees > 0;
  const scale = (value: number) => (perEmployee ? value / totals.employees : value);

  return (
    <section id="markets" className="mb-7">
      <h1 className="mt-7 mb-3.5 text-[18px] font-bold">Market data {year}</h1>

      <YearRow years={model.finYears} defaultYear={model.last} />

      <PillRow label="Basis" className="mb-3.5">
        {BASIS_OPTIONS.map((option) => (
          <Pill
            key={option.value}
            selected={basis === option.value}
            onClick={() => setParams({ basis: option.value })}
          >
            {option.label}
          </Pill>
        ))}
      </PillRow>

      <KpiGrid>
        <Kpi label="Companies" value={fmtInt(totals.count)} />
        <Kpi
          label="Revenue"
          value={fmtEur(scale(totals.revenue))}
          sub={perEmployee ? "per employee" : undefined}
        />
        <Kpi
          label="Profit"
          value={fmtEur(scale(totals.profit))}
          sub={perEmployee ? "per employee" : undefined}
        />
        <Kpi label="Employees" value={fmtInt(totals.employees)} />
        {/* Full amount, not compacted — "€3k" would hide the salary's real figure. */}
        <Kpi label="Median salary" value={fmtEurFull(salary)} sub="per month" />
      </KpiGrid>
    </section>
  );
}
