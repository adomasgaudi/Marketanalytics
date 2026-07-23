/** One row of data.json — a single {brand, year} record. 906 rows total. */
export type CompanyYear = {
  company: string;
  brand: string;
  year: number;
  /** Market segments the company operates in (Kūryba, PR, Media, ...). */
  activities: string[];
  /** One canonical segment for deduped counts — workbook Veikla when set. */
  mainSegment?: string;
  city: string;
  risk: string;
  /** Financials are null where a company has no filing for that year. */
  employees: number | null;
  avgSalary: number | null;
  salaryCosts: number | null;
  /** Turnover. */
  revenue: number | null;
  profit: number | null;
  nonSalaryCosts: number | null;
  /** Fee-based revenue. */
  estimatedIncome: number | null;
};

/** Indexes derived from the rows once, at load. */
export type MarketModel = {
  rows: CompanyYear[];
  /** Rows keyed by brand, then year. */
  byBrand: Record<string, Record<number, CompanyYear>>;
  brands: string[];
  segments: string[];
  years: number[];
  /** Latest year with financial data — the default year for headline views. */
  last: number;
  /** Years with financial coverage — the x-axis of the market charts. */
  finYears: number[];
};
