// Rebuilds data/workbook.json from the source .xlsx.
//
//   node scripts/data/workbook/extract-workbook.mjs "C:\\path\\to\\Komunikacija-konsultacija-konkurentai.xlsx"
//
// An .xlsx is a zip of XML parts, so this reads the archive directly — no dependencies.
// The part that matters: a cell with t="s" stores an *index* into sharedStrings.xml, not a
// value. Shared string 80 in this workbook is the empty string, and a `shared[i] || raw`
// style fallback turns every blank text cell into the literal "80". Resolving the index is
// the whole fix; `?? ` (not `||`) is why "" survives here.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = process.argv[2] ?? "C:\\Users\\adoma\\Downloads\\Komunikacija-konsultacija-konkurentai.xlsx";
// A second argument writes elsewhere, so a run can be inspected without replacing the
// workbook the app is built from — it carries merges no re-extract would reproduce.
const target = process.argv[3] ? resolve(process.argv[3]) : resolve(here, "../../../data/workbook.json");

/** Minimal zip reader: walk the central directory, inflate each entry we ask for. */
const readZip = (path) => {
  const buffer = readFileSync(path);
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error(`${path} is not a zip archive`);
  const entries = new Map();
  let offset = buffer.readUInt32LE(end + 16);
  const count = buffer.readUInt16LE(end + 10);
  for (let index = 0; index < count; index += 1) {
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const localExtra = buffer.readUInt16LE(localOffset + 28);
    const localName = buffer.readUInt16LE(localOffset + 26);
    const dataStart = localOffset + 30 + localName + localExtra;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    entries.set(name, () => (method === 0 ? raw : inflateRawSync(raw)).toString("utf8"));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
};

const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (text) =>
  text.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, code) => {
    if (code[0] === "#") return String.fromCodePoint(Number(code[1] === "x" ? `0${code.slice(1)}` : code.slice(1)));
    return entities[code] ?? whole;
  });

const attribute = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

const columnIndex = (reference) =>
  reference
    .replace(/\d+/g, "")
    .split("")
    .reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;

const columnLetters = (index) => {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
};

// Move a shared formula from the cell that stores it to a cell that reuses it. Relative parts
// shift by the offset between the two; anything pinned with $ stays put, and text in quotes is
// left alone so a string like "A1" is never mistaken for a reference.
const translate = (formula, fromReference, toReference) => {
  const rows = Number(toReference.match(/\d+/)[0]) - Number(fromReference.match(/\d+/)[0]);
  const columns = columnIndex(toReference) - columnIndex(fromReference);
  if (!rows && !columns) return formula;
  return formula.replace(/"[^"]*"|(\$?)([A-Z]{1,3})(\$?)(\d+)/g, (match, columnLock, letters, rowLock, digits) => {
    if (match.startsWith('"')) return match;
    const column = columnLock ? letters : columnLetters(columnIndex(letters) + columns);
    const row = rowLock ? digits : Number(digits) + rows;
    return `${columnLock}${column}${rowLock}${row}`;
  });
};

