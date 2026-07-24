import type { CompanyYear, MarketModel } from "./types";

/** The brand the Financials tabs open on when the URL names none. Fabula is
 *  the owner's own agency, so it's the useful starting point rather than
 *  whichever brand happens to sort first. Falls back to the first brand if it
 *  ever drops out of the dataset. */
export function defaultBrand(model: MarketModel) {
  return model.brands.includes("Fabula") ? "Fabula" : model.brands[0];
}

/** Whole-market totals for one year (the legacy's marketAgg). */
export type MarketTotals = {
  revenue: number;
  profit: number;
  employees: number;
  /** Fee-based revenue. */
  estimatedIncome: number;
  /** Companies with a row that year. */
  count: number;
};

const add = (total: number, value: number | null) => total + (value ?? 0);

export function marketTotals(rows: CompanyYear[], year: number): MarketTotals {
  const inYear = rows.filter((row) => row.year === year);

  return {
    revenue: inYear.reduce((sum, row) => add(sum, row.revenue), 0),
    profit: inYear.reduce((sum, row) => add(sum, row.profit), 0),
    employees: inYear.reduce((sum, row) => add(sum, row.employees), 0),
    estimatedIncome: inYear.reduce((sum, row) => add(sum, row.estimatedIncome), 0),
    count: inYear.length,
  };
}

/** Median salary that year, ignoring implausibly low figures (legacy: >500). */
export function medianSalary(rows: CompanyYear[], year: number): number | null {
  const salaries = rows
    .filter((row) => row.year === year && (row.avgSalary ?? 0) > 500)
    .map((row) => row.avgSalary as number)
    .sort((a, b) => a - b);

  return salaries.length ? salaries[Math.floor(salaries.length / 2)] : null;
}

/** Where one company sits against the whole market on a metric (legacy: rankOf). */
export type Rank = {
  /** 1 = best. */
  pos: number;
  /** Companies that reported this metric — the rank is out of these. */
  total: number;
  /** Percentile, 100 = top. */
  pct: number;
  value: number;
};

/**
 * Ranks `row` against every company that reported `metric` that year. Companies
 * with no figure are excluded rather than counted as zero, so the rank reads
 * "of the 118 who filed", not "of all 132".
 */
export function rankOf(
  rows: CompanyYear[],
  year: number,
  row: CompanyYear | undefined,
  metric: (row: CompanyYear) => number | null,
): Rank | null {
  const mine = row && metric(row);
  if (mine == null || !Number.isFinite(mine)) return null;

  const values = rows
    .filter((candidate) => candidate.year === year)
    .map(metric)
    .filter((value): value is number => value != null && Number.isFinite(value))
    .sort((a, b) => b - a);

  const pos = values.findIndex((value) => value <= mine) + 1;

  return {
    pos,
    total: values.length,
    pct: Math.round((1 - (pos - 1) / values.length) * 100),
    value: mine,
  };
}

/** Profit margin on fee revenue, in percent. Legacy ignores tiny fee bases. */
export function margin(row: CompanyYear): number | null {
  if (row.profit == null || (row.estimatedIncome ?? 0) <= 50_000) return null;
  return (row.profit / (row.estimatedIncome as number)) * 100;
}
