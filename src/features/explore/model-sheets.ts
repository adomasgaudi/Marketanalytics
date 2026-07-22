import type { Sheet } from "./WorkbookViewer";
import { COMPANIES, METRICS, type Metric, YEARS } from "./model-data";

/**
 * The rebuilt dataset expressed as a workbook sheet, so it renders through the
 * SAME grid as the source workbook — freeze panes, search, sort, hover detail
 * and full screen all come free. Nothing here draws a table; it only shapes
 * data into `values[0] = header, rest = rows`.
 *
 * One sheet, every company on it, each as its own block: a title row naming the
 * company, its metrics beneath, then blank rows before the next. The original
 * workbook ran companies together one per line, which is unreadable once a
 * company owns several rows.
 */
const GAP_ROWS = 2;

type Company = (typeof COMPANIES)[number];

const cellValue = (metricKey: string, year: number, company: Company) => {
  const value = company.values[metricKey]?.[year];
  if (value == null) return null;
  // A part-year tax figure must never read as a full year's.
  const month = metricKey === "taxes" ? company.partialTax[year] : undefined;
  return month ? `${value} (1–${month})` : value;
};

/** The mark this figure wears, and the sentence behind it on hover. Empty
    where there is no figure — a blank cell has no provenance to state. */
const cellMark = (metricKey: string, year: number, company: Company) => {
  const from = company.sources[metricKey]?.[year];
  if (company.values[metricKey]?.[year] == null || !from) return null;
  return from.mark;
};

const cellTitle = (metricKey: string, year: number, company: Company) => {
  const from = company.sources[metricKey]?.[year];
  if (!from) return null;
  return `${from.label} — scraped ${from.at.slice(0, 10)}`;
};

/** The block's heading: the brand alone. The legal name and the registry code
    are on the row's hover, not in the caption — a caption names the block. */
const title = (company: Company) => company.brand;

const blankRow = (width: number) => Array<null>(width).fill(null);

/** Years across the top, metrics down the side — the default reading. */
const across = (years: number[], metrics: Metric[]): Sheet => {
  const width = years.length + 1;
  // "Metai 2015", not "2015": the viewer reads a header as <group> <period>, and
  // only a column with a group can be dropped by the year filter. The group also
  // gives the years a heading bar of their own.
  const values: (string | number | null)[][] = [
    ["Rodiklis", ...years.map((year) => `Metai ${year}`)],
  ];
  const rowGroups: (string | null)[] = [null];
  const rowClasses: (string | null)[] = [null];
  // Provenance rides in its own grids, laid out cell-for-cell against `values`.
  const cellMarks: (string | null)[][] = [blankRow(width)];
  const cellTitles: (string | null)[][] = [blankRow(width)];
  for (const company of COMPANIES) {
    values.push([title(company), ...blankRow(years.length)]);
    cellMarks.push(blankRow(width));
    cellTitles.push(blankRow(width));
    rowGroups.push(company.brand);
    rowClasses.push("block-title");
    for (const metric of metrics) {
      values.push([
        metric.label,
        ...years.map((year) => cellValue(metric.key, year, company)),
      ]);
      cellMarks.push([null, ...years.map((y) => cellMark(metric.key, y, company))]);
      cellTitles.push([null, ...years.map((y) => cellTitle(metric.key, y, company))]);
      // Every row of the block carries the company, so searching the company
      // name reveals its figures and not just its heading.
      rowGroups.push(company.brand);
      rowClasses.push("block-row");
    }
    for (let i = 0; i < GAP_ROWS; i++) {
      values.push(blankRow(width));
      cellMarks.push(blankRow(width));
      cellTitles.push(blankRow(width));
      rowGroups.push(null);
      rowClasses.push("block-gap");
    }
  }
  return {
    name: "Cashflow",
    compactNumbers: true,
    address: `A1:${colName(width)}${values.length}`,
    values,
    rowGroups,
    rowClasses,
    cellMarks,
    cellTitles,
  };
};

/** Swapped: a row per year, a column per metric. */
const down = (years: number[], metrics: Metric[]): Sheet => {
  const width = metrics.length + 1;
  const values: (string | number | null)[][] = [
    ["Metai", ...metrics.map((metric) => metric.label)],
  ];
  const rowGroups: (string | null)[] = [null];
  const rowClasses: (string | null)[] = [null];
  const cellMarks: (string | null)[][] = [blankRow(width)];
  const cellTitles: (string | null)[][] = [blankRow(width)];
  for (const company of COMPANIES) {
    values.push([title(company), ...blankRow(metrics.length)]);
    cellMarks.push(blankRow(width));
    cellTitles.push(blankRow(width));
    rowGroups.push(company.brand);
    rowClasses.push("block-title");
    for (const year of years) {
      values.push([
        String(year),
        ...metrics.map((metric) => cellValue(metric.key, year, company)),
      ]);
      cellMarks.push([null, ...METRICS.map((m) => cellMark(m.key, year, company))]);
      cellTitles.push([null, ...METRICS.map((m) => cellTitle(m.key, year, company))]);
      rowGroups.push(company.brand);
      rowClasses.push("block-row");
    }
    for (let i = 0; i < GAP_ROWS; i++) {
      values.push(blankRow(width));
      cellMarks.push(blankRow(width));
      cellTitles.push(blankRow(width));
      rowGroups.push(null);
      rowClasses.push("block-gap");
    }
  }
  return {
    name: "Cashflow",
    compactNumbers: true,
    address: `A1:${colName(width)}${values.length}`,
    values,
    rowGroups,
    rowClasses,
    cellMarks,
    cellTitles,
  };
};

function colName(count: number) {
  return String.fromCharCode(64 + Math.min(count, 26));
}

/**
 * One sheet, for the chosen orientation and year. `year: null` means every year.
 * The year is applied HERE rather than by the viewer's own column filter,
 * because flipped the years are rows — and that filter only drops columns.
 */
export const buildModelSheet = (
  orientation: "across" | "down",
  year: number | null,
  showOptional = false,
): Sheet[] => {
  const years = year ? YEARS.filter((entry) => entry === year) : YEARS;
  // The +1,77% column repeats its neighbour almost exactly, so it is off by
  // default — but the 1,0177 is always in the arithmetic behind Agentūros
  // pajamos whether or not the column is on screen.
  const metrics = showOptional ? METRICS : METRICS.filter((m) => !m.optional);
  return [orientation === "down" ? down(years, metrics) : across(years, metrics)];
};
