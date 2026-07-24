import { Bloom } from "@/components/ui/bloom";
import { Footer } from "@/components/ui/footer";
import rcJson from "../../../data2/rc_bulk.json";
import sodraJson from "../../../data2/sodra_months.json";
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

  // Latest Sodra month that actually carries data, per company.
  const sodraByJar = new Map(
    sodraJson.companies
      .filter((c) => c.months.length)
      .map((c) => {
        const last = c.months[c.months.length - 1];
        const wage = [...c.months].reverse().find((m) => m.avgWage != null);
        return [c.jarCode, { insured: last.insured, avgWage: wage?.avgWage ?? null }];
      }),
  );

  const byJar = new Map(companiesJson.map((c) => [c.jarCode, c]));
  const rows: Row[] = [...merged.entries()]
    .filter(([, byYear]) => byYear.size > 0)
    .map(([jar, byYear]) => {
      const seed = byJar.get(jar);
      const years = [...byYear.values()].sort((a, b) => b.year - a.year);
      // Newest FULL VMI year (throughMonth 12); a partial current year misleads.
      const tax = taxesByJar.get(jar)?.find((t) => t.throughMonth === 12);
      const sodra = sodraByJar.get(jar);
      return {
        jarCode: jar,
        name: seed?.name ?? jar,
        evrk: EVRK[seed?.evrk ?? ""] ?? seed?.evrk ?? "?",
        insured: sodra?.insured ?? null,
        avgWage: sodra?.avgWage ?? null,
        year: years[0].year,
        turnover: years[0].turnover,
        profit: years[0].profit,
        taxes: tax ? tax.ytd : null,
        taxYear: tax?.year ?? null,
        years,
      };
    });

  return (
    <main>
      <nav className="border-line bg-panel sticky top-0 z-100 flex min-h-[50px] items-center border-b px-[max(24px,calc((100%-1052px)/2))]">
        <span className="text-[15px] font-extrabold">Market Analytics</span>
        <span className="text-muted ml-2 text-[10px] font-semibold tracking-[.01em]">
          restaurants &amp; bars
        </span>
      </nav>
      <div className="wrap mx-auto w-full max-w-[1100px] px-6 pt-6 pb-16">
        <header className="relative isolate mt-1.5 mb-8">
          <Bloom
            color="accent"
            opacity={16}
            className="-top-24 -left-[20vw] h-[380px] w-[80vw]"
          />
          <p className="text-muted mb-2 text-[11px] font-semibold tracking-[.18em] uppercase">
            Lithuanian food service · {companiesJson.length} companies tracked
          </p>
          <h1 className="text-[clamp(42px,9vw,72px)] leading-[0.95] font-extrabold tracking-[-0.035em]">
            Restaurants &amp; bars
          </h1>
          <p className="text-muted mt-3 text-sm">
            {rows.length} companies with a filed statement · Registrų centras (data.gov.lt
            + bulk dump) + VMI taxes, scraped {rcJson.scrapedAt.slice(0, 10)}
          </p>
          <div className="from-accent mt-5 h-px w-full bg-gradient-to-r to-transparent opacity-40" />
        </header>
        <RestaurantsTable rows={rows} />
        <Footer />
      </div>
    </main>
  );
}
