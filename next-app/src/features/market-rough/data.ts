import fs from "node:fs";
import path from "node:path";
import type { CompanyYear, MarketModel } from "./types";

function projectPath(...parts: string[]) {
  return path.join(process.cwd(), "..", ...parts);
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(fs.readFileSync(projectPath(...parts), "utf8")) as T;
}

function sum(rows: CompanyYear[], key: keyof Pick<CompanyYear, "revenue" | "profit" | "employees">) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

export function loadMarketData(): MarketModel {
  const rows = readJson<CompanyYear[]>("data", "data.json");
  const brands = [...new Set(rows.map((row) => row.brand).filter(Boolean))].sort();
  const years = [...new Set(rows.map((row) => row.year).filter(Boolean))].sort((a, b) => a - b);
  const latestYear = years.at(-1) ?? new Date().getFullYear();
  const latestRows = rows.filter((row) => row.year === latestYear);

  return {
    rows,
    brands,
    years,
    latestYear,
    latestRows,
    totals: {
      revenue: sum(latestRows, "revenue"),
      profit: sum(latestRows, "profit"),
      employees: sum(latestRows, "employees"),
    },
  };
}
