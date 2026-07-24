import classification from "../../../data2/classification.json";
import { COMPANIES } from "../explore/model-data";
import { SODRA } from "../explore/sodra-data";
import type { CompanyYear, MarketModel } from "./types";

/**
 * The dashboard model, built entirely from data2/. Registry filings (turnover,
 * profit, agency revenue, wage bill) come from the COMPANIES sheet; headcount
 * and average wage from Sodra; and the non-registry fields a filing never
 * carries — company name, segments, main segment, city, credit risk — from
 * data2/classification.json, the one-time migrated snapshot (see its
 * _meta.source). Nothing here reads the retired data/ set.
 */
type Meta = {
  company: string;
  activities: string[];
  mainSegment: string | null;
  city: string | null;
  risk: string | null;
};
const META = (classification as { companies: Record<string, Meta> }).companies;

const compByBrand = new Map(COMPANIES.map((c) => [c.brand, c]));
const sodraByBrand = new Map(SODRA.map((c) => [c.brand, c]));

// The dashboard's headline metric — agency revenue — is derived from the Sodra
// payroll, and per-employee/wage figures need it too, so a year with no Sodra
// data renders empty across the whole page. Registry filings reach back to 2015
// but Sodra starts in 2017; capping the model at Sodra's first year keeps every
// selectable year populated instead of surfacing blank pre-payroll years.
const SODRA_FLOOR = Math.min(...SODRA.flatMap((c) => Object.keys(c.years).map(Number)));

/** One {brand, year} row for every year any data2 figure reaches the brand,
    within the supported (Sodra-backed) window. */
function buildRows(): CompanyYear[] {
  const rows: CompanyYear[] = [];
  for (const [brand, meta] of Object.entries(META)) {
    const comp = compByBrand.get(brand);
    const sodra = sodraByBrand.get(brand);
    const years = new Set<number>();
    for (const key of ["turnover", "netRevenue", "profit", "wageBill"])
      for (const y of Object.keys(comp?.values[key] ?? {})) years.add(Number(y));
    for (const y of Object.keys(sodra?.years ?? {})) years.add(Number(y));

    for (const year of years) {
      if (year < SODRA_FLOOR) continue;
      const revenue = comp?.values.turnover?.[year] ?? null;
      const salaryCosts = comp?.values.wageBill?.[year] ?? null;
      const sy = sodra?.years[year];
      rows.push({
        company: meta.company,
        brand,
        year,
        activities: meta.activities,
        mainSegment: meta.mainSegment ?? meta.activities[0] ?? "Other",
        city: meta.city ?? "",
        risk: meta.risk ?? "",
        employees: sy?.avgHeadcount == null ? null : Math.round(sy.avgHeadcount),
        avgSalary: sy?.avgWage == null ? null : Math.round(sy.avgWage),
        salaryCosts,
        revenue,
        profit: comp?.values.profit?.[year] ?? null,
        // Non-salary cost = turnover minus the wage bill, when both are known.
        nonSalaryCosts:
          revenue != null && salaryCosts != null ? revenue - salaryCosts : null,
        estimatedIncome: comp?.values.netRevenue?.[year] ?? null,
      });
    }
  }
  return rows;
}

/** Builds the indexes the dashboard derives at load (byBrand, brands, segments,
    years, last, finYears). Runs on the server; the model is handed to the views. */
export function loadMarketData(): MarketModel {
  const rows = buildRows();
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  const last = Math.max(...rows.filter((r) => r.revenue != null).map((r) => r.year));
  const finYears = years.filter((year) => year <= last);

  const byBrand: Record<string, Record<number, CompanyYear>> = {};
  for (const row of rows) (byBrand[row.brand] ??= {})[row.year] = row;

  return {
    rows,
    byBrand,
    brands: Object.keys(byBrand),
    segments: [...new Set(rows.flatMap((row) => row.activities))].sort(),
    years,
    last,
    finYears,
  };
}
