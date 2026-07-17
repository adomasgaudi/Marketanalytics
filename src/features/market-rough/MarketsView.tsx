"use client";

import { useState } from "react";
import { Pill, PillRow } from "@/components/ui/pills";
import { fmtEur, fmtInt, fmtPct } from "./format";
import { Insights } from "./Insights";
import { KpiCard, type KpiCardData, type KpiMode, KpiModeToggle } from "./KpiCard";
import { marketTotals, medianSalary } from "./metrics";
import { MoneyFlow } from "./MoneyFlow";
import { SegmentChart } from "./SegmentChart";
import type { MarketModel } from "./types";
import { type MarketMode, useDashboardParams } from "./useDashboardParams";
import { YearRow } from "./YearRow";

/** Legacy basis row: average per company (default), per employee, whole market. */
const MODE_OPTIONS: { value: MarketMode; label: string }[] = [
  { value: "avg", label: "Average / company" },
  { value: "emp", label: "Per employee" },
  { value: "whole", label: "Whole market" },
];

export function MarketsView({ model }: { model: MarketModel }) {
  const [{ year, market }, setParams] = useDashboardParams(model.last);
  // #/% is ephemeral UI, not page identity — it stays out of the URL.
  const [kpiMode, setKpiMode] = useState<KpiMode>("value");

  // Derived from the selected year, never stored: React recomputes these on
  // render, so there is no cached aggregate that can fall out of sync.
  const cur = marketTotals(model.rows, year);
  const prev = marketTotals(model.rows, year - 1);
  const hasPrev = prev.count > 0;

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

  const salary = medianSalary(model.rows, year) ?? 0;
  const salaryPrev = medianSalary(model.rows, year - 1) ?? 0;
  const salaryFmt = (v: number) => `€${Math.round(v).toLocaleString()}/mo`;

  const empCur =
    market === "avg" ? (cur.count ? cur.employees / cur.count : 0) : cur.employees;
  const empPrev =
    market === "avg" ? (prev.count ? prev.employees / prev.count : 0) : prev.employees;
  const empFmt = (v: number) => (market === "avg" ? v.toFixed(1) : fmtInt(v));

  // Legacy card order: Revenue, Employees, Salary, Turnover.
  const cards: KpiCardData[] = [
    yoyCard(
      market === "emp" ? "Revenue/empl." : "Revenue",
      scale(cur.estimatedIncome),
      scalePrev(prev.estimatedIncome),
      fmtEur,
      "Revenue",
    ),
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
    yoyCard(
      market === "emp" ? "Turnover/empl." : "Turnover",
      scale(cur.revenue),
      scalePrev(prev.revenue),
      fmtEur,
      "Turnover",
    ),
  ];

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

      <MoneyFlow
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
        tag={
          market === "avg"
            ? `per company · ${cur.count} cos`
            : market === "emp"
              ? `per employee · ${Math.round(cur.employees).toLocaleString()} staff`
              : "whole market"
        }
      />

      <KpiModeToggle mode={kpiMode} onChange={setKpiMode} />
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
        {cards.map((card) => (
          <KpiCard key={card.label} card={card} mode={kpiMode} />
        ))}
      </div>

      <Insights />

      <SegmentChart model={model} />
    </section>
  );
}
