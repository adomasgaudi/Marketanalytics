import { SODRA, SODRA_YEARS, type SodraCompany } from "./sodra-data";
import type { Sheet } from "./WorkbookViewer";

/**
 * The Sodra sheet: every month Sodra has published for a company, with each
 * year's figure sitting immediately after its twelve months — the total next
 * to what it was made of.
 *
 *   … 2024-01  2024-02  …  2024-12 │ 2024 Σ │ 2025-01  …
 *
 * Two rows only, headcount and wage, because those are the two things Sodra
 * actually reports. Everything else is arithmetic and belongs elsewhere.
 *
 * The Σ column treats them differently, and must:
 *   Darbuotojai  AVERAGED — the same 40 people are in all twelve months, so a
 *                sum would be twelve times the company.
 *   Atlyginimas  SUMMED   — twelve monthly wages add up to a year's pay. This
 *                is the whole point: the legacy dataset took ONE month and
 *                multiplied by twelve, which any hire, leaver or bonus breaks.
 */
const GAP_ROWS = 2;
const round = (value: number | null) => (value == null ? null : Math.round(value));
/** A spacer row still needs a cell per column: the grid reads values[row][col],
    and a short row renders "undefined" straight into the gap. */
const blankRow = (width: number) => Array<null>(width).fill(null);

/** How far the legacy annualisation sits from the summed truth, as a signed %.
    Blank on month columns and wherever either figure is missing. */
const gapText = (
  entry: { wageBill: number | null; legacyWageBill: number | null } | undefined,
  column: { month: number | null },
) => {
  if (column.month != null || !entry?.wageBill || !entry.legacyWageBill) return null;
  const gap = entry.wageBill / entry.legacyWageBill - 1;
  return `${gap >= 0 ? "+" : ""}${(gap * 100).toFixed(1)}%`;
};

type Column = { year: number; month: number | null };

/**
 * Twelve months then the year's own figure — but ONLY when a single year is
 * chosen. Every month of every year at once is 144 columns across 575 rows,
 * ~83,000 cells, which no browser renders without locking up. So "All years"
 * shows one column per year and picking a year opens its twelve months.
 * `month: null` marks a year column.
 */
const columnsFor = (years: number[], expanded: boolean): Column[] =>
  years.flatMap((year) =>
    expanded
      ? [
          ...Array.from({ length: 12 }, (_, index) => ({ year, month: index + 1 })),
          { year, month: null },
        ]
      : [{ year, month: null }],
  );

const heading = (column: Column) =>
  column.month == null
    ? `${column.year} Σ`
    : `${column.year}-${String(column.month).padStart(2, "0")}`;

