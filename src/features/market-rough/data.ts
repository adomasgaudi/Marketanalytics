import raw from "../../../data/data.json";
import type { CompanyYear, MarketModel } from "./types";

const rows = raw as CompanyYear[];

/** Builds the indexes the legacy dashboard derives at load (byBrand, BRANDS,
    SEGMENTS, YEARS, LAST, FIN_YEARS). Runs on the server; the model is handed
    down to the views. */
export function loadMarketData(): MarketModel {
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);

  // Latest year that actually carries financials — a year with headcount but no
  // filings shouldn't become the default for the money views.
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
    // Insertion order, as in the legacy — not sorted.
    brands: Object.keys(byBrand),
    segments: [...new Set(rows.flatMap((row) => row.activities))].sort(),
    years,
    last,
    finYears,
  };
}
