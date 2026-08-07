import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { fmtEurFull, fmtInt } from "@/features/market-rough/format";
import { loadMarketData } from "@/features/market-rough/data";
import { loadProfiles } from "@/features/market-rough/profile";
import { segName } from "@/features/market-rough/segments";
import { TopNav } from "@/features/market-rough/TopNav";
import { PUBLIC_YEAR_FLOOR } from "@/features/market-rough/year-policy";
import { declaredRevenue } from "@/features/explore/declared-data";
import { SODRA } from "@/features/explore/sodra-data";
import { slugify, slugIndex } from "@/lib/slug";

/**
 * Static per-company page — the SEO surface of the dashboard. Everything the
 * charts show for one agency, as plain crawlable HTML: someone googling an
 * agency's name lands here, then clicks through to the interactive view.
 */

export function generateStaticParams() {
  return loadMarketData().brands.map((brand) => ({ slug: slugify(brand) }));
}

function companyData(slug: string) {
  const model = loadMarketData();
  const brand = slugIndex(model.brands).get(slug);
  if (!brand) return null;
  const years = Object.values(model.byBrand[brand] ?? {}).sort((a, b) => b.year - a.year);
  return { model, brand, years, profile: loadProfiles()[brand] };
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const data = companyData(slug);
  if (!data) return {};
  const latest = data.years.find((y) => y.revenue != null) ?? data.years[0];
  const bits = [
    latest?.revenue != null && `turnover ${fmtEurFull(latest.revenue)} (${latest.year})`,
    latest?.employees != null && `${latest.employees} employees`,
    latest?.avgSalary != null && `avg salary ${fmtEurFull(latest.avgSalary)}/mo`,
  ].filter(Boolean);
  return {
    title: `${data.brand} — turnover, salaries & profit`,
    description: `${data.years[0]?.company ?? data.brand}: ${bits.join(", ") || "financials"} — registry-sourced figures, ${PUBLIC_YEAR_FLOOR}–${data.model.last}.`,
    alternates: { canonical: `/companies/${slug}` },
  };
}

/** Per-year min–max of a Sodra monthly series (insured counts, wages) —
    "34–41" says more about an agency than the flat average would. */
function yearRanges(
  brand: string,
  pick: (m: { insured: number | null; avgWage: number | null }) => number | null,
  fmt: (n: number) => string,
): Record<number, string> {
  const months = SODRA.find((c) => c.brand === brand)?.months ?? [];
  const byYear: Record<number, number[]> = {};
  for (const m of months) {
    const v = pick(m);
    if (v == null) continue;
    (byYear[Math.floor(m.month / 100)] ??= []).push(v);
  }
  return Object.fromEntries(
    Object.entries(byYear).map(([year, values]) => {
      const min = fmt(Math.min(...values));
      const max = fmt(Math.max(...values));
      return [year, min === max ? min : `${min}–${max}`];
    }),
  );
}