// --- shared strings -------------------------------------------------------
const zip = readZip(source);
const sharedXml = zip.get("xl/sharedStrings.xml")?.() ?? "";
const sharedStrings = (sharedXml.match(/<si>[\s\S]*?<\/si>|<si\/>/g) ?? []).map((item) =>
  decode((item.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((run) => run.replace(/<[^>]+>/g, "")).join("")),
);

// --- number formats -------------------------------------------------------
// Built-ins Excel never writes out; only the ones this workbook can hit are worth listing.
const builtinFormats = {
  0: "General", 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00", 9: "0%", 10: "0.00%", 11: "0.00E+00",
  14: "m/d/yyyy", 15: "d-mmm-yy", 16: "d-mmm", 17: "mmm-yy", 18: "h:mm AM/PM", 19: "h:mm:ss AM/PM",
  20: "h:mm", 21: "h:mm:ss", 22: "m/d/yyyy h:mm", 37: "#,##0 ;(#,##0)", 38: "#,##0 ;[Red](#,##0)",
  39: "#,##0.00;(#,##0.00)", 40: "#,##0.00;[Red](#,##0.00)", 44: "_(\"$\"* #,##0.00_)",
  45: "mm:ss", 46: "[h]:mm:ss", 47: "mmss.0", 48: "##0.0E+0", 49: "@",
};
const stylesXml = zip.get("xl/styles.xml")?.() ?? "";
// Only the <numFmts> table defines real format ids; <dxfs> further down redeclares the same
// ids for conditional formatting and would otherwise overwrite them.
const customFormats = new Map(
  ((stylesXml.match(/<numFmts[\s\S]*?<\/numFmts>/)?.[0] ?? "").match(/<numFmt [^>]*\/>/g) ?? []).map((tag) => [
    Number(attribute(tag, "numFmtId")),
    decode(attribute(tag, "formatCode") ?? ""),
  ]),
);
// Split rather than regex-match: an <xf> may be self-closing or wrap <alignment>, and a
// single pattern for both happily swallows several entries at once.
const cellFormats = (stylesXml.match(/<cellXfs[\s\S]*?<\/cellXfs>/)?.[0] ?? "")
  .split("<xf ")
  .slice(1)
  .map((chunk) => {
    const id = Number(chunk.match(/numFmtId="(\d+)"/)?.[1] ?? 0);
    return customFormats.get(id) ?? builtinFormats[id] ?? "General";
  });

// --- sheets ---------------------------------------------------------------
const workbookXml = zip.get("xl/workbook.xml")();
const relsXml = zip.get("xl/_rels/workbook.xml.rels")();
const relationships = new Map(
  (relsXml.match(/<Relationship[^>]*\/>/g) ?? []).map((tag) => [attribute(tag, "Id"), attribute(tag, "Target")]),
);

const sheets = (workbookXml.match(/<sheet [^>]*\/>/g) ?? []).map((tag) => {
  const name = decode(attribute(tag, "name") ?? "");
  const target = relationships.get(attribute(tag, "r:id") ?? "") ?? "";
  const xml = zip.get(`xl/${target.replace(/^\/?xl\//, "")}`)();
  const address = attribute(xml.match(/<dimension[^>]*\/>/)?.[0] ?? "", "ref") ?? "A1:A1";
  const [from, to = from] = address.split(":");
  const firstRow = Number(from.match(/\d+/)?.[0] ?? 1);
  const lastRow = Number(to.match(/\d+/)?.[0] ?? 1);
  const firstColumn = columnIndex(from);
  const width = columnIndex(to) - firstColumn + 1;
  const height = lastRow - firstRow + 1;

  // si -> the cell that holds a shared formula's only copy of the text.
  const sharedMasters = new Map();

  const values = Array.from({ length: height }, () => Array.from({ length: width }, () => null));
  const formulas = Array.from({ length: height }, () => Array.from({ length: width }, () => ""));
  const numberFormats = Array.from({ length: height }, () => Array.from({ length: width }, () => "General"));

  for (const cell of xml.match(/<c [^>]*\/>|<c [^>]*>[\s\S]*?<\/c>/g) ?? []) {
    const head = cell.match(/<c [^>]*?\/?>/)[0];
    const reference = attribute(head, "r") ?? "";
    const row = Number(reference.match(/\d+/)?.[0] ?? 0) - firstRow;
    const column = columnIndex(reference) - firstColumn;
    if (row < 0 || row >= height || column < 0 || column >= width) continue;

    const style = Number(attribute(head, "s") ?? -1);
    numberFormats[row][column] = cellFormats[style] ?? "General";

    // A column of identical formulas is stored once: the first cell carries the text and an
    // si="n", the rest carry only <f t="shared" si="n"/>. Reading the literal text alone leaves
    // whole columns looking formula-free, so the shared master is translated to each cell that
    // refers to it — every relative reference moves by the same row and column offset.
    const formulaTag = cell.match(/<f[^>]*\/>|<f[^>]*>[\s\S]*?<\/f>/)?.[0];
    if (formulaTag) {
      const body = formulaTag.match(/<f[^>]*>([\s\S]*?)<\/f>/)?.[1] ?? "";
      const shareId = attribute(formulaTag, "si");
      if (body) {
        formulas[row][column] = `=${decode(body)}`;
        if (shareId !== undefined) sharedMasters.set(shareId, { text: decode(body), reference });
      } else if (shareId !== undefined && sharedMasters.has(shareId)) {
        const master = sharedMasters.get(shareId);
        formulas[row][column] = `=${translate(master.text, master.reference, reference)}`;
      }
    }

    const type = attribute(head, "t") ?? "n";
    const raw = cell.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1];
    if (type === "s") {
      // THE FIX: <v> is an index into sharedStrings. `?? ""` keeps a resolved empty
      // string empty instead of falling back to the index and printing "80".
      const text = sharedStrings[Number(raw)] ?? "";
      values[row][column] = text === "" ? null : text;
    } else if (type === "inlineStr") {
      const text = decode((cell.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((run) => run.replace(/<[^>]+>/g, "")).join(""));
      values[row][column] = text === "" ? null : text;
    } else if (type === "str") {
      const text = decode(raw ?? "");
      values[row][column] = text === "" ? null : text;
    } else if (type === "b") {
      values[row][column] = raw === "1";
    } else if (type === "e") {
      values[row][column] = decode(raw ?? "");
    } else if (raw !== undefined && raw !== "") {
      values[row][column] = Number(raw);
    }
  }

  return { name, address, values, formulas, numberFormats };
});

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify({ source: source.split(/[\\/]/).pop(), sheets }, null, 0)}\n`);

const blanks = sheets.reduce((total, sheet) => total + sheet.values.flat().filter((cell) => cell === null).length, 0);
console.log(`${sheets.length} sheets -> ${target}`);
console.log(sheets.map((sheet) => `  ${sheet.name} ${sheet.address} (${sheet.values.length} rows)`).join("\n"));
console.log(`${blanks} blank cells written as null`);
