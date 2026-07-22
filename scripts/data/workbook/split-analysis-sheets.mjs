// Analizė-bendra and Analizė-pokyčiai are each two tables sharing a worksheet: a ranking on
// the left and a hidden staging block on the right that feeds it ("Vyksta magija >>>>>" marks
// the seam). This separates them.
//
//   node scripts/data/workbook/split-analysis-sheets.mjs --check   # report only, writes nothing
//   node scripts/data/workbook/split-analysis-sheets.mjs           # apply to data/workbook.json
//
// The staging blocks hold nothing of their own — Analizė-bendra's is a copy of one year's
// figures, Analizė-pokyčiai's is a copy of the change columns the retired sheets had — so they
// are dropped, and any value that disagrees with Main joins the Neatitikimai record first.
// The rankings stay: the ordering is the only thing these sheets actually contribute.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "../../../data/workbook.json");
const check = process.argv.includes("--check");

const workbook = JSON.parse(readFileSync(target, "utf8"));
const main = workbook.sheets.find((sheet) => sheet.name === "Main");
const record = workbook.sheets.find((sheet) => sheet.name === "Neatitikimai");
if (!main || !record) throw new Error("workbook.json is missing Main or Neatitikimai");

const isBlank = (value) =>
  value === null || value === undefined || value === "\\N" || (typeof value === "string" && value.trim() === "");
const asNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  return /^-?\d*\.?\d+$/.test(cleaned) ? Number(cleaned) : null;
};
const plain = (value) => String(value ?? "").replace(/[^\p{L}\p{N}]+/gu, "").toLocaleLowerCase("lt-LT");
const columnName = (count) => {
  let name = "";
  for (let value = count; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
};

const mainHeader = main.values[0];
const mainRow = new Map();
main.values.forEach((row, index) => {
  if (index > 0 && !isBlank(row[0])) mainRow.set(plain(row[0]), row);
});
const of = (row, metric, year) => asNumber(row[mainHeader.indexOf(`${metric} ${year}`)]);
const salaryBill = (row, year) => {
  const wage = of(row, "Atlyginimų vidurkis", year);
  const staff = of(row, "Darbuotojai", year);
  return wage === null || staff === null ? null : wage * staff * 12;
};
const figureOf = {
  "Apyvarta-": (row, year) => of(row, "Apyvarta", year),
  "DU sąnaudos-": salaryBill,
  "Atlyginimo vidurkis-": (row, year) => of(row, "Atlyginimų vidurkis", year),
  "Darbuotojų skaičius-": (row, year) => of(row, "Darbuotojai", year),
  "Ne-atlyginimų sąnaudos-": (row, year) => {
    const du = salaryBill(row, year);
    const turnover = of(row, "Apyvarta", year);
    const profit = of(row, "Grynasis pelnas", year);
    return du === null || turnover === null || profit === null ? null : turnover - du - profit;
  },
  "Grynasis Pelnas": (row, year) => of(row, "Grynasis pelnas", year),
  "Spėjamos pajamos-": (row, year) => {
    const du = salaryBill(row, year);
    const profit = of(row, "Grynasis pelnas", year);
    return du === null || profit === null ? null : du + profit + du * 0.43;
  },
};
const changeFieldOf = {
  "Apyvartos pokytis, %": (row, year) => [of(row, "Apyvarta", year - 1), of(row, "Apyvarta", year)],
  "Darbuotojų pokytis, %": (row, year) => [of(row, "Darbuotojai", year - 1), of(row, "Darbuotojai", year)],
  "Atlyginimo pokytis, %": (row, year) => [
    of(row, "Atlyginimų vidurkis", year - 1),
    of(row, "Atlyginimų vidurkis", year),
  ],
  "DU sąnaudų pokytis, %": (row, year) => [salaryBill(row, year - 1), salaryBill(row, year)],
  "Ne-atlyginimų sąnaudų pokytis, %": (row, year) => [
    figureOf["Ne-atlyginimų sąnaudos-"](row, year - 1),
    figureOf["Ne-atlyginimų sąnaudos-"](row, year),
  ],
  "Pelno pokytis, %": (row, year) => [of(row, "Grynasis pelnas", year - 1), of(row, "Grynasis pelnas", year)],
};

const found = [];
const note = (sheet, company, year, field, theirs, ours, why) => found.push([sheet, company, year, field, theirs, ours, why]);

// Where a sheet's two tables meet: the column holding the "Vyksta magija" marker.
const seamOf = (sheet) => {
  let seam = -1;
  sheet.values.forEach((row) =>
    row.forEach((cell, column) => {
      if (typeof cell === "string" && cell.startsWith("Vyksta magija")) seam = Math.max(seam, column);
    }),
  );
  return seam;
};

// Trim a block to the rows and columns that actually hold something.
const trim = (values) => {
  const lastRow = values.reduce((last, row, index) => (row.some((cell) => !isBlank(cell)) ? index : last), 0);
  const kept = values.slice(0, lastRow + 1);
  const lastColumn = kept.reduce(
    (last, row) => row.reduce((inner, cell, column) => (isBlank(cell) ? inner : Math.max(inner, column)), last),
    0,
  );
  return kept.map((row) => row.slice(0, lastColumn + 1));
};

// --- Analizė-bendra: staging is one year of figures, 9 columns wide.
const bendra = workbook.sheets.find((sheet) => sheet.name === "Analizė-bendra");
if (bendra) {
  const seam = seamOf(bendra);
  const nameColumn = bendra.values.reduce(
    (found, row) => (found >= 0 ? found : row.findIndex((cell, column) => column > seam && cell === "Įmonės pavadinimas")),
    -1,
  );
  const headerRowIndex = bendra.values.findIndex((row) => row[nameColumn] === "Įmonės pavadinimas");
  const header = bendra.values[headerRowIndex] ?? [];
  const staged = bendra.values.slice(headerRowIndex + 1).filter((row) => !isBlank(row[nameColumn]));
  // Every figure in the block belongs to one year; find it by asking Main which year fits.
  // The year the block belongs to is whichever one Main's turnovers agree with most often.
  const fit = (candidate) =>
    staged.filter((row) => {
      const source = mainRow.get(plain(row[nameColumn]));
      const turnover = asNumber(row[nameColumn + 2]);
      return source && turnover !== null && Math.abs(turnover - (of(source, "Apyvarta", candidate) ?? NaN)) <= 1;
    }).length;
  const [year, matches] = [2024, 2023, 2022, 2021, 2020, 2019]
    .map((candidate) => [candidate, fit(candidate)])
    .sort((a, b) => b[1] - a[1])[0];
  staged.forEach((row) => {
    const company = row[nameColumn];
    const source = mainRow.get(plain(company));
    if (!source || !year) return;
    header.forEach((cell, column) => {
      const figure = figureOf[String(cell)];
      const stored = asNumber(row[column]);
      if (!figure || stored === null || stored === 0) return;
      const ours = figure(source, year);
      if (ours === null || Math.abs(stored - ours) <= Math.max(1, Math.abs(ours)) * 0.01) return;
      note("Analizė-bendra", company, year, String(cell).replace(/-$/, ""), stored, ours, "Main holds a different figure");
    });
  });
  bendra.values = trim(bendra.values.map((row) => row.slice(0, seam)));
  bendra.address = `A1:${columnName(bendra.values[0].length)}${bendra.values.length}`;
  console.log(`Analizė-bendra: staging was ${staged.length} companies of ${year} (${matches} turnovers match Main); kept the rankings, now ${bendra.values.length} rows × ${bendra.values[0].length} columns`);
}

// --- Analizė-pokyčiai: staging is six years of change columns side by side.
const pokyciai = workbook.sheets.find((sheet) => sheet.name === "Analizė-pokyčiai");
if (pokyciai) {
  const seam = seamOf(pokyciai);
  const nameColumn = pokyciai.values.reduce(
    (found, row) => (found >= 0 ? found : row.findIndex((cell, column) => column > seam && cell === "Įmonės pavadinimas")),
    -1,
  );
  const headerRowIndex = pokyciai.values.findIndex((row) => row[nameColumn] === "Įmonės pavadinimas");
  const header = pokyciai.values[headerRowIndex] ?? [];
  const years = pokyciai.values[headerRowIndex - 1] ?? [];
  const staged = pokyciai.values.slice(headerRowIndex + 1).filter((row) => !isBlank(row[nameColumn]));
  let year = null;
  staged.forEach((row) => {
    const company = row[nameColumn];
    const source = mainRow.get(plain(company));
    header.forEach((cell, column) => {
      if (!isBlank(years[column])) year = asNumber(years[column]);
      const field = String(cell).replace(/^Sum of /, "");
      const pair = changeFieldOf[field];
      const stored = asNumber(row[column]);
      if (!pair || !source || year === null || stored === null || stored === 0) return;
      const [before, after] = pair(source, year);
      if (before === null || after === null || before === 0) return;
      const change = (after - before) / Math.abs(before);
      const decimals = (String(row[column]).split(".")[1] ?? "").length;
      const tolerance = Math.max(10 ** -decimals / 2, 1e-9);
      if (Math.abs(change - stored) <= tolerance) return;
      const flipped = Math.abs(change + stored) <= tolerance;
      note(
        "Analizė-pokyčiai",
        company,
        year,
        field,
        stored,
        change,
        flipped ? "the sign is inverted: a loss turning into a profit is recorded as a fall" : "the figures give a different change",
      );
    });
  });
  pokyciai.values = trim(pokyciai.values.map((row) => row.slice(0, seam)));
  pokyciai.address = `A1:${columnName(pokyciai.values[0].length)}${pokyciai.values.length}`;
  console.log(`Analizė-pokyčiai: staging was ${staged.length} companies; kept the rankings, now ${pokyciai.values.length} rows × ${pokyciai.values[0].length} columns`);
}

// Only disagreements the record does not already carry are worth adding.
const seen = new Set(record.values.slice(1).map((row) => `${plain(row[1])}|${row[2]}|${row[3]}`));
const fresh = found.filter((row) => !seen.has(`${plain(row[1])}|${row[2]}|${row[3]}`));

console.log(`\ndisagreements in the staging blocks: ${found.length}, of which ${fresh.length} were not already recorded`);
fresh.slice(0, 10).forEach((row) =>
  console.log(`  ${row[1]} ${row[2]} ${row[3]}: ${row[0]} ${row[4]}, Main ${row[5] === null ? "—" : Math.round(row[5] * 1000) / 1000}`),
);

if (check) {
  console.log("\n--check: nothing written");
} else {
  record.values.push(...fresh);
  record.address = `A1:G${record.values.length}`;
  writeFileSync(target, JSON.stringify(workbook));
  console.log(`\nwritten: ${target}`);
}
