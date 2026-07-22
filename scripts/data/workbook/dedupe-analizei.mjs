// Strips Įmonės-analizei down to what Main does not already hold.
//
//   node scripts/data/workbook/dedupe-analizei.mjs --check   # report only, writes nothing
//   node scripts/data/workbook/dedupe-analizei.mjs           # apply to data/workbook.json
//
// Run after scripts/merge-analizei-into-main.mjs.
//
// Order matters. analizei is not purely a repeat: it carries figures Main never got, mostly
// 2024 numbers and a few companies' whole history. So the pass fills Main's blanks first, and
// only then drops the analizei columns Main can account for. A column is droppable when every
// one of its values is either the same figure Main holds, or something Main works out from
// figures it holds:
//
//   Darbuotojų skaičius  -> Darbuotojai <year>
//   Atlyginimo vidurkis  -> Atlyginimų vidurkis <year>
//   DU sąnaudos          -> vidurkis × darbuotojai × 12          (Main's "total" view)
//   Apyvarta             -> Apyvarta <year>
//   Pelnas               -> Grynasis pelnas <year>
//   Ne-atlyginimų sąn.   -> apyvarta − DU − pelnas
//   Fiks ir pelno mok.   -> DU × 0.43                            (computed in the app)
//   Spėjamos pajamos     -> DU + pelnas + DU × 0.43              (computed in the app)
//   … pokytis, %         -> every change is derived from the two years either side
//
// Cells where the two sheets disagree are reported and left alone — the column stays.

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

const asNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  return /^-?\d*\.?\d+$/.test(cleaned) ? Number(cleaned) : null;
};

const plain = (value) => String(value ?? "").replace(/[^\p{L}\p{N}]+/gu, "").toLocaleLowerCase("lt-LT");
const close = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(b)) * 0.01;

const mainHeader = main.values[0];
const header = analizei.values[0];
const yearColumn = header.indexOf("Metai");

const mainRowOf = new Map();
main.values.forEach((row, index) => {
  if (index > 0 && !isBlank(row[0])) mainRowOf.set(plain(row[0]), index);
});

const rows = analizei.values
  .map((row, index) => ({ row, index }))
  .filter((entry) => entry.index > 0 && !isBlank(entry.row[0]) && typeof entry.row[yearColumn] === "number");

// The figures Main stores directly, so a gap in Main can be filled from analizei.
const direct = [
  ["Darbuotojų skaičius", "Darbuotojai"],
  ["Atlyginimo vidurkis", "Atlyginimų vidurkis"],
  ["Apyvarta", "Apyvarta"],
  ["Pelnas", "Grynasis pelnas"],
].map(([from, to]) => ({ column: header.indexOf(from), to }));

// 1. Fill Main's blanks. A zero in analizei means "no data", so it is not a figure to copy.
const filled = [];
rows.forEach(({ row }) => {
  const destination = mainRowOf.get(plain(row[0]));
  if (destination === undefined) return;
  const year = row[yearColumn];
  direct.forEach((entry) => {
    const value = asNumber(row[entry.column]);
    if (value === null || value === 0) return;
    const column = mainHeader.indexOf(`${entry.to} ${year}`);
    if (column < 0 || !isBlank(main.values[destination][column])) return;
    main.values[destination][column] = value;
    filled.push(`${row[0]} ${entry.to} ${year} = ${value}`);
  });
});

// 2. With Main filled, ask of every analizei figure column whether Main can account for it.
const mainValue = (destination, year, name) => asNumber(main.values[destination][mainHeader.indexOf(`${name} ${year}`)]);
const salaryBill = (destination, year) => {
  const wage = mainValue(destination, year, "Atlyginimų vidurkis");
  const staff = mainValue(destination, year, "Darbuotojai");
  return wage === null || staff === null ? null : wage * staff * 12;
};

