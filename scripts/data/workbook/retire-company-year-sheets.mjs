// Lifts every disagreement out of the company-year sheets, records them as one sheet, and
// retires the tabs.
//
//   node scripts/data/workbook/retire-company-year-sheets.mjs --check   # report only, writes nothing
//   node scripts/data/workbook/retire-company-year-sheets.mjs           # apply to data/workbook.json
//
// Įmonės-analizei, Kuryba and PR are all one row per company-year, and Main now holds every
// figure they had — Kuryba and PR are strict subsets of Įmonės-analizei, which is itself
// covered. What is left is where they disagree with Main. Those become rows in a
// "Neatitikimai" sheet — sheet, company, year, field, both values, and why — which the app
// reads to flag the matching cell in Main. The three tabs then go, the way Raw did.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "../../../data/workbook.json");
const check = process.argv.includes("--check");

const workbook = JSON.parse(readFileSync(target, "utf8"));
const main = workbook.sheets.find((sheet) => sheet.name === "Main");
const retiring = ["Įmonės-analizei", "Kuryba", "PR"]
  .map((name) => workbook.sheets.find((sheet) => sheet.name === name))
  .filter(Boolean);
if (!main || !retiring.length) throw new Error("workbook.json is missing Main or the company-year sheets");

const isBlank = (value) =>
  value === null || value === undefined || value === "\\N" || (typeof value === "string" && value.trim() === "");

const asNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  return /^-?\d*\.?\d+$/.test(cleaned) ? Number(cleaned) : null;
};

const plain = (value) => String(value ?? "").replace(/[^\p{L}\p{N}]+/gu, "").toLocaleLowerCase("lt-LT");
const taxRate = 0.43;

const mainHeader = main.values[0];
const mainRow = new Map();
main.values.forEach((row, index) => {
  if (index > 0 && !isBlank(row[0])) mainRow.set(plain(row[0]), row);
});

const reader = (row, year) => (metric, offset = 0) => asNumber(row[mainHeader.indexOf(`${metric} ${year + offset}`)]);

const salaryBill = (of, offset = 0) => {
  const wage = of("Atlyginimų vidurkis", offset);
  const staff = of("Darbuotojai", offset);
  return wage === null || staff === null ? null : wage * staff * 12;
};
const otherCosts = (of, offset = 0) => {
  const du = salaryBill(of, offset);
  const turnover = of("Apyvarta", offset);
  const profit = of("Grynasis pelnas", offset);
  return du === null || turnover === null || profit === null ? null : turnover - du - profit;
};

// Field in these sheets -> how Main expresses the same figure.
const mirror = {
  "Darbuotojų skaičius": (of, offset) => of("Darbuotojai", offset),
  "Atlyginimo vidurkis": (of, offset) => of("Atlyginimų vidurkis", offset),
  "DU sąnaudos": salaryBill,
  Apyvarta: (of, offset) => of("Apyvarta", offset),
  Pelnas: (of, offset) => of("Grynasis pelnas", offset),
  "Ne-atlyginimų sąnaudos": otherCosts,
  "Fiks ir pelno mokestis": (of, offset) => {
    const du = salaryBill(of, offset);
    return du === null ? null : du * taxRate;
  },
  "Spėjamos pajamos": (of, offset) => {
    const du = salaryBill(of, offset);
    const profit = of("Grynasis pelnas", offset);
    return du === null || profit === null ? null : du + profit + du * taxRate;
  },
};
const changeOf = {
  "Darbuotojų pokytis, %": "Darbuotojų skaičius",
  "Atlyginimo pokytis, %": "Atlyginimo vidurkis",
  "DU sąnaudų pokytis, %": "DU sąnaudos",
  "Apyvartos pokytis, %": "Apyvarta",
  "Ne-atlyginimų sąnaudų pokytis, %": "Ne-atlyginimų sąnaudos",
  "Pelno pokytis, %": "Pelnas",
};
const fromTurnover = new Set(["Ne-atlyginimų sąnaudos", "Spėjamos pajamos"]);

