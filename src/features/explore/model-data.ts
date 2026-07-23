import legacyJson from "../../../data/data.json";
import companiesJson from "../../../data2/companies.json";
import { SODRA } from "./sodra-data";
import govJson from "../../../data2/gov_finance.json";
import rcJson from "../../../data2/rc_bulk.json";

/**
 * The rebuilt dataset, reshaped for the sheet. Everything here is sourced from
 * a public registry — nothing is derived, and nothing comes from the legacy
 * spreadsheet. Joined on jarCode, the one key both files share.
 */
/**
 * The three constants the model rests on, in one place so nobody has to hunt
 * for a magic number in a cell.
 */
export const MODEL = {
  /** Employer's own Sodra contribution, 1.77% on top of gross pay. Sodra
      publishes bruto — what the employee is paid before their own deductions —
      so the employer's cost is that plus this. It is NOT written into
      sodra_months.json: the scrape stays exactly what the source said. */
  employerSodra: 1.0177,
  /** Own opex as a share of employer labour cost. Assumes labour is ~70% of
      running cost. THE ONLY GUESS IN THE MODEL — everything else is filed. */
  opexOfLabour: 0.43,
  /** Corporate income tax, used ONLY to reconstruct a pre-tax profit the
      registry has not filed. Where `pretax` exists it wins: the filed figure
      beats a grossed-up one. Fabula 2024: 329 162 / 0,84 = 391 860 against a
      filed 392 552 — close, but there is no reason to prefer the estimate. */
  citRate: 0.16,
} as const;

export type Metric = {
  key: string;
  label: string;
  /** Hidden unless the viewer asks for it. */
  optional?: boolean;
  /** Where the figure comes from, shown in the row's hover title. */
  source: string;
};

/** Rows of the sheet, in filing order: what came in, what was left, what was paid. */
export const METRICS: Metric[] = [
  {
    key: "turnover",
    label: "Apyvarta",
    source: "Registrų centras — PARDAVIMO PAJAMOS, total sales including media billed on",
  },
  {
    // Not a filed line — the difference between the two that ARE filed. The
    // pre-tax figure itself said little the net one didn't; what it was
    // hiding is the tax, and that is worth a row of its own.
    key: "profitTax",
    label: "Pelno mokestis",
    source: "Registrų centras — PELNAS PRIEŠ APMOKESTINIMĄ minus GRYNASIS PELNAS",
  },
  {
    key: "profit",
    label: "Grynasis pelnas",
    source: "Registrų centras — GRYNASIS PELNAS (NUOSTOLIAI)",
  },
  // From Sodra's monthly record rather than the registry. They are here
  // because a cashflow is turnover minus what it cost to employ people, and
  // that cost is the one figure the registry filing never carries.
  {
    // Behind the ⚙ toggle: it is the payroll again, only 1.77% larger, and a
    // column that repeats its neighbour earns its place only on request.
    key: "employerCost",
    label: "Darbdavio kaštai (+1,77%)",
    source: "Metinis algų fondas × 1,0177 — payroll plus the employer's own Sodra",
    optional: true,
  },
  {
    key: "opex",
    label: "Veiklos sąnaudos (43%)",
    source:
      "Darbdavio kaštai × 0,43 — the assumption in the model: for every €100 of " +
      "labour, about €43 of rent, software, kit and admin. Not a filed figure.",
  },
  {
    key: "netRevenue",
    label: "Agentūros pajamos",
    source:
      "Darbdavio kaštai + veiklos sąnaudos + pelnas prieš mokesčius — what the " +
      "agency charged for its own work, before any pass-through media spend.",
  },
  {
    key: "wageBill",
    label: "Metinis algų fondas",
    source:
      "Sodra — the year's whole payroll: Σ (each month's wage × that month's headcount). " +
      "Summed month by month, not average × 12 — the two differ whenever headcount moves.",
  },
];

/**
 * Off the sheet, still in the data. VMI's paid-tax figure is cumulative from
 * January, so the current year is a part-year number sitting in a row of
 * full-year ones — it reads as a collapse rather than a partial. It stays in
 * gov_finance.json and in `company.values.taxes`, ready for a view that can
 * frame it properly.
 */
export const TAXES_METRIC: Metric = {
  key: "taxes",
  label: "Sumokėti mokesčiai",
  source: "VMI — cash paid into the state budget, cumulative from January",
};

/**
 * Where a single figure came from, and when it was taken. Two registries feed
 * this sheet and they do NOT agree on recency: the open-data snapshot of
 * Registrų centras trails filings by months, so 2025 is nearly empty there
 * while the registry's OWN daily dump already has it. Mixing them is only
 * honest if every cell says which one it is.
 *
 * `mark` is what the cell wears. Where one source was taken on several dates
 * the mark carries the instance number, so ◼¹ and ◼³ are visibly not the same
 * scrape. A source scraped only once needs no number.
 */
