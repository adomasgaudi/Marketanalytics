"use client";

import { Kpi, KpiGrid } from "@/components/ui/card";
import { Pill, PillRow } from "@/components/ui/pills";
import { CompanySelector } from "./CompanySelector";
import { fmtEur, fmtEurFull, fmtInt, fmtPct } from "./format";
import { margin, rankOf } from "./metrics";
import { RankChip } from "./RankChip";
import type { CompanyYear, MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";
import { YearRow } from "./YearRow";

const BASIS_OPTIONS = [
  { value: "total", label: "Full company" },
  { value: "emp", label: "Per employee" },
] as const;

export function CompaniesView({ model }: { model: MarketModel }) {
  const [{ year, basis, companies }, setParams] = useDashboardParams(model.last);

  const brand = companies[0] ?? model.brands[0];
  const row = model.byBrand[brand]?.[year];
  const prev = model.byBrand[brand]?.[year - 1];

  // Per-employee divides every money figure by headcount, so the same company
  // can be compared against a peer ten times its size. Headcount itself is the
  // denominator, so it stops being a ranking metric in this mode.
  const perEmployee = basis === "emp";
  const per = (metric: (row: CompanyYear) => number | null) =>
    perEmployee
      ? (candidate: CompanyYear) => {
          const value = metric(candidate);
          const staff = candidate.employees ?? 0;
          return value != null && staff > 0 ? value / staff : null;
        }
      : metric;

  const rank = (metric: (row: CompanyYear) => number | null) =>
    rankOf(model.rows, year, row, per(metric));

  const revenue = rank((r) => r.estimatedIncome);
  const turnover = rank((r) => r.revenue);
  const profit = rank((r) => r.profit);
  const employees = perEmployee
    ? null
    : rankOf(model.rows, year, row, (r) => r.employees);
  // Salary is already a per-head ratio, so the basis toggle must not divide it again.
  const salary = rankOf(model.rows, year, row, (r) =>
    (r.avgSalary ?? 0) > 500 ? r.avgSalary : null,
  );
  const profitMargin = rankOf(model.rows, year, row, margin);

  // Year-over-year on the selected year, not a growth rate anchored to 2019 —
  // it must agree with the change shown on every other card.
  const yoy =
    row?.revenue != null && (prev?.revenue ?? 0) > 0
      ? row.revenue / (prev!.revenue as number) - 1
      : null;

  return (
    <section id="companies" className="mb-7">
      <h1 className="mt-7 mb-3.5 text-[18px] font-bold">{brand}</h1>

      <CompanySelector
        brands={model.brands}
        selected={brand}
        onSelect={(next) => setParams({ companies: [next] })}
      />

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

      {!row ? (
        <p className="text-muted border-line bg-panel2 rounded-lg border p-4 text-sm">
          {brand} has no {year} filing.
        </p>
      ) : (
        <KpiGrid>
          <Kpi
            label="Revenue"
            value={fmtEur(revenue?.value)}
            sub={<RankChip rank={revenue} />}
          />
          <Kpi
            label="Turnover"
            value={fmtEur(turnover?.value)}
            sub={yoy == null ? <RankChip rank={turnover} /> : `${fmtPct(yoy)} YoY`}
          />
          <Kpi
            label="Net profit"
            value={fmtEur(profit?.value)}
            sub={<RankChip rank={profit} />}
          />
          {employees && (
            <Kpi
              label="Employees"
              value={fmtInt(employees.value)}
              sub={<RankChip rank={employees} />}
            />
          )}
          <Kpi
            label="Avg. salary"
            value={fmtEurFull(salary?.value)}
            sub={<RankChip rank={salary} />}
          />
          <Kpi
            label="Profit margin"
            value={profitMargin ? `${profitMargin.value.toFixed(1)}%` : "–"}
            sub={<RankChip rank={profitMargin} />}
          />
        </KpiGrid>
      )}
    </section>
  );
}
