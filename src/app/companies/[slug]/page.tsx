import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { fmtEurFull, fmtInt } from "@/features/market-rough/format";
import { loadMarketData } from "@/features/market-rough/data";
import { loadProfiles } from "@/features/market-rough/profile";
import { segName } from "@/features/market-rough/segments";
import { TopNav } from "@/features/market-rough/TopNav";
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
    description: `${data.years[0]?.company ?? data.brand}: ${bits.join(", ") || "financials"} — registry-sourced figures, ${data.model.years[0]}–${data.model.last}.`,
    alternates: { canonical: `/companies/${slug}` },
  };
}

/** Headcount range within a year, from Sodra's monthly insured counts —
    "34–41" says more about an agency than the flat average would. */
function employeeRange(brand: string): Record<number, string> {
  const months = SODRA.find((c) => c.brand === brand)?.months ?? [];
  const byYear: Record<number, number[]> = {};
  for (const m of months) {
    if (m.insured == null) continue;
    (byYear[Math.floor(m.month / 100)] ??= []).push(m.insured);
  }
  return Object.fromEntries(
    Object.entries(byYear).map(([year, counts]) => {
      const min = Math.min(...counts);
      const max = Math.max(...counts);
      return [year, min === max ? String(min) : `${min}–${max}`];
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
  const empRange = employeeRange(brand);

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
          {model.years[0]}–{model.last}
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
          Open {brand} in the interactive dashboard →
        </Link>

        <h2 className="text-ink mt-10 mb-3 text-[18px] font-bold">Financials by year</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="text-muted border-line border-b text-left text-[11px] tracking-wider uppercase">
                <th className="py-2 pr-3">Year</th>
                <th className="py-2 pr-3">Turnover</th>
                <th className="py-2 pr-3">Profit</th>
                <th className="py-2 pr-3">Employees</th>
                <th className="py-2">Avg salary / mo</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year} className="border-line border-b">
                  <td className="py-2 pr-3 font-semibold">{y.year}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtEurFull(y.revenue)}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtEurFull(y.profit)}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {empRange[y.year] ?? fmtInt(y.employees)}
                  </td>
                  <td className="py-2 tabular-nums">{fmtEurFull(y.avgSalary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted mt-2 text-[11.5px]">
          Sources: Registrų centras filings (turnover, profit) and Sodra (headcount,
          salaries). Employees is the year&apos;s min–max of Sodra&apos;s monthly insured
          counts; salaries are monthly averages before tax.
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
