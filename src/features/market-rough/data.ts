import raw from "../../../data/data.json";
import workbook from "../../../data/workbook.json";
import { canonSegment } from "./segments";
import type { CompanyYear, MarketModel } from "./types";

const rows = raw as CompanyYear[];

/** Per-brand main segment from the workbook Main sheet Veikla column. */
function loadMainSegmentByBrand(): Record<string, string> {
  const sheet = workbook.sheets.find((s) => s.name === "Main");
  if (!sheet) return {};
  const hdr = sheet.values[0] as string[];
  const bi = hdr.indexOf("Pagrindinis brandas");
  const vi = hdr.indexOf("Veikla");
  if (bi < 0 || vi < 0) return {};
  const out: Record<string, string> = {};
  for (const row of sheet.values.slice(1)) {
    const brand = String(row[bi] ?? "").trim();
    const rawSeg = row[vi];
    if (!brand || rawSeg == null || rawSeg === "") continue;
    const seg = canonSegment(String(rawSeg));
    if (seg) out[brand] = seg;
  }
  return out;
}

const mainByBrand = loadMainSegmentByBrand();

const enrich = (row: CompanyYear): CompanyYear => ({
  ...row,
  mainSegment: mainByBrand[row.brand] ?? row.activities[0] ?? "Other",
});

/** Builds the indexes the legacy dashboard derives at load (byBrand, BRANDS,
    SEGMENTS, YEARS, LAST, FIN_YEARS). Runs on the server; the model is handed
    down to the views. */
export function loadMarketData(): MarketModel {
  const enriched = rows.map(enrich);
  const years = [...new Set(enriched.map((row) => row.year))].sort((a, b) => a - b);

  const last = Math.max(
    ...enriched.filter((row) => row.revenue != null).map((row) => row.year),
  );
  const finYears = years.filter((year) => year <= last);

  const byBrand: Record<string, Record<number, CompanyYear>> = {};
  for (const row of enriched) {
    (byBrand[row.brand] ??= {})[row.year] = row;
  }

  return {
    rows: enriched,
    byBrand,
    brands: Object.keys(byBrand),
    segments: [...new Set(enriched.flatMap((row) => row.activities))].sort(),
    years,
    last,
    finYears,
  };
}
