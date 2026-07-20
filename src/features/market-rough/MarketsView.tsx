"use client";

import { useState } from "react";
import { fmtEur, fmtEurFull, fmtInt, fmtPct } from "./format";
import { Frac, moneyFormulas, Op, V, yoy } from "./Formula";
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
      formulas: hasPrev
        ? [
            yoy(formulaName, formulaName.toLowerCase(), undefined, {
              cur: fmt(curVal),
              prev: fmt(prevVal),
            }),
          ]
        : [],
    };
  };

  const salary = medianSalary(rows, year) ?? 0;
  const salaryPrev = medianSalary(rows, year - 1) ?? 0;
  const salaryFmt = (v: number) => `${fmtEurFull(v)}/mo`;

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
      // Two distinct formulas, not one sentence: how the figure is built, then
      // how the change on it is measured.
      formulas: [
        market === "avg"
          ? {
              name: "Average employees per company",
              math: (
                <>
                  <V c="AE" />
                  <Op o="=" />
                  <Frac num={<V c="HC" />} den={<V c="CO" />} />
                </>
              ),
              vars: [
                {
                  code: "AE",
                  label: "average employees per company",
                  value: empFmt(empCur),
                },
                {
                  code: "HC",
                  label: "total market headcount",
                  field: "employees",
                  value: fmtInt(cur.employees),
                },
                {
                  code: "CO",
                  label: "companies filing this year",
                  value: String(cur.count),
                },
              ],
            }
          : {
              name: "Total employees",
              math: (
                <>
                  <V c="HC" />
                  <Op o="=" />
                  <mo largeop="true">∑</mo>
                  <V c="emp" sub="i" />
                </>
              ),
              vars: [
                {
                  code: "HC",
                  label: "total market headcount",
                  field: "employees",
                  value: fmtInt(cur.employees),
                },
                { code: "empᵢ", label: "one company's headcount", field: "employees" },
              ],
            },
        ...(hasPrev
          ? [
              yoy(
                market === "avg" ? "AE" : "HC",
                market === "avg" ? "average employees" : "total headcount",
                "employees",
                { cur: empFmt(empCur), prev: empFmt(empPrev) },
              ),
            ]
          : []),
      ],
    },
    {
      ...yoyCard("Median salary", salary, salaryPrev, salaryFmt, "Median salary"),
      formulas: [
        {
          name: "Median salary",
          math: (
            <>
              <V c="SAL" />
              <Op o="=" />
              <mi>median</mi>
              <mo>(</mo>
              <V c="avg" sub="i" />
              <mo>)</mo>
            </>
          ),
          vars: [
            {
              code: "SAL",
              label: "market median monthly salary",
              value: salaryFmt(salary),
            },
            {
              code: "avgᵢ",
              label: "one company's average monthly pay (only > €500/mo counts)",
              field: "avgSalary",
            },
          ],
        },
        ...(hasPrev
          ? [
              yoy("SAL", "median salary", "avgSalary", {
                cur: salaryFmt(salary),
                prev: salaryFmt(salaryPrev),
              }),
            ]
          : []),
      ],
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
            formulas={moneyFormulas({
              sum: true,
              div:
                market === "avg"
                  ? {
                      code: "CO",
                      label: "companies filing this year",
                      value: String(cur.count),
                    }
                  : market === "emp"
                    ? {
                        code: "HC",
                        label: "total market headcount",
                        value: fmtInt(cur.employees),
                      }
                    : null,
              // The figures as shown on the card, so the fold reads as a worked
              // example rather than a definition.
              values: {
                T: fmtEur(scale(cur.revenue)),
                R: fmtEur(scale(cur.estimatedIncome)),
                P: fmtEur(scale(cur.profit)),
              },
            })}
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
