// Folds what Įmonės-analizei alone knows into the Main sheet, matching companies by name.
//
//   node scripts/data/workbook/merge-analizei-into-main.mjs --check   # report only, writes nothing
//   node scripts/data/workbook/merge-analizei-into-main.mjs           # apply to data/workbook.json
//
// Run it after scripts/extract-workbook.mjs and scripts/merge-raw-into-imones.mjs.
//
// analizei is long format — one row per company-year — so its figures land in Main's wide
// "<metric> <year>" columns. Two things come across:
//
//   activity  analizei marks nine categories where Main knows only four, and marks them far
//             more completely (42 companies as Digital media against Main's 5)
//   companies 7 sprendimai, MB and Wrks, UAB appear only in analizei
//
// analizei writes 0 where it means "no data" — 176 of its salary cells are zeros — so a zero
// is read as empty here rather than copied in as a figure that would read as a real collapse.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "../../../data/workbook.json");
const check = process.argv.includes("--check");

const workbook = JSON.parse(readFileSync(target, "utf8"));
const main = workbook.sheets.find((sheet) => sheet.name === "Main");
const analizei = workbook.sheets.find((sheet) => sheet.name === "Įmonės-analizei");
if (!main || !analizei) throw new Error("workbook.json is missing the Main or Įmonės-analizei sheet");

const isBlank = (value) =>
  value === null || value === undefined || value === "\\N" || (typeof value === "string" && value.trim() === "");

const plain = (value) => String(value ?? "").replace(/[^\p{L}\p{N}]+/gu, "").toLocaleLowerCase("lt-LT");

const mainHeader = main.values[0];
const analizeiHeader = analizei.values[0];

// The nine activity categories, in analizei's order. The first four already exist in Main.
const activity = analizeiHeader
  .map((name, column) => (typeof name === "string" && name.startsWith("Veikla (") ? { name, column } : null))
  .filter(Boolean);

// Metric column in analizei -> the "<name> <year>" family in Main.
const metrics = [
  ["Darbuotojų skaičius", "Darbuotojai"],
  ["Atlyginimo vidurkis", "Atlyginimų vidurkis"],
  ["DU sąnaudos", "Atlyginimų sąnaudos"],
  ["Apyvarta", "Apyvarta"],
  ["Pelnas", "Grynasis pelnas"],
].map(([from, to]) => ({ column: analizeiHeader.indexOf(from), to }));

const yearColumn = analizeiHeader.indexOf("Metai");
const brandColumn = analizeiHeader.indexOf("Pagrindinis brandas");

const rows = analizei.values.filter((row, index) => index > 0 && !isBlank(row[0]));
const byCompany = new Map();
rows.forEach((row) => byCompany.set(row[0], [...(byCompany.get(row[0]) ?? []), row]));

const mainRowOf = new Map();
main.values.forEach((row, index) => {
  if (index > 0 && !isBlank(row[0])) mainRowOf.set(plain(row[0]), index);
});

// 1. Give Main the five categories it lacks.
const addedColumns = [];
const activityColumn = new Map(); // analizei column -> Main column
activity.forEach((entry) => {
  const existing = mainHeader.indexOf(entry.name);
  if (existing >= 0) {
    activityColumn.set(entry.column, existing);
    return;
  }
  activityColumn.set(entry.column, mainHeader.length);
  addedColumns.push(entry.name);
  mainHeader.push(entry.name);
});
main.values.forEach((row) => {
  while (row.length < mainHeader.length) row.push(null);
});

// 2. Fill all nine from analizei. A category is per company, so the first row it appears on wins.
let marked = 0;
const disagreements = [];
byCompany.forEach((list, company) => {
  const destination = mainRowOf.get(plain(company));
  if (destination === undefined) return;
  activityColumn.forEach((mainColumn, sourceColumn) => {
    const value = list.map((row) => row[sourceColumn]).find((entry) => !isBlank(entry) && entry !== "Ne");
    const current = main.values[destination][mainColumn];
    if (value === undefined) {
      if (!isBlank(current)) disagreements.push({ company, column: mainHeader[mainColumn], main: current, analizei: "Ne" });
      return;
    }
    if (isBlank(current)) {
      main.values[destination][mainColumn] = value;
      marked += 1;
    }
  });
});

// 3. Append the companies analizei alone carries.
const added = [];
let copiedCells = 0;
byCompany.forEach((list, company) => {
  if (mainRowOf.has(plain(company))) return;
  const row = new Array(mainHeader.length).fill(null);
  row[0] = company;
  const brand = list.map((entry) => entry[brandColumn]).find((entry) => !isBlank(entry));
  if (brand !== undefined && mainHeader.indexOf("Pagrindinis brandas") >= 0) {
    row[mainHeader.indexOf("Pagrindinis brandas")] = brand;
  }
  activityColumn.forEach((mainColumn, sourceColumn) => {
    const value = list.map((entry) => entry[sourceColumn]).find((entry) => !isBlank(entry) && entry !== "Ne");
    if (value !== undefined) row[mainColumn] = value;
  });
  const years = [];
  list.forEach((entry) => {
    const year = entry[yearColumn];
    if (typeof year !== "number") return;
    years.push(year);
    metrics.forEach((metric) => {
      const column = mainHeader.indexOf(`${metric.to} ${year}`);
      const value = entry[metric.column];
      // A zero here is analizei's way of writing "unknown", not a measured nil.
      if (column < 0 || isBlank(value) || value === 0) return;
      row[column] = value;
      copiedCells += 1;
    });
  });
  main.values.push(row);
  added.push({ company, years: years.join(", ") });
});

console.log(`companies in analizei: ${byCompany.size}, matched in Main: ${[...byCompany.keys()].filter((name) => mainRowOf.has(plain(name))).length}`);
console.log(`activity columns added to Main (${addedColumns.length}): ${addedColumns.join(", ") || "none"}`);
console.log(`activity cells marked: ${marked}`);
added.forEach((entry) => console.log(`company added: ${entry.company} (${entry.years})`));
console.log(`figures copied for the added companies: ${copiedCells}`);
console.log(`companies Main marks but analizei does not: ${disagreements.length}`);
disagreements.slice(0, 10).forEach((entry) => console.log(`  ${entry.company} — ${entry.column}: Main ${JSON.stringify(entry.main)}`));

if (check) {
  console.log("\n--check: nothing written");
} else {
  let name = "";
  for (let value = mainHeader.length; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  main.address = `A1:${name}${main.values.length}`;
  writeFileSync(target, JSON.stringify(workbook));
  console.log(`\nwritten: ${target}`);
}
