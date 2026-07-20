"use client";

import { useState } from "react";
import { fmtEur, fmtInt, fmtPct } from "./format";
import { Insights } from "./Insights";
import { KpiCard, type KpiCardData, type KpiMode, KpiModeToggle } from "./KpiCard";
import { marketTotals, medianSalary } from "./metrics";
import { MoneyFlow } from "./MoneyFlow";
import { MoneyFlowByYear } from "./MoneyFlowByYear";
import { ScatterChart } from "./ScatterChart";
import { ScatterScrub } from "./ScatterScrub";
import { segName } from "./segments";
import { SegmentChart } from "./SegmentChart";
import { SegmentTrends } from "./SegmentTrends";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

/** Tab label for the per-year panel: "Market 2024→2025 · average / company". */
export function marketTabLabel(
  model: MarketModel,
  year: number,
  market: string,
  segment?: string,
) {
  const yrLabel = year - 1 >= model.years[0] ? `${year - 1}→${year}` : String(year);
  const suffix =
    market === "avg" ? " · average / company" : market === "emp" ? " · per employee" : "";
  const scope = segment ? ` · ${segName(segment)}` : "";
  return `Cash flow ${yrLabel}${scope}${suffix}`;
}

/** The "Market {year}" panel: money-flow, #/% KPIs, insights, both charts. */
export function MarketPerYear({ model }: { model: MarketModel }) {
  const [{ year, market, segment }] = useDashboardParams(model.last);
  // €/% is ephemeral UI, not page identity — it stays out of the URL.
  const [kpiMode, setKpiMode] = useState<KpiMode>("value");

  // The bottom-bar segment scope narrows the row set every figure on this
  // panel is derived from — totals, salary and the money-flow alike.
  const rows = segment
    ? model.rows.filter((row) => row.activities.includes(segment))
    : model.rows;

  // Derived from the selected year, never stored: React recomputes these on
  // render, so there is no cached aggregate that can fall out of sync.
  const cur = marketTotals(rows, year);
  const prev = marketTotals(rows, year - 1);
  const hasPrev = prev.count > 0;
  // The first year has nothing to compare against, so % is force-reverted to €
  // rather than left showing a grid of em-dashes.
  const shownMode: KpiMode = hasPrev ? kpiMode : "value";

  // Three views of the same money: ÷ companies, ÷ employees, or raw totals.
  const div = market === "avg" ? cur.count : market === "emp" ? cur.employees : 1;
  const divPrev = market === "avg" ? prev.count : market === "emp" ? prev.employees : 1;
  const scale = (value: number) => (div > 0 ? value / div : 0);
  const scalePrev = (value: number) => (divPrev > 0 ? value / divPrev : 0);

  // "24→25" range label, as the legacy cards title themselves.
  const y2 = String(year).slice(2);
  const yrLabel = hasPrev ? `${String(year - 1).slice(2)}→${y2}` : String(year);
  const basisNote =
    market === "avg"
      ? ` ÷ ${cur.count} companies`
      : market === "emp"
        ? ` ÷ ${Math.round(cur.employees).toLocaleString()} employees`
        : " (whole-market total)";

  const yoyCard = (
    label: string,
    curVal: number,
    prevVal: number,
    fmt: (v: number) => string,
    formulaName: string,
  ): KpiCardData => {
    const ratio = hasPrev && prevVal > 0 ? curVal / prevVal - 1 : null;
    return {
      label: `${label} ${yrLabel}`,
      valueText: fmt(curVal),
      changeText: ratio == null ? "—" : fmtPct(ratio),
      rangeText: hasPrev ? `${fmt(prevVal)} → ${fmt(curVal)}` : fmt(curVal),
      changeCls: ratio != null && ratio < 0 ? "neg" : "pos",
      formula: !hasPrev
        ? `No prior year before ${year} in the data.`
        : `(${fmt(curVal)} ÷ ${fmt(prevVal)}) − 1 = change from ${year - 1} to ${year}. ${formulaName}${basisNote}.`,
    };
  };

  const salary = medianSalary(rows, year) ?? 0;
  const salaryPrev = medianSalary(rows, year - 1) ?? 0;
  const salaryFmt = (v: number) => `€${Math.round(v).toLocaleString()}/mo`;

  const empCur =
    market === "avg" ? (cur.count ? cur.employees / cur.count : 0) : cur.employees;
  const empPrev =
    market === "avg" ? (prev.count ? prev.employees / prev.count : 0) : prev.employees;
  const empFmt = (v: number) => (market === "avg" ? v.toFixed(1) : fmtInt(v));

  // Revenue and Turnover are already in the money-flow card — only the two
  // figures it can't show get their own KPI cards.
  const cards: KpiCardData[] = [
    {
      ...yoyCard(
        market === "avg" ? "Avg employees/co" : "Total employees",
        empCur,
        empPrev,
        empFmt,
        "Employees",
      ),
      formula:
        (market === "avg"
          ? `Total headcount ÷ ${cur.count} companies`
          : "Sum of reported headcount") + ". YoY = this year ÷ last year − 1.",
    },
    {
      ...yoyCard("Median salary", salary, salaryPrev, salaryFmt, "Median salary"),
      formula: `Middle value of every company's average monthly salary in ${year} (only companies reporting > €500/mo). YoY = this ÷ ${year - 1} − 1.`,
    },
  ];

  return (
    <div>
      <KpiModeToggle mode={shownMode} onChange={setKpiMode} changeDisabled={!hasPrev} />
      {/* iPad and up: money-flow and the KPI cards sit on one row. */}
      <div className="mb-6 md:flex md:items-stretch md:gap-2.5">
        <div className="min-w-0 md:flex-1 [&>.card]:md:mb-0 [&>.card]:md:h-full">
          <MoneyFlow
            mode={shownMode}
            yrLabel={hasPrev ? `${year - 1} → ${year}` : String(year)}
            turnover={scale(cur.revenue)}
            revenue={scale(cur.estimatedIncome)}
            profit={scale(cur.profit)}
            prev={
              hasPrev
                ? {
                    T: scalePrev(prev.revenue),
                    R: scalePrev(prev.estimatedIncome),
                    P: scalePrev(prev.profit),
                  }
                : {}
            }
          />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 md:w-[340px] md:flex-none md:grid-cols-2">
          {cards.map((card) => (
            <KpiCard key={card.label} card={card} mode={shownMode} />
          ))}
        </div>
      </div>

      <Insights model={model} year={year} />
      <SegmentChart model={model} />
      <ScatterChart model={model} />
    </div>
  );
}

/** The "Market all time" panel: money-flow by year, segment trends, scrubber. */
export function MarketAllTime({ model }: { model: MarketModel }) {
  const [{ market, segment }] = useDashboardParams(model.last);
  const rows = segment
    ? model.rows.filter((row) => row.activities.includes(segment))
    : model.rows;

  return (
    <div>
      <MoneyFlowByYear
        title={`${segment ? segName(segment) : "Total market"} money-flow by year (${model.finYears[0]}–${model.finYears[model.finYears.length - 1]})`}
        rows={model.finYears.map((fy) => {
          const t = marketTotals(rows, fy);
          const d = market === "avg" ? t.count : market === "emp" ? t.employees : 1;
          const dv = (v: number) => (d > 0 ? v / d : 0);
          return {
            year: fy,
            turnover: dv(t.revenue),
            revenue: dv(t.estimatedIncome),
            profit: dv(t.profit),
          };
        })}
      />
      <SegmentTrends model={model} />
      <ScatterScrub model={model} />
    </div>
  );
}
