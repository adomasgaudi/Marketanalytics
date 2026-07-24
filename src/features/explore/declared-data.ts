import declaredJson from "../../../data2/declared_revenue.json";
// Type-only import: erased at compile time, so no runtime cycle with
// model-data.ts (which imports this file for the override itself).
import type { Provenance } from "./model-data";

/**
 * Company-declared revenue — data2/declared_revenue.json. Hard data, not
 * derived: where a company has told us its actual agency revenue, that figure
 * beats the modelled one (sourced beats derived), and opex stops being the
 * 0.43-of-labour guess and becomes what the declared figure leaves room for.
 */
export type DeclaredEntry = { revenue: number; from: string; at: string };

const COMPANIES = (
  declaredJson as { companies: Record<string, Record<string, DeclaredEntry>> }
).companies;

export function declaredRevenue(brand: string, year: number): DeclaredEntry | null {
  return COMPANIES[brand]?.[String(year)] ?? COMPANIES[brand]?.[year] ?? null;
}

export const DECLARED_SOURCE: Omit<Provenance, "at"> = {
  id: "declared",
  mark: "D",
  label: "Company-declared — given to us by the agency itself",
};
