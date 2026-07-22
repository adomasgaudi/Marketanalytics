// Folds everything Raw knows into the Įmonės sheet, matching companies by Kodas.
//
//   node scripts/data/workbook/merge-raw-into-imones.mjs --check   # report only, writes nothing
//   node scripts/data/workbook/merge-raw-into-imones.mjs           # apply to data/workbook.json
//
// Run it after scripts/extract-workbook.mjs, which rebuilds workbook.json from the .xlsx and
// would otherwise drop the merge.
//
// Three things can happen to a Raw column:
//   new      Įmonės has no such column  -> appended, values copied across
//   filled   Įmonės has the column but this company's cell is empty -> Raw's value fills it
//   conflict both hold a value and they disagree -> Įmonės wins, the pair is reported
//
// Įmonės wins conflicts because it is the fuller sheet (169 companies to Raw's 103) and its
// figures are the ones the rest of the workbook is built from.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "../../../data/workbook.json");
const check = process.argv.includes("--check");

const workbook = JSON.parse(readFileSync(target, "utf8"));
const raw = workbook.sheets.find((sheet) => sheet.name === "Raw");
const imones = workbook.sheets.find((sheet) => sheet.name === "Main" || sheet.name === "Įmonės");
if (!raw || !imones) throw new Error("workbook.json is missing the Raw or Main sheet");

const isBlank = (value) =>
  value === null || value === undefined || value === "\\N" || (typeof value === "string" && value.trim() === "");

// Raw records some fields differently rather than wrongly — its Svetainė is the full URL where
// Įmonės keeps a domain, and its Įmonė is the registry spelling. Those keep their own column
// instead of being thrown away. Raw's Mobilus is rounded to five digits (37070000000) and is
// simply unusable, so it is left behind.
const keepBoth = { Svetainė: "Svetainė (pilnas adresas)", Įmonė: "Įmonė (registro rašyba)" };
const skip = new Set(["Mobilus"]);

const asNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  return /^-?\d*\.?\d+$/.test(cleaned) ? Number(cleaned) : null;
};

// Compare what a reader would see: 0.7937563537783802 and 0.79 are the same number rounded,
// and "  Vilnius" is the same city as "Vilnius".
const same = (a, b) => {
  const [x, y] = [asNumber(a), asNumber(b)];
  if (x !== null && y !== null) {
    const digits = Math.min(String(a).replace(/\D/g, "").length, String(b).replace(/\D/g, "").length);
    return Math.abs(x - y) <= Math.abs(x) * 10 ** -Math.max(2, Math.min(digits, 6));
  }
  return String(a).trim().toLocaleLowerCase("lt-LT") === String(b).trim().toLocaleLowerCase("lt-LT");
};

const rawHeader = raw.values[0];
const imonesHeader = imones.values[0];
const rawCode = rawHeader.indexOf("Kodas");
const imonesCode = imonesHeader.indexOf("Kodas");

const rowByCode = new Map();
imones.values.forEach((row, index) => {
  if (index === 0) return;
  const code = asNumber(row[imonesCode]);
  if (code !== null) rowByCode.set(code, index);
});

const unmatched = [];
const duplicates = [];
const pairs = [];
const takenBy = new Map(); // Įmonės row -> the Raw row already merged into it
raw.values.forEach((row, index) => {
  if (index === 0) return;
  const code = asNumber(row[rawCode]);
  const target = code === null ? undefined : rowByCode.get(code);
  if (target === undefined) {
    unmatched.push(row[0]);
    return;
  }
  // Raw lists a company twice under one Kodas; the two rows disagree. Keep the one whose name
  // matches Įmonės, or the first one seen, and report the other rather than merging both.
  const held = takenBy.get(target);
  if (held !== undefined) {
    const plain = (value) => String(value).replace(/[^\p{L}\p{N}]+/gu, "").toLocaleLowerCase("lt-LT");
    const name = plain(imones.values[target][0]);
    // An exact name match beats a mere prefix — "Ave Media, MB" is the row Įmonės kept, not
    // "Ave Media, UAB", and the two carry different figures.
    const score = (candidate) => {
      const text = plain(raw.values[candidate][0]);
      return text === name ? 2 : name.startsWith(text.slice(0, 6)) ? 1 : 0;
    };
    const [winner, loser] = score(index) > score(held) ? [index, held] : [held, index];
    takenBy.set(target, winner);
    pairs[pairs.findIndex(([source]) => source === held)] = [winner, target];
    duplicates.push({ company: imones.values[target][0], kept: raw.values[winner][0], dropped: raw.values[loser][0] });
    return;
  }
  takenBy.set(target, index);
  pairs.push([index, target]);
});

