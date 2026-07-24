import rcJson from "../../../data2/rc_bulk.json";
import govJson from "../../../data2/gov_finance.json";
import companiesJson from "../../../data2/companies.json";
import { RestaurantsTable, type Row } from "./table";

/** EVRK class → human label, the four food-service codes we seeded. */
const EVRK: Record<string, string> = {
  "561000": "Restoranai",
  "562100": "Pokylių aptarnavimas",
  "562900": "Kita maitinimo veikla",
  "563000": "Barai",
};

/**
 * The food-service dataset: every figure comes straight from the RC bulk
 * dump, joined to the seeded company list on jarCode. Latest filed year per
 * company, older years kept for the row expansion.
 */
export default function RestaurantsPage() {
  // Merge the two registry channels per company. Precedence is gap-filling:
  // gov (data.gov.lt) first, RC bulk only fills years gov doesn't have.
  const merged = new Map<
    string,
    Map<number, { year: number; turnover: number | null; profit: number | null }>
  >();
  for (const src of [govJson.companies, rcJson.companies] as const) {
    for (const c of src) {
      if (!("financials" in c) || !c.financials) continue;
      const years = merged.get(c.jarCode) ?? new Map();
      merged.set(c.jarCode, years);
      for (const f of c.financials)
        if (!years.has(f.year))
          years.set(f.year, {
            year: f.year,
            turnover: f.turnover,
            profit: f.profit,
          });
    }
  }
  const taxesByJar = new Map(
    govJson.companies.filter((c) => c.taxes?.length).map((c) => [c.jarCode, c.taxes]),
  );

  const byJar = new Map(companiesJson.map((c) => [c.jarCode, c]));
  const rows: Row[] = [...merged.entries()]
    .filter(([, byYear]) => byYear.size > 0)
    .map(([jar, byYear]) => {
      const seed = byJar.get(jar);
      const years = [...byYear.values()].sort((a, b) => b.year - a.year);
      // Newest FULL VMI year (throughMonth 12); a partial current year misleads.
      const tax = taxesByJar.get(jar)?.find((t) => t.throughMonth === 12);
      return {
        jarCode: jar,
        name: seed?.name ?? jar,
        evrk: EVRK[seed?.evrk ?? ""] ?? seed?.evrk ?? "?",
        year: years[0].year,
        turnover: years[0].turnover,
        profit: years[0].profit,
        taxes: tax ? tax.ytd : null,
        taxYear: tax?.year ?? null,
        years,
      };
    });

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">
        Restaurants &amp; bars
      </h1>
      <p className="text-muted mb-6 text-sm">
        {rows.length} of {companiesJson.length} food-service companies with a filed
        statement · Registrų centras (data.gov.lt + bulk dump) + VMI taxes, scraped{" "}
        {rcJson.scrapedAt.slice(0, 10)}
      </p>
      <RestaurantsTable rows={rows} />
    </main>
  );
}