const across = (year: number | null): Sheet => {
  const years = year ? SODRA_YEARS.filter((entry) => entry === year) : SODRA_YEARS;
  const columns = columnsFor(years, year != null);
  const width = columns.length + 1;

  const values: (string | number | null)[][] = [["Rodiklis", ...columns.map(heading)]];
  const rowGroups: (string | null)[] = [null];
  const rowClasses: (string | null)[] = [null];
  const push = (row: (string | number | null)[], group: string | null, cls: string) => {
    values.push(row);
    rowGroups.push(group);
    rowClasses.push(cls);
  };

  const monthOf = (company: SodraCompany, column: Column) =>
    column.month == null
      ? undefined
      : company.byMonth.get(column.year * 100 + column.month);

  for (const company of SODRA) {
    push([company.brand, ...blankRow(columns.length)], company.brand, "block-title");
    push(
      [
        "Darbuotojai",
        ...columns.map((column) =>
          column.month == null
            ? round(company.years[column.year]?.avgHeadcount ?? null)
            : (monthOf(company, column)?.insured ?? null),
        ),
      ],
      company.brand,
      "block-row",
    );
    push(
      [
        "Atlyginimas",
        ...columns.map((column) =>
          column.month == null
            ? // Averaged, never summed. Twelve monthly averages added together
              // is not a year's pay for anyone — it is mean × 12 pretending to
              // be a measurement. The payroll row below is the summed figure.
              round(company.years[column.year]?.avgWage ?? null)
            : round(monthOf(company, column)?.avgWage ?? null),
        ),
      ],
      company.brand,
      "block-row",
    );
    // The wage BILL — wage x headcount — beside the legacy dataset's version of
    // it, which annualised a single month. Yearly figures only: a month column
    // has nothing to compare against.
    // The payroll: each month's wage multiplied by that month's headcount, and
    // the year column their SUM. This is the one figure here that may be summed
    // — twelve payrolls really do add up to a year's payroll, while twelve
    // average wages add up to nothing anybody was paid.
    push(
      [
        "Algų fondas",
        ...columns.map((column) => {
          if (column.month == null)
            return round(company.years[column.year]?.wageBill ?? null);
          const month = monthOf(company, column);
          return month?.avgWage != null && month.insured != null
            ? Math.round(month.avgWage * month.insured)
            : null;
        }),
      ],
      company.brand,
      "block-row",
    );
    push(
      [
        "Algų fondas (senoji ×12)",
        ...columns.map((column) =>
          column.month == null
            ? (company.years[column.year]?.legacyWageBill ?? null)
            : null,
        ),
      ],
      company.brand,
      "block-row",
    );
    push(
      ["Skirtumas", ...columns.map((column) => gapText(company.years[column.year], column))],
      company.brand,
      "block-row",
    );
    for (let i = 0; i < GAP_ROWS; i++) push(blankRow(width), null, "block-gap");
  }

  return {
    name: "Sodra",
    compactNumbers: true,
    address: `A1:${width}x${values.length}`,
    values,
    rowGroups,
    rowClasses,
  };
};

/** Flipped: a row per month, the two metrics as columns. Same data, and the
    only shape that stays readable once every month of ten years is on screen. */
const down = (year: number | null): Sheet => {
  const years = year ? SODRA_YEARS.filter((entry) => entry === year) : SODRA_YEARS;
  const columns = columnsFor(years, year != null);

  const values: (string | number | null)[][] = [
    [
      "Laikotarpis",
      "Darbuotojai",
      "Atlyginimas",
      "Algų fondas",
      "Algų fondas (senoji ×12)",
      "Skirtumas",
    ],
  ];
  const rowGroups: (string | null)[] = [null];
  const rowClasses: (string | null)[] = [null];
  const push = (row: (string | number | null)[], group: string | null, cls: string) => {
    values.push(row);
    rowGroups.push(group);
    rowClasses.push(cls);
  };

  for (const company of SODRA) {
    push([company.brand, null, null, null, null, null], company.brand, "block-title");
    for (const column of columns) {
      const summary = company.years[column.year];
      if (column.month == null) {
        // The year's own line: headcount averaged, wage summed.
        push(
          [
            heading(column),
            round(summary?.avgHeadcount ?? null),
            round(summary?.avgWage ?? null),
            round(summary?.wageBill ?? null),
            summary?.legacyWageBill ?? null,
            gapText(summary, column),
          ],
          company.brand,
          "block-row",
        );
        continue;
      }
      const month = company.byMonth.get(column.year * 100 + column.month);
      if (!month) continue;
      // The month's own payroll: its wage x its headcount. The legacy
      // comparison stays blank — a month has nothing to compare against.
      push(
        [
          heading(column),
          month.insured ?? null,
          round(month.avgWage ?? null),
          month.avgWage != null && month.insured != null
            ? Math.round(month.avgWage * month.insured)
            : null,
          null,
          null,
        ],
        company.brand,
        "block-row",
      );
    }
    for (let i = 0; i < GAP_ROWS; i++) push(blankRow(6), null, "block-gap");
  }

  return {
    name: "Sodra",
    compactNumbers: true,
    address: `A1:F${values.length}`,
    values,
    rowGroups,
    rowClasses,
  };
};

export const buildSodraSheet = (
  orientation: "across" | "down",
  year: number | null,
): Sheet => (orientation === "down" ? down(year) : across(year));
