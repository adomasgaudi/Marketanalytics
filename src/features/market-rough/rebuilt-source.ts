"use client";

import { useMemo } from "react";
import { COMPANIES } from "../explore/model-data";
import { SODRA } from "../explore/sodra-data";
import type { CompanyYear, MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

/**
 * The rebuilt figures from data2/, overlaid onto the legacy model so the whole
 * dashboard can be switched between the two datasets from one place.
 *
 * Overlaying the MODEL rather than each chart is deliberate: every view on the
 * Companies page reads `model.rows` / `model.byBrand`, so one swap reaches the
 * money-flow card, the rankings, the deep-dive, the all-time charts and the
 * bottom bar at once — and a view added later is covered without being told.
 *
 * WHAT IS REPLACED, and nothing else:
 *   revenue          <- data2 turnover  (Registrų centras / rekvizitai, filed)
 *   estimatedIncome  <- data2 netRevenue (payroll x 1,0177 x 1,43 + pre-tax)
 *   profit           <- data2 profit    (filed)
 *   salaryCosts      <- data2 wageBill  (Sodra, summed month by month)
 *   employees        <- Sodra mean insured headcount over the year
 *   avgSalary        <- Sodra mean monthly wage over the year
 *
 * Headcount and wage MUST come from Sodra too, not because the legacy figures
 * are unusable but because the payroll above was computed from them: legacy
 * put Fabula 2024 at 44 staff on 3 463 €/mo where Sodra's year averages are 39
 * and 3 436. Leaving them mixed would divide a rebuilt payroll by a legacy
 * headcount, and every per-employee figure on the site would contradict the
 * card above it. Legacy counts a single snapshot date; Sodra averages a year.
 *
 * Activities, city and risk stay legacy — the rebuild does not carry them.
 *
 * A year the rebuild has nothing for keeps its legacy figure rather than going
 * blank: the toggle is for comparing, and a hole compares to nothing.
 */
type Rebuilt = {
  revenue: number | null;
  estimatedIncome: number | null;
  profit: number | null;
  salaryCosts: number | null;
  employees: number | null;
  avgSalary: number | null;
};

const sodraByBrand = new Map(SODRA.map((company) => [company.brand, company]));

const byBrandYear = new Map<string, Map<number, Rebuilt>>();
for (const company of COMPANIES) {
  const years = new Map<number, Rebuilt>();
  // Every year ANY rebuilt metric reaches — Sodra runs further than the
  // registry, so a wage bill can exist for a year with no filing.
  const seen = new Set<number>();
  for (const key of ["turnover", "netRevenue", "profit", "wageBill"]) {
    for (const year of Object.keys(company.values[key] ?? {})) seen.add(Number(year));
  }
  const sodra = sodraByBrand.get(company.brand);
  for (const year of Object.keys(sodra?.years ?? {})) seen.add(Number(year));
  for (const year of seen) {
    const sodraYear = sodra?.years[year];
    years.set(year, {
      revenue: company.values.turnover?.[year] ?? null,
      estimatedIncome: company.values.netRevenue?.[year] ?? null,
      profit: company.values.profit?.[year] ?? null,
      salaryCosts: company.values.wageBill?.[year] ?? null,
      employees:
        sodraYear?.avgHeadcount == null ? null : Math.round(sodraYear.avgHeadcount),
      avgSalary: sodraYear?.avgWage == null ? null : Math.round(sodraYear.avgWage),
    });
  }
  byBrandYear.set(company.brand, years);
}

const overlayRow = (row: CompanyYear): CompanyYear => {
  const built = byBrandYear.get(row.brand)?.get(row.year);
  if (!built) return row;
  return {
    ...row,
    revenue: built.revenue ?? row.revenue,
    estimatedIncome: built.estimatedIncome ?? row.estimatedIncome,
    profit: built.profit ?? row.profit,
    salaryCosts: built.salaryCosts ?? row.salaryCosts,
    employees: built.employees ?? row.employees,
    avgSalary: built.avgSalary ?? row.avgSalary,
    // Non-salary costs are turnover minus the wage bill: derived from the two
    // figures above, so leaving the legacy value would contradict them.
    nonSalaryCosts:
      (built.revenue ?? row.revenue) != null &&
      (built.salaryCosts ?? row.salaryCosts) != null
        ? (built.revenue ?? row.revenue)! - (built.salaryCosts ?? row.salaryCosts)!
        : row.nonSalaryCosts,
  };
};

/** The legacy model with every row overlaid, and its indexes rebuilt to match. */
const rebuildModel = (model: MarketModel): MarketModel => {
  const rows = model.rows.map(overlayRow);
  const byBrand: Record<string, Record<number, CompanyYear>> = {};
  for (const row of rows) (byBrand[row.brand] ??= {})[row.year] = row;
  return { ...model, rows, byBrand };
};

// One rebuild per model, not one per component that asks for it.
const cache = new WeakMap<MarketModel, MarketModel>();

/**
 * The model the page should render. Rebuilt by default — the legacy figures are
 * only returned when the nav toggle explicitly asks for them. Call it at the
 * top of any client view that takes a `model` prop.
 */
export function useSourcedModel(model: MarketModel): MarketModel {
  const [{ src }] = useDashboardParams(model.last);
  return useMemo(() => {
    if (src === "legacy") return model;
    const cached = cache.get(model);
    if (cached) return cached;
    const built = rebuildModel(model);
    cache.set(model, built);
    return built;
  }, [model, src]);
}
