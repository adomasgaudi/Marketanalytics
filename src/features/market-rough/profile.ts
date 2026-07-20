import rek from "../../../data/rek_tabs.json";
import sheets from "../../../data/sheets_data.json";

/** Per-brand profile bits for the company info box — founded date & website
    from the Įmonės raw sheet, CEO/description/website from Rekvizitai tabs
    (mirrors the legacy FOUNDED/WEBSITE/REK_* maps). */
export type CompanyProfile = {
  ceo: string | null;
  founded: string | null;
  website: string | null;
  description: string | null;
  /** Data sources available for the brand (legacy REK_HAS; Initial is always there). */
  rekvizitai: boolean;
  sodra: boolean;
};

type Sheet = { columns: string[]; rows: (string | number | null)[][] };
type RekCompany = {
  brand?: string;
  tabs?: Record<string, { rows: [string, string][] }>;
};

export function loadProfiles(): Record<string, CompanyProfile> {
  const out: Record<string, CompanyProfile> = {};
  const get = (brand: string) =>
    (out[brand] ??= {
      ceo: null,
      founded: null,
      website: null,
      description: null,
      rekvizitai: false,
      sodra: false,
    });

  // Sodra files are keyed by jarCode (data/sodra/<code>.json), matched via the
  // "Įmonės kodas" field of the Rekvizitai Įmonė tab (as legacy build_site.py).
  let sodraCodes = new Set<string>();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const dir = path.join(process.cwd(), "data", "sodra");
    sodraCodes = new Set(
      fs.readdirSync(dir).map((f: string) => f.replace(/\.json$/, "")),
    );
  } catch {
    /* no sodra dir — all sodra flags stay false */
  }

  const sh = (sheets as Record<string, Sheet>)["Įmonės"];
  if (sh) {
    const bi = sh.columns.indexOf("Pagrindinis brandas");
    const fi = sh.columns.indexOf("Įregistruota");
    const wi = sh.columns.indexOf("Svetainė");
    for (const r of sh.rows) {
      const brand = String(r[bi] ?? "").trim();
      if (!brand) continue;
      const p = get(brand);
      const founded = String(r[fi] ?? "").trim();
      if (founded) p.founded = founded;
      const web = String(r[wi] ?? "").trim();
      if (web && /\./.test(web)) p.website = web;
    }
  }

  for (const c of (rek as unknown as { companies?: RekCompany[] }).companies ?? []) {
    if (!c.brand) continue;
    const rows = c.tabs?.["Įmonė"]?.rows ?? [];
    const g = (k: string) => rows.find((r) => r[0] === k)?.[1] || null;
    const p = get(c.brand);
    p.ceo = g("Vadovas") ?? p.ceo;
    p.description = g("Įmonės aprašymas") ?? p.description;
    // Rekvizitai website wins over the sheet, as in the legacy.
    p.website = g("Tinklalapis") ?? p.website;
    p.rekvizitai = Object.keys(c.tabs ?? {}).length > 0;
    const code = g("Įmonės kodas");
    p.sodra = code != null && sodraCodes.has(String(code).trim());
  }
  return out;
}
