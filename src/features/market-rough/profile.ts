import companiesJson from "../../../data2/companies.json";
import sodraJson from "../../../data2/sodra_months.json";

/** Per-brand profile bits for the company info box. The rekvizitai-era
    fields (CEO, description, socials) died with the marketing branch; what
    remains is filled from data2/companies.json — registry code and EVRK —
    plus a Sodra-presence flag from the rolled-up sodra_months.json. */
export type CompanyProfile = {
  ceo: string | null;
  founded: string | null;
  website: string | null;
  description: string | null;
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
  /** Data sources available for the brand (Initial is always there). */
  rekvizitai: boolean;
  sodra: boolean;
};

const EVRK_LABEL: Record<string, string> = {
  "561000": "Restoranai ir pagaminto valgio teikimas",
  "562100": "Pokylių ir kitų renginių aptarnavimas",
  "562900": "Kitas maitinimo paslaugų teikimas",
  "563000": "Gėrimų pardavimo vartoti vietoje veikla",
};

export function loadProfiles(): Record<string, CompanyProfile> {
  const withSodra = new Set(
    sodraJson.companies.filter((c) => c.months.length).map((c) => c.jarCode),
  );
  const out: Record<string, CompanyProfile> = {};
  for (const c of companiesJson) {
    const brand = c.brand ?? c.name;
    if (!brand) continue;
    out[brand] = {
      ceo: null,
      founded: null,
      website: null,
      description: null,
      code: c.jarCode ?? null,
      vat: null,
      evrkCode: c.evrk ?? null,
      evrkActivity: EVRK_LABEL[c.evrk ?? ""] ?? null,
      address: null,
      city: null,
      email: null,
      phone: null,
      rekvizitaiUrl: null,
      facebook: null,
      instagram: null,
      linkedin: null,
      rekvizitai: false,
      sodra: withSodra.has(c.jarCode),
    };
  }
  return out;
}
