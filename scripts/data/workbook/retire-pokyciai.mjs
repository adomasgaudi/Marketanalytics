// Reads every value in Analizė-pokyčiai's six rankings, records what Main cannot account for,
// and retires the tab.
//
//   node scripts/data/workbook/retire-pokyciai.mjs --check   # report only, writes nothing
//   node scripts/data/workbook/retire-pokyciai.mjs           # apply
//
// The sheet ranks companies by year-over-year change, five years per list. Its staging block
// was already dropped as a copy of figures Main holds; what is left are the rankings, and every
// value in them is a change Main can work out for itself. Each one is checked before the tab
// goes: a value Main reproduces is a repeat, a value Main cannot reach is recorded as a gap,
// and a value that disagrees is recorded as a disagreement. Nothing is deleted unexamined, and
// nothing is invented — a change alone cannot recover the figure Main is missing.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workbookPath = resolve(here, "../../../data/workbook.json");
const recordPath = resolve(here, "../../../data/disagreements.json");
const check = process.argv.includes("--check");

const workbook = JSON.parse(readFileSync(workbookPath, "utf8"));
const record = JSON.parse(readFileSync(recordPath, "utf8"));
const main = workbook.sheets.find((sheet) => sheet.name === "Main");
const sheet = workbook.sheets.find((entry) => entry.name === "Analizė-pokyčiai");
if (!main || !sheet) throw new Error("workbook.json is missing Main or Analizė-pokyčiai");

const asNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  return /^-?\d*\.?\d+$/.test(cleaned) ? Number(cleaned) : null;
};
const plain = (value) => String(value ?? "").replace(/[^\p{L}\p{N}]+/gu, "").toLocaleLowerCase("lt-LT");

const mainHeader = main.values[0];
const mainRow = new Map();
main.values.forEach((row, index) => {
  if (index > 0 && row[0]) mainRow.set(plain(row[0]), row);
});
const of = (row, metric, year) => asNumber(row[mainHeader.indexOf(`${metric} ${year}`)]);
const salaryBill = (row, year) => {
  const wage = of(row, "Atlyginimų vidurkis", year);
  const staff = of(row, "Darbuotojai", year);
  return wage === null || staff === null ? null : wage * staff * 12;
};
const otherCosts = (row, year) => {
  const du = salaryBill(row, year);
  const turnover = of(row, "Apyvarta", year);
  const profit = of(row, "Grynasis pelnas", year);
  return du === null || turnover === null || profit === null ? null : turnover - du - profit;
};

// Each ranking's title says which figure it ranks; this is that figure, read from Main.
// The field names match the ones already in the record, so a disagreement recorded twice is
// recognised as the same one, and the app knows which Main column each belongs to.
const metricFromTitle = (title) => {
  const text = title.toLowerCase();
  if (text.includes("apyvartos")) return ["Apyvartos pokytis, %", (row, year) => of(row, "Apyvarta", year)];
  if (text.includes("ne-atlyginimų")) return ["Ne-atlyginimų sąnaudų pokytis, %", otherCosts];
  if (text.includes("pelno")) return ["Pelno pokytis, %", (row, year) => of(row, "Grynasis pelnas", year)];
  if (text.includes("du sąnaudų")) return ["DU sąnaudų pokytis, %", salaryBill];
  if (text.includes("atlyginimo")) return ["Atlyginimo pokytis, %", (row, year) => of(row, "Atlyginimų vidurkis", year)];
  if (text.includes("darbuotojų")) return ["Darbuotojų pokytis, %", (row, year) => of(row, "Darbuotojai", year)];
  return null;
};

// A ranking block: its title, the column holding the company, and its five year columns.
const blocks = [];
sheet.values.forEach((row, rowIndex) => {
  const titleColumns = row.map((cell, column) => (typeof cell === "string" && /^TOP/i.test(cell) ? column : -1)).filter((column) => column >= 0);
  titleColumns.forEach((column, index) => {
    const end = index + 1 < titleColumns.length ? titleColumns[index + 1] : row.length;
    const metric = metricFromTitle(String(row[column]));
    if (!metric) return;
    const years = [];
    for (let scan = column + 2; scan < end; scan += 1) {
      const year = row[scan];
      if (typeof year === "number" && year > 1990 && year < 2100) years.push([scan, year]);
    }
    blocks.push({ titleRow: rowIndex, nameColumn: column + 1, years, field: metric[0], read: metric[1], title: String(row[column]) });
  });
});