export default async function CompanyPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const data = companyData(slug);
  if (!data) return null; // unreachable: params come from generateStaticParams
  const { model, brand, years, profile } = data;
  const meta = years[0];
  const dashHref = `/companies?companies=${encodeURIComponent(brand)}`;
  const empRange = yearRanges(brand, (m) => m.insured, String);
  const wageRange = yearRanges(
    brand,
    (m) => m.avgWage,
    (n) => `€${Math.round(n)}`,
  );

  // Peers: same main segment, by latest turnover — internal links that let
  // crawlers (and readers) walk the whole set without a 132-link footer.
  const peers = model.rows
    .filter(
      (r) =>
        r.year === model.last && r.brand !== brand && r.mainSegment === meta?.mainSegment,
    )
    .sort((a, b) => (b.revenue ?? -1) - (a.revenue ?? -1))
    .slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: meta?.company ?? brand,
    alternateName: brand,
    url: profile?.website ?? `https://marketanalytics.lt/companies/${slug}`,
    address: profile?.address
      ? { "@type": "PostalAddress", streetAddress: profile.address, addressCountry: "LT" }
      : undefined,
  };

  const facts: [string, string | null][] = [
    ["Full name", meta?.company ?? null],
    ["Segments", meta?.activities.map(segName).join(", ") || null],
    ["City", meta?.city || profile?.city || null],
    ["Founded", profile?.founded ?? null],
    ["CEO", profile?.ceo ?? null],
    ["Company code", profile?.code ?? null],
    ["VAT code", profile?.vat ?? null],
    ["Address", profile?.address ?? null],
  ];

  return (
    <main>
      <TopNav active="companies" />
      <div className="wrap mx-auto w-full max-w-[840px] px-6 pt-6 pb-16">
        <p className="text-muted mb-2 text-[11px] font-semibold tracking-[.18em] uppercase">
          Lithuanian {meta ? segName(meta.mainSegment ?? "") : ""} agency ·{" "}
          <span className="public-year-range">
            {PUBLIC_YEAR_FLOOR}–{model.last}
          </span>
          <span className="dev-year-range">
            {model.years[0]}–{model.last}
          </span>
        </p>
        <h1 className="text-ink text-[34px] leading-tight font-extrabold">{brand}</h1>
        {profile?.description && (
          <p className="text-muted mt-3 max-w-[620px] text-[14px]">
            {profile.description}
          </p>
        )}
        <Link
          href={dashHref}
          className="border-line bg-panel2 text-muted hover:text-ink mt-4 inline-block rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors"
        >
          Dashboard →
        </Link>

        <h2 className="text-ink mt-10 mb-3 text-[18px] font-bold">Financials by year</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              {/* Two header rows: sources on top, metrics under them — the
                  registry pair (gov), the company's own figure, the Sodra pair. */}
              <tr className="text-muted/70 text-left text-[10px] tracking-[.14em] uppercase">
                <th />
                <th colSpan={2} className="pt-2 pr-3 pb-0.5">
                  Registrų centras
                </th>
                <th className="pt-2 pr-3 pb-0.5">Company</th>
                <th colSpan={2} className="pt-2 pb-0.5">
                  Sodra
                </th>
              </tr>
              <tr className="text-muted border-line border-b text-left text-[11px] tracking-wider uppercase">
                <th className="py-2 pr-3">Year</th>
                <th className="py-2 pr-3">Turnover</th>
                <th className="py-2 pr-3">Profit</th>
                <th className="py-2 pr-3">Declared revenue</th>
                <th className="py-2 pr-3">Employees</th>
                <th className="py-2">Avg salary / mo</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr
                  key={y.year}
                  data-dev-only-year={y.year < PUBLIC_YEAR_FLOOR || undefined}
                  className="border-line border-b"
                >
                  <td className="py-2 pr-3 font-semibold">{y.year}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtEurFull(y.revenue)}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtEurFull(y.profit)}</td>
                  {/* Declared only — no modelled fallback: this column is the
                      company's own figure or nothing. */}
                  <td className="py-2 pr-3 tabular-nums">
                    {fmtEurFull(declaredRevenue(brand, y.year)?.revenue)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {empRange[y.year] ?? fmtInt(y.employees)}
                  </td>
                  <td className="py-2 tabular-nums">
                    {wageRange[y.year] ?? fmtEurFull(y.avgSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted mt-2 text-[11.5px]">
          Sources: Registrų centras filings (turnover, profit) and Sodra (headcount,
          salaries). Employees and salary are the year&apos;s min–max across Sodra&apos;s
          monthly figures; salaries are pre-tax monthly averages. Declared revenue is the
          agency&apos;s own figure, given to us directly — empty where the company
          hasn&apos;t provided one.
        </p>

        <h2 className="text-ink mt-10 mb-3 text-[18px] font-bold">Company facts</h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-[13px]">
          {facts
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          {profile?.website && (
            <div className="contents">
              <dt className="text-muted">Website</dt>
              <dd>
                <a
                  className="text-accent hover:underline"
                  href={profile.website}
                  rel="nofollow"
                >
                  {profile.website}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {peers.length > 0 && (
          <>
            <h2 className="text-ink mt-10 mb-3 text-[18px] font-bold">
              Other {segName(meta?.mainSegment ?? "")} agencies
            </h2>
            <ul className="flex flex-wrap gap-2 text-[13px]">
              {peers.map((p) => (
                <li key={p.brand}>
                  <Link
                    href={`/companies/${slugify(p.brand)}`}
                    className="border-line bg-panel hover:border-accent hover:text-accent inline-block rounded-full border px-3 py-1 transition-colors"
                  >
                    {p.brand}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/companies" className="text-accent px-1 py-1 hover:underline">
                  All {model.brands.length} agencies →
                </Link>
              </li>
            </ul>
          </>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Footer />
      </div>
    </main>
  );
}