export type Provenance = {
  id: string;
  mark: string;
  label: string;
  /** ISO instant of the scrape this figure came from. */
  at: string;
};

const govScrapedAt = (govJson as { scrapedAt?: string }).scrapedAt ?? "";

export const GOV_SOURCE: Provenance = {
  id: "gov",
  mark: "◻",
  label: "Registrų centras / VMI via data.gov.lt",
  at: govScrapedAt,
};

/**
 * The same registry as GOV_SOURCE, but taken from Registrų centras directly
 * instead of the data.gov.lt mirror — and months ahead of it. Its own mark
 * because "which registry" and "which channel" are different questions, and it
 * is the channel that explains why one has FY2025 and the other does not.
 */
export const RC_SOURCE: Provenance = {
  id: "rc",
  mark: "◆",
  label: "Registrų centras, own bulk dump",
  at: (rcJson as { scrapedAt?: string }).scrapedAt ?? "",
};

export const SOURCES: Provenance[] = [GOV_SOURCE, RC_SOURCE];

type Filing = {
  year: number;
  turnover: number | null;
  profit: number | null;
  pretax: number | null;
  filedAt: string | null;
};
type Tax = { year: number; throughMonth: number | null; ytd: number | null };

export type Company = {
  brand: string;
  name: string | null;
  jarCode: string | null;
  /** metric key -> year -> value. Missing means the registry has no figure. */
  values: Record<string, Record<number, number | null>>;
  /** Years whose tax figure is only part of the year, e.g. through month 5. */
  partialTax: Record<number, number>;
  filedAt: Record<number, string | null>;
  /** metric key -> year -> which scrape that figure came from. */
  sources: Record<string, Record<number, Provenance>>;
};

const gov = govJson as {
  companies: {
    jarCode: string;
    financials: Filing[];
    taxes?: Tax[];
  }[];
};

const byJar = new Map(gov.companies.map((company) => [company.jarCode, company]));

const rcByJar = new Map(
  (rcJson as { companies: { jarCode: string; financials: Filing[] }[] }).companies.map(
    (company) => [company.jarCode, company],
  ),
);

/** The three figures a filing carries, in the order the sheet shows them. */
const FILED = ["turnover", "pretax", "profit"] as const;

