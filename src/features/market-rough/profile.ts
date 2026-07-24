import classification from "../../../data2/classification.json";

/** Per-brand profile bits for the company info box. All fields come from
    data2/classification.json — the one-time migrated snapshot of the legacy
    company data (see its _meta.source). */
export type CompanyProfile = {
  ceo: string | null;
  founded: string | null;
  website: string | null;
  description: string | null;
  // Contact + registry fields from the migrated snapshot.
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
  /** Whether the brand has a rekvizitai-sourced profile (CEO or description). */
  rekvizitai: boolean;
  sodra: boolean;
};

type Classified = Partial<Omit<CompanyProfile, "rekvizitai" | "sodra">>;

export function loadProfiles(): Record<string, CompanyProfile> {
  const out: Record<string, CompanyProfile> = {};
  const companies = (classification as { companies: Record<string, Classified> })
    .companies;
  for (const [brand, c] of Object.entries(companies)) {
    out[brand] = {
      ceo: c.ceo ?? null,
      founded: c.founded ?? null,
      website: c.website ?? null,
      description: c.description ?? null,
      code: c.code ?? null,
      vat: c.vat ?? null,
      evrkCode: c.evrkCode ?? null,
      evrkActivity: c.evrkActivity ?? null,
      address: c.address ?? null,
      city: c.city ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
      rekvizitaiUrl: c.rekvizitaiUrl ?? null,
      facebook: c.facebook ?? null,
      instagram: c.instagram ?? null,
      linkedin: c.linkedin ?? null,
      rekvizitai: Boolean(c.ceo || c.description),
      sodra: false,
    };
  }
  return out;
}
