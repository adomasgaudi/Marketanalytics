export type CompanyYear = {
  company: string;
  brand: string;
  year: number;
  activities?: string[];
  city?: string;
  employees?: number;
  avgSalary?: number;
  salaryCosts?: number;
  revenue?: number;
  profit?: number;
  nonSalaryCosts?: number;
  estimatedIncome?: number;
};

export type MarketModel = {
  rows: CompanyYear[];
  brands: string[];
  years: number[];
  latestYear: number;
  latestRows: CompanyYear[];
  totals: {
    revenue: number;
    profit: number;
    employees: number;
  };
};