const rows = [];
retiring.forEach((sheet) => {
  const header = sheet.values[0];
  const yearColumn = header.indexOf("Metai");
  const duColumn = header.indexOf("DU sąnaudos");
  const turnoverColumn = header.indexOf("Apyvarta");
  // Kuryba and PR carry a sector rollup in the same rows as their company block; only the
  // columns up to "Spėjamos pajamos" are per-company figures.
  const lastFigure = sheet.name === "Įmonės-analizei" ? header.length : header.indexOf("Spėjamos pajamos") + 1;

  sheet.values.forEach((row, rowIndex) => {
    if (rowIndex === 0 || isBlank(row[0])) return;
    const source = mainRow.get(plain(row[0]));
    const year = asNumber(row[yearColumn]);
    if (!source || year === null) return;
    const of = reader(source, year);
    const noPayroll = !asNumber(row[duColumn]);
    const noTurnover = !asNumber(row[turnoverColumn]);

    header.slice(0, lastFigure).forEach((cell, column) => {
      const name = String(cell);
      const stored = asNumber(row[column]);
      // A zero in these sheets means "no data", never a measurement.
      if (stored === null || stored === 0) return;

      if (noTurnover && fromTurnover.has(name)) {
        rows.push([sheet.name, row[0], year, name, stored, null, "no turnover recorded that year, so this is arithmetic on a gap"]);
        return;
      }

      const figure = mirror[name];
      if (figure) {
        // With no payroll these sheets fall back: likely income becomes the turnover.
        const theirs = noPayroll && name === "Spėjamos pajamos" ? of("Apyvarta") : figure(of, 0);
        if (theirs === null || Math.abs(stored - theirs) <= Math.max(1, Math.abs(theirs)) * 0.01) return;
        rows.push([sheet.name, row[0], year, name, stored, theirs, "Main holds a different figure"]);
        return;
      }

      const base = changeOf[name];
      if (!base) return;
      const after = mirror[base](of, 0);
      const before = mirror[base](of, -1);
      if (after === null || before === null || before === 0) return;
      const change = (after - before) / Math.abs(before);
      const decimals = (String(row[column]).split(".")[1] ?? "").length;
      const tolerance = Math.max(10 ** -decimals / 2, 1e-9);
      if (Math.abs(change - stored) <= tolerance) return;
      const flipped = Math.abs(change + stored) <= tolerance;
      rows.push([
        sheet.name,
        row[0],
        year,
        name,
        stored,
        change,
        flipped
          ? "the sign is inverted: a loss turning into a profit is recorded as a fall"
          : "the figures give a different change",
      ]);
    });
  });
});

rows.sort(
  (a, b) => String(a[1]).localeCompare(String(b[1]), "lt") || a[2] - b[2] || String(a[3]).localeCompare(String(b[3]), "lt"),
);

const sheet = {
  name: "Neatitikimai",
  address: `A1:G${rows.length + 1}`,
  values: [["Lentelė", "Įmonė", "Metai", "Rodiklis", "Lentelėje", "Main", "Kodėl"], ...rows],
};

const count = (index) => {
  const tally = new Map();
  rows.forEach((row) => tally.set(row[index], (tally.get(row[index]) ?? 0) + 1));
  return [...tally.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`disagreements found: ${rows.length}`);
count(6).forEach(([reason, total]) => console.log(`  ${String(total).padStart(3)}  ${reason}`));
console.log(`by sheet: ${count(0).map(([name, total]) => `${name} ${total}`).join(", ")}`);
rows.slice(0, 6).forEach((row) =>
  console.log(`  ${row[1]} ${row[2]} ${row[3]}: ${row[0]} ${row[4]}, Main ${row[5] === null ? "—" : Math.round(row[5] * 1000) / 1000}`),
);

if (check) {
  console.log("\n--check: nothing written");
} else {
  const retired = retiring.map((entry) => entry.name);
  workbook.sheets = workbook.sheets.filter((entry) => !retired.includes(entry.name));
  workbook.sheets.splice(1, 0, sheet);
  writeFileSync(target, JSON.stringify(workbook));
  console.log(`\nwritten: ${target} — retired ${retired.join(", ")}; Neatitikimai added`);
}
