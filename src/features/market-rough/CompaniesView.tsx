"use client";

import { useState } from "react";
import { CompanySelector } from "./CompanySelector";
import { fmtEur, fmtEurFull, fmtInt, fmtPct } from "./format";
import { type KpiMode, KpiModeToggle } from "./KpiCard";
import { margin, type Rank, rankOf } from "./metrics";
import { MoneyFlow } from "./MoneyFlow";
import { MoneyFlowByYear } from "./MoneyFlowByYear";
import { RankChip } from "./RankChip";
import { RankVsMarket } from "./RankVsMarket";
import type { CompanyYear, MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

export function useSelectedBrand(model: MarketModel) {
  const [{ companies }, setParams] = useDashboardParams(model.last);
  const brand = companies[0] ?? model.brands[0];
  return { brand, select: (next: string) => setParams({ companies: [next] }) };
}

/** The hoisted company picker, visible on every Financials tab. */
export function CompanyPicker({ model }: { model: MarketModel }) {
  const { brand, select } = useSelectedBrand(model);
  return <CompanySelector brands={model.brands} selected={brand} onSelect={select} />;
}

/** The "Company {year}" panel: money-flow, #/% KPIs with rank chips, vs-market. */
export function CompanyPerYear({ model }: { model: MarketModel }) {
  const [{ year, basis }] = useDashboardParams(model.last);
  const { brand } = useSelectedBrand(model);
  const [kpiMode, setKpiMode] = useState<KpiMode>("value");

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

  const yoy =
    row?.revenue != null && (prev?.revenue ?? 0) > 0
      ? row.revenue / (prev!.revenue as number) - 1
      : null;

  const scaleMoney = (v: number | null) =>
    v == null
      ? null
      : perEmployee
        ? (row?.employees ?? 0) > 0
          ? v / row!.employees!
          : null
        : v;
  const scaleMoneyPrev = (v: number | null | undefined) =>
    v == null
      ? null
      : perEmployee
        ? (prev?.employees ?? 0) > 0
          ? v / prev!.employees!
          : null
        : v;

  if (!row)
    return (
      <p className="text-muted border-line bg-panel2 rounded-lg border p-4 text-sm">
        {brand} has no {year} filing.
      </p>
    );

  const kpi = (
    label: string,
    valueText: string,
    rankData: Rank | null,
    changeText?: string,
  ) => (
    <article className="border-line bg-panel rounded-[10px] border px-[13px] py-[11px]">
      <div className="text-muted text-[11px] tracking-[.05em] uppercase">{label}</div>
      <div className="mt-0.5 text-[21px] font-bold">
        {kpiMode === "change" && changeText ? changeText : valueText}
      </div>
      <div className="text-muted mt-0.5 text-[12px]">
        {changeText && kpiMode === "value" ? changeText : <RankChip rank={rankData} />}
      </div>
    </article>
  );

  return (
    <div>
      <MoneyFlow
        turnover={scaleMoney(row.revenue)}
        revenue={scaleMoney(row.estimatedIncome)}
        profit={scaleMoney(row.profit)}
        prev={
          prev
            ? {
                T: scaleMoneyPrev(prev.revenue),
                R: scaleMoneyPrev(prev.estimatedIncome),
                P: scaleMoneyPrev(prev.profit),
              }
            : {}
        }
        rank={turnover}
      />

      <KpiModeToggle mode={kpiMode} onChange={setKpiMode} />
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
        {kpi("Revenue", fmtEur(revenue?.value), revenue)}
        {kpi(
          "Turnover",
          fmtEur(turnover?.value),
          turnover,
          yoy == null ? undefined : `${fmtPct(yoy)} YoY`,
        )}
        {kpi("Net profit", fmtEur(profit?.value), profit)}
        {employees && kpi("Employees", fmtInt(employees.value), employees)}
        {kpi("Avg. salary", fmtEurFull(salary?.value), salary)}
        {kpi(
          "Profit margin",
          profitMargin ? `${profitMargin.value.toFixed(1)}%` : "–",
          profitMargin,
        )}
      </div>

      <RankVsMarket model={model} brand={brand} year={year} perEmployee={perEmployee} />
    </div>
  );
}

/** The "Company all time" panel: money-flow by year + the deep-dive chart. */
export function CompanyAllTime({ model }: { model: MarketModel }) {
  const { brand } = useSelectedBrand(model);

  return (
    <div>
      <MoneyFlowByYear
        title={`${brand} — money-flow by year`}
        rows={model.finYears
          .map((fy) => model.byBrand[brand]?.[fy])
          .filter((r): r is CompanyYear => r != null && r.revenue != null)
          .map((r) => ({
            year: r.year,
            turnover: r.revenue ?? 0,
            revenue: r.estimatedIncome ?? 0,
            profit: r.profit ?? 0,
          }))}
      />
    </div>
  );
}
