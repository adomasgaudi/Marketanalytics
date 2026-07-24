import companiesJson from "../../../data2/companies.json";
import govJson from "../../../data2/gov_finance.json";
import rcJson from "../../../data2/rc_bulk.json";
import sodraJson from "../../../data2/sodra_months.json";
import type { CompanyYear, MarketModel } from "./types";

/** EVRK class → segment label; the four food-service classes we track. */
const EVRK: Record<string, string> = {
  "561000": "Restoranai",
  "562100": "Pokylių aptarnavimas",
  "562900": "Kita maitinimo veikla",
  "563000": "Barai",
};

/**
 * Rebuilds the legacy CompanyYear rows from the data2 registry set.
 * Financial years merge gap-fill style — gov (data.gov.lt) wins a year,
 * RC bulk only fills years gov doesn't carry. Sodra fills headcount and
 * wages; salaryCosts is the summed monthly wage bill (insured × avgWage).
 */
function buildRows(): CompanyYear[] {
  type Fin = { year: number; turnover: number | null; profit: number | null };
  const finByJar = new Map<string, Map<number, Fin>>();
  for (const src of [govJson.companies, rcJson.companies] as const) {
    for (const c of src) {
      if (!("financials" in c) || !c.financials) continue;
      const years = finByJar.get(c.jarCode) ?? new Map<number, Fin>();
      finByJar.set(c.jarCode, years);
      for (const f of c.financials)
        if (!years.has(f.year))
          years.set(f.year, {
            year: f.year,
            turnover: f.turnover,
            profit: f.profit,
          });
    }
  }

  // Per company and year: average insured, average wage, summed wage bill.
  type SodraYear = {
    employees: number;
    avgWage: number | null;
    bill: number | null;
  };
  const sodraByJar = new Map<string, Map<number, SodraYear>>();
  for (const c of sodraJson.companies) {
    if (!c.months.length) continue;
    const byYear = new Map<number, { ins: number[]; wages: number[]; bill: number }>();
    for (const m of c.months) {
      const y = Math.floor(m.month / 100);
      const acc = byYear.get(y) ?? { ins: [], wages: [], bill: 0 };
      byYear.set(y, acc);
      if (m.insured != null) acc.ins.push(m.insured);
      if (m.avgWage != null) {
        acc.wages.push(m.avgWage);
        acc.bill += m.avgWage * (m.insured ?? 1);
      }
    }
    const out = new Map<number, SodraYear>();
    for (const [y, a] of byYear)
      out.set(y, {
        employees: a.ins.length
          ? Math.round(a.ins.reduce((s, v) => s + v, 0) / a.ins.length)
          : 0,
        avgWage: a.wages.length
          ? a.wages.reduce((s, v) => s + v, 0) / a.wages.length
          : null,
        bill: a.wages.length ? Math.round(a.bill) : null,
      });
    sodraByJar.set(c.jarCode, out);
  }

  const rows: CompanyYear[] = [];
  for (const seed of companiesJson) {
    const jar = seed.jarCode;
    const segment = EVRK[seed.evrk ?? ""] ?? "Kita";
    const fin = finByJar.get(jar);
    const sodra = sodraByJar.get(jar);
    if (!fin && !sodra) continue;
    const years = new Set<number>([...(fin?.keys() ?? []), ...(sodra?.keys() ?? [])]);
    for (const year of years) {
      const f = fin?.get(year);
      const s = sodra?.get(year);
      rows.push({
        company: seed.name ?? jar,
        brand: seed.brand ?? seed.name ?? jar,
        year,
        activities: [segment],
        mainSegment: segment,
        city: "",
        risk: "",
        employees: s?.employees ?? null,
        avgSalary: s?.avgWage ?? null,
        salaryCosts: s?.bill ?? null,
        revenue: f?.turnover ?? null,
        profit: f?.profit ?? null,
        nonSalaryCosts: null,
        estimatedIncome: null,
      });
    }
  }
  return rows;
}

const rows = buildRows();

/** Builds the indexes the legacy dashboard derives at load (byBrand, BRANDS,
    SEGMENTS, YEARS, LAST, FIN_YEARS). Runs on the server; the model is handed
    down to the views. */
export function loadMarketData(): MarketModel {
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);

  const last = Math.max(
    ...rows.filter((row) => row.revenue != null).map((row) => row.year),
  );
  const finYears = years.filter((year) => year <= last);

  const byBrand: Record<string, Record<number, CompanyYear>> = {};
  for (const row of rows) {
    (byBrand[row.brand] ??= {})[row.year] = row;
  }

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