const tally = { reproduced: 0, placeholder: 0, gap: 0, differs: 0, unreadable: 0 };
const found = [];
blocks.forEach((block) => {
  for (let rowIndex = block.titleRow + 1; rowIndex < sheet.values.length; rowIndex += 1) {
    const company = sheet.values[rowIndex][block.nameColumn];
    if (!company || typeof company !== "string") break;
    const source = mainRow.get(plain(company));
    block.years.forEach(([column, year]) => {
      const stored = asNumber(sheet.values[rowIndex][column]);
      if (stored === null) {
        tally.unreadable += 1;
        return;
      }
      const after = source ? block.read(source, year) : null;
      const before = source ? block.read(source, year - 1) : null;
      const change = after === null || before === null || before === 0 ? null : (after - before) / Math.abs(before);

      if (stored === 0) {
        // A zero means "no change could be worked out" here, which is only worth recording when
        // the figures say otherwise — those are the ones that hide a collapse.
        if (change !== null && Math.abs(change) > 0.005) {
          found.push([sheet.name, company, year, block.field, stored, change, "recorded as no change, but the figures give one"]);
          tally.differs += 1;
        } else tally.placeholder += 1;
        return;
      }

      if (change === null) {
        found.push([
          sheet.name,
          company,
          year,
          block.field,
          stored,
          null,
          `a change Main cannot check: it has no ${before === null ? year - 1 : year} figure to compare against`,
        ]);
        tally.gap += 1;
        return;
      }

      if (Math.abs(change - stored) <= Math.max(Math.abs(change) * 0.01, 0.005)) {
        tally.reproduced += 1;
        return;
      }
      const flipped = Math.abs(change + stored) <= Math.max(Math.abs(change) * 0.01, 0.005);
      found.push([
        sheet.name,
        company,
        year,
        block.field,
        stored,
        change,
        flipped ? "the sign is inverted: a loss turning into a profit is recorded as a fall" : "the figures give a different change",
      ]);
      tally.differs += 1;
    });
  }
});

// Only what the record does not already carry, matched on company, year and field.
const seen = new Set(record.map((entry) => `${plain(entry.company)}|${entry.year}|${entry.field}`));
const fresh = found
  .filter((row) => !seen.has(`${plain(row[1])}|${row[2]}|${row[3]}`))
  .map((row) => ({ sheet: row[0], company: row[1], year: row[2], field: row[3], theirs: row[4], ours: row[5], why: row[6] }));

console.log(`ranking blocks: ${blocks.length}`);
blocks.forEach((block) => console.log(`  ${block.field.padEnd(24)} ${block.years.map(([, year]) => year).join(", ")}`));
console.log(`\nvalues checked: ${Object.values(tally).reduce((a, b) => a + b, 0)}`);
Object.entries(tally).forEach(([kind, count]) => console.log(`  ${String(count).padStart(4)}  ${kind}`));
console.log(`\nworth recording: ${found.length}, of which ${fresh.length} are not already in the record`);
fresh.slice(0, 12).forEach((entry) =>
  console.log(`  ${entry.company} ${entry.year} ${entry.field}: ${entry.theirs}, Main ${entry.ours === null ? "—" : Math.round(entry.ours * 1000) / 1000} (${entry.why})`),
);

if (check) {
  console.log("\n--check: nothing written");
} else {
  writeFileSync(recordPath, JSON.stringify([...record, ...fresh], null, 1));
  workbook.sheets = workbook.sheets.filter((entry) => entry.name !== "Analizė-pokyčiai");
  writeFileSync(workbookPath, JSON.stringify(workbook));
  console.log(`\nwritten: ${record.length} + ${fresh.length} records; Analizė-pokyčiai retired`);
}
