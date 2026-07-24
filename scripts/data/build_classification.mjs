// One-time migration snapshot: lift the per-brand data that has NO registry
// source — segments, main segment, city, credit risk, and the profile/contact
// fields — out of the legacy data/ set and into data2/classification.json, so
// the dashboard can read it after data/ is deleted.
//
// These figures descend from the owner's spreadsheet and rekvizitai.lt, not a
// public registry, so they break data2's registry-only rule by design (owner
// approved). The file records that in `_meta.source`. It is a SNAPSHOT: once
// data/ is gone this script cannot be re-run, which is the point — the data it
// captures is frozen anyway.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));

const data = read("data/data.json");
const workbook = read("data/workbook.json");
const sheets = read("data/sheets_data.json");
const rek = read("data/rek_tabs.json");

// --- segment canon, mirrored from src/features/market-rough/segments.ts ---
const SEGMENT_KEYS = ["Media", "Digital media", "Kūryba", "PR",
  "Production house", "BTL", "PA", "Konsultantai", "Renginiai"];
const canonSegment = (raw) => {
  const t = String(raw).trim().toLowerCase();
  return SEGMENT_KEYS.find((s) => s.toLowerCase() === t) ?? null;
};

// mainSegment: workbook Main sheet Veikla column, canonicalised (loadMarketData).
const mainByBrand = {};
const main = workbook.sheets.find((s) => s.name === "Main");
if (main) {
  const hdr = main.values[0];
  const bi = hdr.indexOf("Pagrindinis brandas");
  const vi = hdr.indexOf("Veikla");
  for (const row of main.values.slice(1)) {
    const brand = String(row[bi] ?? "").trim();
    const seg = row[vi] == null ? null : canonSegment(String(row[vi]));
    if (brand && seg) mainByBrand[brand] = seg;
  }
}

// Profile/contact fields: Įmonės sheet, keyed by brand (mirrors profile.ts).
const clean = (v) => {
  const s = String(v ?? "").trim();
  return s && s.toLowerCase() !== "null" ? s.replace(/\.0+$/, "") : "";
};
const sh = sheets["Įmonės"];
const col = (name) => sh.columns.indexOf(name);
const SHEET_COLS = {
  founded: col("Įregistruota"), website: col("Svetainė"), code: col("Kodas"),
  vat: col("PVM kodas"), evrkCode: col("EVRK v2 veiklos kodas"),
  evrkActivity: col("EVRK v2 veikla"), address: col("Adresas"),
  city: col("Miestas"), email: col("El. paštas"), phone: col("Telefonas"),
  mobile: col("Mobilus"), rekvizitaiUrl: col("Rekvizitai URL"),
  facebook: col("Facebook"), instagram: col("Instagram"), linkedin: col("LinkedIn"),
};
const bi = col("Pagrindinis brandas");
const sheetByBrand = {};
for (const r of sh.rows) {
  const brand = String(r[bi] ?? "").trim();
  if (!brand) continue;
  const g = (k) => clean(r[SHEET_COLS[k]]);
  sheetByBrand[brand] = {
    founded: g("founded"), website: g("website"), code: g("code"),
    vat: g("vat"), evrkCode: g("evrkCode"), evrkActivity: g("evrkActivity"),
    address: g("address"), email: g("email"), phone: g("phone") || g("mobile"),
    rekvizitaiUrl: g("rekvizitaiUrl"), facebook: g("facebook"),
    instagram: g("instagram"), linkedin: g("linkedin"),
  };
}

// CEO / description / website from the Rekvizitai Įmonė tab (rek wins on website).
const rekByBrand = {};
for (const c of rek.companies ?? []) {
  if (!c.brand) continue;
  const rows = c.tabs?.["Įmonė"]?.rows ?? [];
  const g = (k) => rows.find((row) => row[0] === k)?.[1] || "";
  rekByBrand[c.brand] = {
    ceo: g("Vadovas"), description: g("Įmonės aprašymas"), website: g("Tinklalapis"),
  };
}

// One row per brand — activities/city/risk are constant per brand in data.json
// (verified), so the first row for a brand carries them losslessly.
const seen = new Set();
const companies = {};
for (const r of data) {
  if (seen.has(r.brand)) continue;
  seen.add(r.brand);
  const s = sheetByBrand[r.brand] ?? {};
  const rk = rekByBrand[r.brand] ?? {};
  const val = (a, b) => a || b || null;
  companies[r.brand] = {
    company: r.company,
    activities: r.activities,
    mainSegment: mainByBrand[r.brand] ?? r.activities[0] ?? null,
    city: r.city || s.city || null,
    risk: r.risk || null,
    ceo: rk.ceo || null,
    founded: s.founded || null,
    website: val(rk.website, s.website),
    description: rk.description || null,
    code: val(s.code), vat: val(s.vat),
    evrkCode: val(s.evrkCode), evrkActivity: val(s.evrkActivity),
    address: val(s.address), email: val(s.email), phone: val(s.phone),
    rekvizitaiUrl: val(s.rekvizitaiUrl), facebook: val(s.facebook),
    instagram: val(s.instagram), linkedin: val(s.linkedin),
  };
}

const out = {
  _meta: {
    source:
      "migrated one-time from legacy data/ (owner spreadsheet + rekvizitai.lt); " +
      "NON-registry — segments, city, risk and contact fields have no public-registry origin",
    fields: "per brand: company, activities, mainSegment, city, risk, and profile/contact",
    brands: Object.keys(companies).length,
  },
  companies,
};
writeFileSync(resolve(root, "data2/classification.json"), JSON.stringify(out, null, 1));
console.log("written data2/classification.json:", Object.keys(companies).length, "brands");
