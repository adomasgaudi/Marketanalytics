import legacy from "../../../data/data.json";
import sodraJson from "../../../data2/sodra_months.json";

/**
 * Sodra's monthly record, and the yearly figures worked out from it.
 *
 * The point of this file: a wage bill built by SUMMING twelve months is a real
 * figure, while the legacy dataset's is one month's payroll multiplied by 12.
 * Any month a company hired, fired, or paid a bonus makes those two disagree —
 * and the gap is exactly what this sheet is for.
 *
 * Headcount gets averaged instead, because summing a headcount is meaningless:
 * the same 40 people appear in all twelve months.
 */
export type MonthRow = { month: number; insured: number | null; avgWage: number | null };

export type SodraYear = {
  year: number;
  /** Mean insured headcount across the months that reported one. */
  avgHeadcount: number | null;
  /** Mean monthly wage across the months Sodra published one. */
  avgWage: number | null;
  /** The twelve monthly wages SUMMED — a year's pay for one employee. The
      legacy dataset instead took one month and multiplied it by twelve. */
  yearlyWage: number | null;
  /** Σ (avgWage × insured) over the year — the wage bill actually paid. */
  wageBill: number | null;
  /** How many of the twelve months carried a wage. Below 12, wageBill is short. */
  monthsWithWage: number;
  /** The legacy figure: one month's pay × headcount × 12. */
  legacyWageBill: number | null;
};

export type SodraCompany = {
  jarCode: string;
  brand: string;
  months: MonthRow[];
  years: Record<number, SodraYear>;
  /** YYYYMM -> that month. Built once. Looking a month up by scanning the
      array costs nothing on its own, but a sheet asks per CELL — 115 companies
      × 144 columns × a 110-month scan is ~9M comparisons and the tab hangs. */
  byMonth: Map<number, MonthRow>;
};

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

// Legacy salaryCosts, keyed brand+year. It is avgSalary × employees × 12 — the
// annualisation this sheet exists to test.
const legacyWages = new Map<string, number>();
for (const row of legacy as { brand: string; year: number; salaryCosts?: number }[]) {
  if (row.salaryCosts != null)
    legacyWages.set(`${row.brand}|${row.year}`, row.salaryCosts);
}

const source = sodraJson as {
  companies: { jarCode: string; brand: string; months: MonthRow[] }[];
};

export const SODRA: SodraCompany[] = source.companies
  .map((company) => {
    const byYear = new Map<number, MonthRow[]>();
    for (const month of company.months) {
      const year = Math.floor(month.month / 100);
      (byYear.get(year) ?? byYear.set(year, []).get(year)!).push(month);
    }
    const years: Record<number, SodraYear> = {};
    for (const [year, months] of byYear) {
      const wages = months.filter((m) => m.avgWage != null);
      const heads = months.filter((m) => m.insured != null);
      const paid = months.filter((m) => m.avgWage != null && m.insured != null);
      years[year] = {
        year,
        avgHeadcount: mean(heads.map((m) => m.insured as number)),
        avgWage: mean(wages.map((m) => m.avgWage as number)),
        yearlyWage: wages.length
          ? wages.reduce((sum, m) => sum + (m.avgWage as number), 0)
          : null,
        wageBill: paid.length
          ? paid.reduce(
              (sum, m) => sum + (m.avgWage as number) * (m.insured as number),
              0,
            )
          : null,
        monthsWithWage: wages.length,
        legacyWageBill: legacyWages.get(`${company.brand}|${year}`) ?? null,
      };
    }
    return {
      ...company,
      years,
      byMonth: new Map(company.months.map((month) => [month.month, month])),
    };
  })
  .sort((a, b) => a.brand.localeCompare(b.brand, "lt"));

/** Every year Sodra reports a month for, oldest first. */
export const SODRA_YEARS: number[] = [
  ...new Set(SODRA.flatMap((company) => Object.keys(company.years).map(Number))),
].sort((a, b) => a - b);