const width = imonesHeader.length;
const columnFor = new Map(); // raw column -> Įmonės column
const added = [];
const variantColumn = new Map(); // raw column -> its own Įmonės column for differing values
rawHeader.forEach((name, rawColumn) => {
  if (rawColumn === rawCode || skip.has(name)) return;
  if (keepBoth[name]) {
    variantColumn.set(rawColumn, imonesHeader.length);
    added.push(keepBoth[name]);
    imonesHeader.push(keepBoth[name]);
  }
  const existing = imonesHeader.indexOf(name);
  if (existing >= 0) {
    columnFor.set(rawColumn, existing);
    return;
  }
  const filled = pairs.some(([source]) => !isBlank(raw.values[source][rawColumn]));
  if (!filled) return;
  columnFor.set(rawColumn, imonesHeader.length);
  added.push(name);
  imonesHeader.push(name);
});

// Every row has to keep the same width, including the companies Raw never mentions.
imones.values.forEach((row) => {
  while (row.length < imonesHeader.length) row.push(null);
});

const conflicts = [];
let filledCount = 0;
let copiedCount = 0;
pairs.forEach(([source, destination]) => {
  columnFor.forEach((imonesColumn, rawColumn) => {
    const incoming = raw.values[source][rawColumn];
    if (isBlank(incoming)) return;
    const current = imones.values[destination][imonesColumn];
    if (isBlank(current)) {
      imones.values[destination][imonesColumn] = incoming;
      if (imonesColumn >= width) copiedCount += 1;
      else filledCount += 1;
      return;
    }
    if (!same(incoming, current)) {
      const variant = variantColumn.get(rawColumn);
      if (variant !== undefined) {
        imones.values[destination][variant] = incoming;
        copiedCount += 1;
        return;
      }
      conflicts.push({
        company: imones.values[destination][0],
        column: imonesHeader[imonesColumn],
        raw: incoming,
        imones: current,
      });
    }
  });
});

console.log(`companies: ${pairs.length} matched by Kodas, ${unmatched.length} unmatched`);
if (unmatched.length) console.log(`  unmatched: ${unmatched.join(", ")}`);
duplicates.forEach((entry) =>
  console.log(`  duplicate in Raw for ${entry.company}: kept ${JSON.stringify(entry.kept)}, dropped ${JSON.stringify(entry.dropped)}`),
);
console.log(`columns skipped as unusable: ${[...skip].join(", ") || "none"}`);
console.log(`columns added to Įmonės (${added.length}): ${added.join(", ") || "none"}`);
console.log(`cells copied into new columns: ${copiedCount}`);
console.log(`empty cells filled in existing columns: ${filledCount}`);
console.log(`conflicts (Įmonės kept): ${conflicts.length}`);

const byColumn = new Map();
conflicts.forEach((conflict) => byColumn.set(conflict.column, [...(byColumn.get(conflict.column) ?? []), conflict]));
[...byColumn.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([column, list]) => {
    console.log(`\n  ${column} — ${list.length}`);
    list.slice(0, 5).forEach((conflict) => {
      console.log(`    ${conflict.company}\n      raw:    ${JSON.stringify(conflict.raw)}\n      įmonės: ${JSON.stringify(conflict.imones)}`);
    });
    if (list.length > 5) console.log(`    …and ${list.length - 5} more`);
  });

if (check) {
  console.log("\n--check: nothing written");
} else {
  imones.address = imones.address.replace(/^([A-Z]+\d+:)[A-Z]+/, (_, start) => {
    let name = "";
    for (let value = imonesHeader.length; value > 0; value = Math.floor((value - 1) / 26)) {
      name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
    }
    return start + name;
  });
  writeFileSync(target, JSON.stringify(workbook));
  console.log(`\nwritten: ${target}`);
}
