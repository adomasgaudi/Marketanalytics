import rcJson from "../../../data2/rc_bulk.json";
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
  const byJar = new Map(companiesJson.map((c) => [c.jarCode, c]));
  const rows: Row[] = rcJson.companies.map((c) => {
    const seed = byJar.get(c.jarCode);
    const latest = c.financials[0];
    return {
      jarCode: c.jarCode,
      name: seed?.name ?? c.brand ?? c.jarCode,
      evrk: EVRK[seed?.evrk ?? ""] ?? seed?.evrk ?? "?",
      year: latest.year,
      turnover: latest.turnover,
      profit: latest.profit,
      years: c.financials.map((f) => ({
        year: f.year,
        turnover: f.turnover,
        profit: f.profit,
      })),
    };
  });

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">
        Restaurants &amp; bars
      </h1>
      <p className="text-muted mb-6 text-sm">
        {rows.length} of {companiesJson.length} food-service companies with a
        filed statement · Registrų centras bulk dump, scraped{" "}
        {rcJson.scrapedAt.slice(0, 10)}
      </p>
      <RestaurantsTable rows={rows} />
    </main>
  );
}
