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
  // Contact + registry fields from the raw Įmonės sheet, so the profile card can
  // carry the same detail the /explore field grid shows.
  code: string | null;
  vat: string | null;
  evrkCode: string | null;
  evrkActivity: string | null;
  address: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  rekvizitaiUrl: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  /** Data sources available for the brand (legacy REK_HAS; Initial is always there). */
  rekvizitai: boolean;
  sodra: boolean;
};

type Sheet = { columns: string[]; rows: (string | number | null)[][] };
type RekCompany = {
  slug?: string;
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
      code: null,
      vat: null,
      evrkCode: null,
      evrkActivity: null,
      address: null,
      city: null,
      email: null,
      phone: null,
      rekvizitaiUrl: null,
      facebook: null,
      instagram: null,
      linkedin: null,
      rekvizitai: false,
      sodra: false,
    });

  // Sodra files are named after the company slug (data/sodra/<slug>.json), so
  // the directory listing IS the set of slugs that have Sodra data.
  let sodraSlugs = new Set<string>();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const dir = path.join(process.cwd(), "data", "sodra");
    sodraSlugs = new Set(
      fs.readdirSync(dir).map((f: string) => f.replace(/\.json$/, "")),
    );
  } catch {
    /* no sodra dir — all sodra flags stay false */
  }

  const sh = (sheets as Record<string, Sheet>)["Įmonės"];
  if (sh) {
    const idx = (name: string) => sh.columns.indexOf(name);
    // The sheet stores numeric codes as floats ("124099127.0"); strip the tail
    // and treat empty / "null" as absent.
    const clean = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s && s.toLowerCase() !== "null" ? s.replace(/\.0+$/, "") : "";
    };
    const bi = idx("Pagrindinis brandas");
    const C = {
      founded: idx("Įregistruota"),
      website: idx("Svetainė"),
      code: idx("Kodas"),
      vat: idx("PVM kodas"),
      evrkCode: idx("EVRK v2 veiklos kodas"),
      evrkActivity: idx("EVRK v2 veikla"),
      address: idx("Adresas"),
      city: idx("Miestas"),
      email: idx("El. paštas"),
      phone: idx("Telefonas"),
      mobile: idx("Mobilus"),
      rekvizitaiUrl: idx("Rekvizitai URL"),
      facebook: idx("Facebook"),
      instagram: idx("Instagram"),
      linkedin: idx("LinkedIn"),
    };
    for (const r of sh.rows) {
      const brand = String(r[bi] ?? "").trim();
      if (!brand) continue;
      const p = get(brand);
      const founded = clean(r[C.founded]);
      if (founded) p.founded = founded;
      const web = clean(r[C.website]);
      if (web && /\./.test(web)) p.website = web;
      p.code = clean(r[C.code]) || p.code;
      p.vat = clean(r[C.vat]) || p.vat;
      p.evrkCode = clean(r[C.evrkCode]) || p.evrkCode;
      p.evrkActivity = clean(r[C.evrkActivity]) || p.evrkActivity;
      p.address = clean(r[C.address]) || p.address;
      p.city = clean(r[C.city]) || p.city;
      p.email = clean(r[C.email]) || p.email;
      // Landline first, else mobile; both come as bare digits.
      p.phone = clean(r[C.phone]) || clean(r[C.mobile]) || p.phone;
      p.rekvizitaiUrl = clean(r[C.rekvizitaiUrl]) || p.rekvizitaiUrl;
      p.facebook = clean(r[C.facebook]) || p.facebook;
      p.instagram = clean(r[C.instagram]) || p.instagram;
      p.linkedin = clean(r[C.linkedin]) || p.linkedin;
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
    p.sodra = c.slug != null && sodraSlugs.has(c.slug);
  }
  return out;
}