const covered = {
  "Darbuotojų skaičius": (destination, year) => mainValue(destination, year, "Darbuotojai"),
  "Atlyginimo vidurkis": (destination, year) => mainValue(destination, year, "Atlyginimų vidurkis"),
  "DU sąnaudos": salaryBill,
  Apyvarta: (destination, year) => mainValue(destination, year, "Apyvarta"),
  Pelnas: (destination, year) => mainValue(destination, year, "Grynasis pelnas"),
  "Ne-atlyginimų sąnaudos": (destination, year) => {
    const [du, turnover, profit] = [
      salaryBill(destination, year),
      mainValue(destination, year, "Apyvarta"),
      mainValue(destination, year, "Grynasis pelnas"),
    ];
    return du === null || turnover === null || profit === null ? null : turnover - du - profit;
  },
  "Fiks ir pelno mokestis": (destination, year) => {
    const du = salaryBill(destination, year);
    return du === null ? null : du * 0.43;
  },
  "Spėjamos pajamos": (destination, year) => {
    const du = salaryBill(destination, year);
    const profit = mainValue(destination, year, "Grynasis pelnas");
    return du === null || profit === null ? null : du + profit + du * 0.43;
  },
};

// analizei's money columns fall back rather than blank out when it has no salary figure:
// "Ne-atlyginimų sąnaudos" and the tax become 0 and "Spėjamos pajamos" becomes the turnover.
// Those are placeholders, not figures Main is missing, so they are not held against it.
const salaryDriven = new Set(["Ne-atlyginimų sąnaudos", "Fiks ir pelno mokestis", "Spėjamos pajamos"]);
const duColumn = header.indexOf("DU sąnaudos");

const report = [];
const droppable = [];
header.forEach((name, column) => {
  if (typeof name !== "string") return;
  // Change columns stay: 91 of their values disagree with this sheet's own figures, and a
  // disagreement is something to look at, not something to delete. They are flagged in the app.
  if (/pokytis/i.test(name)) return;
  const account = covered[name];
  if (!account) return;
  let checked = 0;
  const unmatched = [];
  rows.forEach(({ row }) => {
    const value = asNumber(row[column]);
    if (value === null || value === 0) return;
    if (salaryDriven.has(name) && !asNumber(row[duColumn])) return;
    const destination = mainRowOf.get(plain(row[0]));
    const mirror = destination === undefined ? null : account(destination, row[yearColumn]);
    checked += 1;
    if (mirror === null || !close(value, mirror)) unmatched.push({ company: row[0], year: row[yearColumn], analizei: value, main: mirror });
  });
  report.push({ name, checked, unmatched });
  if (!unmatched.length) droppable.push({ column, name, reason: "Main holds the same figure", checked, unmatched: 0 });
});

console.log(`gaps filled in Main from analizei: ${filled.length}`);
filled.slice(0, 12).forEach((entry) => console.log(`  ${entry}`));
if (filled.length > 12) console.log(`  …and ${filled.length - 12} more`);

console.log("\ncolumn coverage:");
report.forEach((entry) =>
  console.log(`  ${entry.name.padEnd(26)} ${String(entry.checked).padStart(4)} values, ${entry.unmatched.length} Main cannot account for`),
);
report
  .filter((entry) => entry.unmatched.length)
  .forEach((entry) => {
    console.log(`\n  ${entry.name} — kept, ${entry.unmatched.length} unmatched:`);
    entry.unmatched.slice(0, 5).forEach((miss) =>
      console.log(`    ${miss.company} ${miss.year}: analizei ${miss.analizei}, Main ${miss.main === null ? "—" : Math.round(miss.main)}`),
    );
  });

console.log(`\ncolumns to drop (${droppable.length}): ${droppable.map((entry) => entry.name).join(", ") || "none"}`);
const keep = header.filter((name, column) => !droppable.some((entry) => entry.column === column));
console.log(`columns left in analizei (${keep.length}): ${keep.join(", ")}`);

if (check) {
  console.log("\n--check: nothing written");
} else {
  const drop = new Set(droppable.map((entry) => entry.column));
  analizei.values = analizei.values.map((row) => row.filter((_, column) => !drop.has(column)));
  if (analizei.formulas) analizei.formulas = analizei.formulas.map((row) => row.filter((_, column) => !drop.has(column)));
  if (analizei.numberFormats) {
    analizei.numberFormats = analizei.numberFormats.map((row) => row.filter((_, column) => !drop.has(column)));
  }
  let name = "";
  for (let value = analizei.values[0].length; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  analizei.address = `A1:${name}${analizei.values.length}`;
  writeFileSync(target, JSON.stringify(workbook));
  console.log(`\nwritten: ${target}`);
}
