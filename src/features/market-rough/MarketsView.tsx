"use client";

import { fmtEur, fmtEurFull, fmtInt, fmtPct } from "./format";
import { Frac, moneyFormulas, Op, V } from "./Formula";
import { Insights } from "./Insights";
import { KpiCard, type KpiCardData } from "./KpiCard";
import { marketTotals, avgSalary } from "./metrics";
import { MoneyFlow } from "./MoneyFlow";
import { PeriodToggle } from "./PeriodToggle";
import { MoneyFlowByYear } from "./MoneyFlowByYear";
import { ScatterChart } from "./ScatterChart";
import { segName } from "./segments";
import { SegmentChart } from "./SegmentChart";
import { SegmentTrends } from "./SegmentTrends";
import type { MarketModel } from "./types";
import { useSourcedModel } from "./rebuilt-source";
import { useDashboardParams } from "./useDashboardParams";
import { useVisibleYears } from "./years";

/** The "Market {year}" panel: money-flow, #/% KPIs, insights, both charts. */
export function MarketPerYear({ model: legacyModel }: { model: MarketModel }) {
  // Rebuilt figures by default; every child below is handed this same model.
  const model = useSourcedModel(legacyModel);
  const [{ year, market, segment, per }] = useDashboardParams();
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

  // Two independent divisions, multiplied: HOW the market is split (companies
  // / employees / not at all) and over WHAT PERIOD. They compose, so "per
  // company per month" is a reading rather than a fourth exclusive basis.
  const months = per === "month" ? 12 : 1;
  const div =
    (market === "avg" ? cur.count : market === "emp" ? cur.employees : 1) * months;
  const divPrev =
    (market === "avg" ? prev.count : market === "emp" ? prev.employees : 1) * months;
  const scale = (value: number) => (div > 0 ? value / div : 0);
  const scalePrev = (value: number) => (divPrev > 0 ? value / divPrev : 0);

  // "24→25" range label, as the legacy cards title themselves.
  const y2 = String(year).slice(2);
  const yrLabel = hasPrev ? `→${y2}` : String(year);

  const yoyCard = (
    label: string,
    curVal: number,
    prevVal: number,
    fmt: (v: number) => string,
  ): KpiCardData => {
    const ratio = hasPrev && prevVal > 0 ? curVal / prevVal - 1 : null;
    return {
      label: `${label} ${yrLabel}`,
      valueText: fmt(curVal),
      changeText: ratio == null ? "—" : fmtPct(ratio),
      changeCls: ratio != null && ratio < 0 ? "neg" : "pos",
      formulas: [],
    };
  };

  const salary = avgSalary(rows, year) ?? 0;
  const salaryPrev = avgSalary(rows, year - 1) ?? 0;
  const salaryFmt = (v: number) => `${fmtEurFull(v)}/mo`;
  const payrollCur = rows
    .filter((row) => row.year === year)
    .reduce((sum, row) => sum + (row.salaryCosts ?? 0), 0);

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
      ],
    },
    {
      ...yoyCard("Average salary", salary, salaryPrev, salaryFmt),
      formulas: [
        {
          name: "Average salary",
          math: (
            <>
              <V c="SAL" />
              <Op o="=" />
              <mi>avg</mi>
              <mo>(</mo>
              <V c="avg" sub="i" />
              <mo>)</mo>
            </>
          ),
          vars: [
            {
              code: "SAL",
              label: "market average monthly salary",
              value: salaryFmt(salary),
            },
            {
              code: "avgᵢ",
              label: "one company's average monthly pay (only > €500/mo counts)",
              field: "avgSalary",
            },
          ],
        },
      ],
    },
  ];

  return (
    <div>
      <div className="mb-6 md:flex md:items-stretch md:gap-2.5">
        <div className="min-w-0 md:flex-1 [&>.card]:md:mb-0 [&>.card]:md:h-full">
          <MoneyFlow
            actions={<PeriodToggle />}
            yrLabel={hasPrev ? `${year - 1} → ${year}` : String(year)}
            formulas={moneyFormulas({
              sum: true,
              // Names the rows actually summed, so the fold changes with the
              // segment picker instead of always describing the whole market.
              scope: {
                label: segment ? `the ${segName(segment)} segment` : "the whole market",
                companies: String(cur.count),
              },
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
            payroll={scale(payrollCur)}
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
        <div className="md:w-[340px] md:flex-none">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 md:grid-cols-2">
            {cards.map((card) => (
              <KpiCard key={card.label} card={card} />
            ))}
          </div>
        </div>
      </div>

      <Insights model={model} year={year} />
      <SegmentChart model={model} />
      <ScatterChart model={model} />
    </div>
  );
}

/** The "Market all time" panel: money-flow by year, segment trends, scrubber. */
export function MarketAllTime({ model: legacyModel }: { model: MarketModel }) {
  const model = useSourcedModel(legacyModel);
  const [{ market, segment }] = useDashboardParams();
  const visibleYears = useVisibleYears(model.finYears);
  const rows = segment
    ? model.rows.filter((row) => row.activities.includes(segment))
    : model.rows;

  return (
    <div>
      <MoneyFlowByYear
        title={`${segment ? segName(segment) : "Total market"} money-flow by year (${visibleYears[0]}–${visibleYears[visibleYears.length - 1]})`}
        rows={visibleYears.map((fy) => {
          const t = marketTotals(rows, fy);
          const d = market === "avg" ? t.count : market === "emp" ? t.employees : 1;
          const dv = (v: number) => (d > 0 ? v / d : 0);
          const payroll = rows
            .filter((row) => row.year === fy)
            .reduce((sum, row) => sum + (row.salaryCosts ?? 0), 0);
          return {
            year: fy,
            turnover: dv(t.revenue),
            revenue: dv(t.estimatedIncome),
            profit: dv(t.profit),
            payroll: dv(payroll),
          };
        })}
      />
      <SegmentTrends model={model} />
      {/* The same bubble field as the per-year panel. It still draws one year —
          the one the bottom bar last held — but its axes span every year, so it
          reads as a fixed frame here rather than a per-year snapshot. */}
      <ScatterChart model={model} />
    </div>
  );
}