export const COMPANIES: Company[] = (
  companiesJson as { brand: string; name: string | null; jarCode: string | null }[]
)
  .map((entry) => {
    const source = entry.jarCode ? byJar.get(entry.jarCode) : undefined;
    const values: Company["values"] = {
      turnover: {},
      pretax: {},
      profit: {},
      taxes: {},
      profitTax: {},
      employerCost: {},
      opex: {},
      netRevenue: {},
      impliedOpex: {},
      headcount: {},
      wageBill: {},
    };
    const partialTax: Record<number, number> = {};
    const filedAt: Record<number, string | null> = {};
    const sources: Company["sources"] = {
      turnover: {},
      pretax: {},
      profit: {},
      taxes: {},
      profitTax: {},
    };
    for (const filing of source?.financials ?? []) {
      for (const key of FILED) {
        values[key][filing.year] = filing[key];
        if (filing[key] != null) sources[key][filing.year] = GOV_SOURCE;
      }
      filedAt[filing.year] = filing.filedAt;
    }

    // Then RC's own dump, which carries the filing season the mirror has not
    // harvested yet. Checked against the mirror on the 130 filings both hold:
    // they agree on every figure, so this only ever ADDS years.
    for (const filing of (entry.jarCode ? rcByJar.get(entry.jarCode) : undefined)
      ?.financials ?? []) {
      for (const key of FILED) {
        if (filing[key] == null || values[key][filing.year] != null) continue;
        values[key][filing.year] = filing[key];
        sources[key][filing.year] = RC_SOURCE;
        filedAt[filing.year] ??= filing.filedAt;
      }
    }

    // Rekvizitai used to fill gaps here. It is gone: it resells the same
    // registry filings, and once RC's own dump was wired in it contributed
    // ZERO figures neither gov nor rc_bulk already had — checked across all
    // 552 of its turnover values. A source that adds nothing is not a source,
    // only another thing that can drift.
    for (const tax of source?.taxes ?? []) {
      values.taxes[tax.year] = tax.ytd;
      if (tax.ytd != null) sources.taxes[tax.year] = GOV_SOURCE;
      // 12 is a whole year; anything less is year-to-date and must say so.
      if (tax.throughMonth && tax.throughMonth < 12)
        partialTax[tax.year] = tax.throughMonth;
    }
    // Corporate income tax: what the company kept, taken off what it earned
    // before tax. Only where BOTH were filed — a subtraction with one side
    // missing is not a zero, it is an unknown.
    for (const [year, pretax] of Object.entries(values.pretax)) {
      const net = values.profit[Number(year)];
      if (pretax == null || net == null) {
        values.profitTax[Number(year)] = null;
        continue;
      }
      values.profitTax[Number(year)] = pretax - net;
      // A derived figure is only as traceable as its inputs; it wears the
      // provenance of the pre-tax line it was taken from.
      const from = sources.pretax[Number(year)];
      if (from) sources.profitTax[Number(year)] = from;
    }

    // Sodra's yearly rollups, joined on jarCode — the key both datasets share.
    // A cashflow is turnover minus what it cost to employ people, and that cost
    // is the one figure a registry filing never carries.
    const sodra = entry.jarCode
      ? SODRA.find((company) => company.jarCode === entry.jarCode)
      : undefined;
    for (const year of Object.values(sodra?.years ?? {})) {
      values.headcount[year.year] =
        year.avgHeadcount == null ? null : Math.round(year.avgHeadcount);
      values.wageBill[year.year] =
        year.wageBill == null ? null : Math.round(year.wageBill);
    }

    // The derived layer. Wages are sourced and profit is sourced; what the
    // model adds is the opex assumption on top of them.
    for (const year of Object.keys(values.wageBill).map(Number)) {
      const payroll = values.wageBill[year];
      if (payroll == null) continue;
      const employer = payroll * MODEL.employerSodra;
      values.employerCost[year] = Math.round(employer);
      values.opex[year] = Math.round(employer * MODEL.opexOfLabour);

      // Pre-tax profit: filed if the registry has it, otherwise the net figure
      // grossed back up. The fallback exists for years RC has not published.
      const filedPretax = values.pretax[year];
      const net = values.profit[year];
      const beforeTax = filedPretax ?? (net == null ? null : net / (1 - MODEL.citRate));
      const modelled =
        beforeTax == null ? null : employer * (1 + MODEL.opexOfLabour) + beforeTax;
      // An agency cannot keep more than it billed. Where the model says
      // otherwise the SOURCED figure wins and the result is capped at turnover
      // — 22 of 774 company-years hit this, and every one of them means the
      // 0,43 opex share is too high for that company (a low-margin reseller,
      // or a firm whose staff cost is nearly all of its cost).
      const turnover = values.turnover[year];
      values.netRevenue[year] =
        modelled == null
          ? null
          : Math.round(turnover != null ? Math.min(modelled, turnover) : modelled);
      if (modelled != null && turnover != null && modelled > turnover) {
        // What opex share would have fitted. Kept so the assumption can be
        // revisited against evidence rather than argued about.
        values.impliedOpex[year] =
          Math.round(((turnover - beforeTax!) / employer - 1) * 100) / 100;
      }
    }

    return { ...entry, values, partialTax, filedAt, sources };
  })
  .sort((a, b) => a.brand.localeCompare(b.brand, "lt"));

/**
 * Which service segments a brand trades in, joined from the legacy dataset on
 * the brand name. The rebuilt data2/ files carry registry figures only — no
 * activity classification — so this is the one field the sheet still borrows
 * from data.json. Brand is the join key because data2 has no segment column to
 * match on; a brand missing there simply has no segments and is only ever shown
 * unfiltered.
 */
const SEGMENTS_BY_BRAND = new Map<string, string[]>(
  (legacyJson as { brand: string; activities: string[] }[]).map((row) => [
    row.brand,
    row.activities,
  ]),
);

export const segmentsOf = (brand: string) => SEGMENTS_BY_BRAND.get(brand) ?? [];

/** Every segment present, sorted — the filter's option list. */
export const SEGMENTS: string[] = [
  ...new Set([...SEGMENTS_BY_BRAND.values()].flat()),
].sort();

/** Every year any company has a figure for, oldest first. */
export const YEARS: number[] = [
  ...new Set(
    // Only years a SHOWN metric has a figure for. Taxes run to 2026 while
    // filings stop at 2025, and a column no visible row can fill is just a
    // blank stripe down the sheet.
    COMPANIES.flatMap((company) =>
      METRICS.flatMap((metric) =>
        Object.entries(company.values[metric.key] ?? {})
          .filter(([, value]) => value != null)
          .map(([year]) => Number(year)),
      ),
    ),
  ),
].sort((a, b) => a - b);
