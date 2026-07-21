// Generates data/sheets_data_kv.json — the VIEWER-ONLY reshaped copy of
// data/sheets_data.json (the site still consumes the original):
//   - every sheet: rows -> objects keyed by company name (+ year when present)
//   - Įmonės / Įmonės-analizei: flat columns grouped into logical sub-objects
// Rerun after the source changes: node scripts/make-sheets-kv.mjs
import { readFileSync, writeFileSync } from "node:fs";

const src = JSON.parse(readFileSync("data/sheets_data.json", "utf8"));

// Per-sheet grouping rules — first matching regex wins; the trailing /./ rule
// is a catch-all so no column is ever dropped. Sheets not listed stay flat.
const GROUPS = {
  Įmonės: [
    ["pavadinimas", /^(Pavadinimas|Pagrindinis brandas|Įmonė)$/],
    ["web", /^(Svetainė|Rekvizitai URL|Facebook|Instagram|LinkedIn)$/],
    ["kodai", /^(Kodas|PVM kodas|EVRK v2 veiklos kodas)$/],
    ["veikla", /^(EVRK v2 veikla|Veikla \()/],
    ["kontaktai", /^(Adresas|Miestas|El\. paštas|Telefonas|Mobilus)$/],
    ["darbuotojai", /^(Darbuotojai|Darb\. Pokytis)/],
    ["atlyginimai", /^(Atlyginimų|Ne atlyginimų|Atl ?\. ?Pokytis)/],
    ["finansai", /^(Apyvarta|Apyvart\.|Grynasis pelnas|Gr\. Peln\.|Skola Sodrai)/],
    ["kita", /./],
  ],
  "Įmonės-analizei": [
    ["pavadinimas", /^(Įmonės pavadinimas|Pagrindinis brandas|Metai)$/],
    ["veikla", /^Veikla \(/],
    ["darbuotojai", /^Darbuotojų/],
    ["atlyginimai", /^(Atlyginimo|DU sąnaud)/],
    ["finansai", /^(Apyvart|Ne-atlyginimų|Peln|Fiks|Spėjamos)/],
    ["kita", /./],
  ],
};

// Groups whose columns come as value + "…pokytis…" (change) pairs. Inside them
// each metric becomes { reikšmė, pokytis } so the year-on-year difference is
// explicit rather than a sibling column you have to spot by name.
const PAIRED = new Set(["darbuotojai", "atlyginimai", "finansai"]);

// Turn a flat {col: val} slice into {metric: {reikšmė, pokytis}} — a "…pokytis…"
// column attaches to the most recent base metric (they are adjacent in source).
function pairChanges(entries) {
  const out = {};
  let base = null;
  for (const [k, v] of entries) {
    if (/pokyt/i.test(k)) {
      if (base) out[base].pokytis = v;
      else out[k] = { reikšmė: v };
    } else {
      base = k;
      out[k] = { reikšmė: v };
    }
  }
  return out;
}

function group(sheet, flat) {
  const rules = GROUPS[sheet];
  if (!rules) return flat;
  const buckets = {};
  for (const [k, v] of Object.entries(flat)) {
    const [name] = rules.find(([, re]) => re.test(k));
    (buckets[name] ??= []).push([k, v]);
  }
  const g = {};
  for (const [name, entries] of Object.entries(buckets))
    g[name] = PAIRED.has(name) ? pairChanges(entries) : Object.fromEntries(entries);
  return g;
}

const out = {};
for (const [sheet, { columns, rows }] of Object.entries(src)) {
  const yearIdx = columns.indexOf("Metai");
  const o = {};
  rows.forEach((r, n) => {
    let flat = {};
    columns.forEach((c, i) => {
      flat[c || `col${i + 1}`] = r[i] ?? null;
    });
    flat = group(sheet, flat);
    let key = String(r[0] ?? "").trim() || `row-${n + 1}`;
    if (yearIdx > -1 && r[yearIdx] != null) key += ` — ${r[yearIdx]}`;
    let k = key,
      d = 2;
    while (k in o) k = `${key} (${d++})`;
    o[k] = flat;
  });
  out[sheet] = o;
}

writeFileSync("data/sheets_data_kv.json", JSON.stringify(out, null, 1));
console.log(
  "written data/sheets_data_kv.json:",
  Object.entries(out)
    .map(([s, o]) => `${s} (${Object.keys(o).length})`)
    .join(", "),
);
