// Example: turn data/sheets_data_kv.json ("Įmonės" sheet) into SQL tables.
// Emits data/sheets_data.sql — plain DDL + INSERTs, loadable by sqlite3/duckdb.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/sheets_data_kv.json";
const OUT = "data/sheets_data.sql";

const FLAT = ["pavadinimas", "web", "kodai", "veikla", "kontaktai", "kita"];
const SERIES = ["darbuotojai", "atlyginimai", "finansai"];

const q = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const num = (v) => (v == null || v === "" || isNaN(+v) ? "NULL" : String(+v));

// "Apyvarta 2024" -> { metric: 'Apyvarta', year: 2024 }; no year -> year NULL
function split(field) {
  const m = field.match(/^(.*?)\s+(\d{4})(?:\s.*)?$/);
  return m ? { metric: m[1], year: +m[2] } : { metric: field, year: null };
}

const sheet = JSON.parse(readFileSync(SRC, "utf8"))["Įmonės"];

// Collect the union of flat column names across all companies (sheets are ragged).
const cols = new Set();
for (const row of Object.values(sheet))
  for (const g of FLAT) for (const f of Object.keys(row[g] ?? {})) cols.add(f);
const colList = [...cols];

const lines = [
  "DROP TABLE IF EXISTS company_metric;",
  "DROP TABLE IF EXISTS company;",
  `CREATE TABLE company (\n  name TEXT PRIMARY KEY,\n${colList
    .map((c) => `  ${q(c)} TEXT`.replace(/'/g, '"'))
    .join(",\n")}\n);`,
  "CREATE TABLE company_metric (",
  "  company TEXT NOT NULL REFERENCES company(name),",
  "  metric  TEXT NOT NULL,",
  "  year    INTEGER,",
  "  value   REAL,",
  "  change  REAL,",
  "  PRIMARY KEY (company, metric, year)",
  ");",
];

for (const [name, row] of Object.entries(sheet)) {
  const vals = colList.map((c) => {
    for (const g of FLAT) if (row[g] && c in row[g]) return q(row[g][c]);
    return "NULL";
  });
  lines.push(`INSERT INTO company VALUES (${q(name)}, ${vals.join(", ")});`);

  for (const g of SERIES)
    for (const [field, cell] of Object.entries(row[g] ?? {})) {
      const { metric, year } = split(field);
      lines.push(
        `INSERT INTO company_metric VALUES (${q(name)}, ${q(metric)}, ` +
          `${year ?? "NULL"}, ${num(cell?.reikšmė)}, ${num(cell?.pokytis)});`,
      );
    }
}

writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`${OUT}: ${Object.keys(sheet).length} companies, ${lines.length} statements`);
