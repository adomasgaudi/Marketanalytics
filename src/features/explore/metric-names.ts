// Every name the workbook grid shows for a metric, and the order the metrics sit in. Change a
// name here and it changes in the heading, the hover, the popups and the tooltips at once.
//
//   sheet — what the column is called in Original.xlsx. This is the key: it must match, or the
//           metric will not be found. Never rename it to change what the grid says.
//   code  — the short heading in the grid. A metric heading spans only its own year columns,
//           so a full Lithuanian name is far wider than the space it has. 5-10 characters.
//   label — the full name, shown on hover and in popups. Rename freely.
//
// Order in this list is left-to-right order in the grid. Metrics named here are laid out in this
// order; anything not named keeps the place the sheet gave it. Figures that other figures are
// worked out from come first, so a column is never explained by one further right.
export type MetricName = {
  sheet: string;
  code: string;
  label: string;
};

export const metricNames: MetricName[] = [
  { sheet: "Darbuotojai", code: "DARBUOT", label: "Darbuotojai" },
  { sheet: "Atlyginimų vidurkis", code: "ATL.VID", label: "Atlyginimų vidurkis" },
  { sheet: "Apyvarta", code: "APYVART", label: "Apyvarta" },
  {
    sheet: "Ne atlyginimų sąnaudos darbuotojui",
    code: "NEATL.VID",
    label: "Ne atlyginimų sąnaudos darbuotojui",
  },
  { sheet: "Grynasis pelnas", code: "GR.PELN", label: "Grynasis pelnas" },
  // Named "Fiks ir pelno mokestis" in the sheet, but it is not a tax: every row is exactly
  // 0.43 × DU sąnaudos, and Spėjamos pajamos = DU × 1.43 + pelnas. It is the agency's own
  // overhead allowance, so the grid calls it what it is. `sheet` must stay as the sheet has it.
  {
    sheet: "Fiks ir pelno mokestis",
    code: "OPEX",
    label: "Savos veiklos sąnaudos (43% nuo DU)",
  },
  { sheet: "Spėjamos pajamos", code: "SPĖJ.PAJ", label: "Spėjamos pajamos" },
  { sheet: "Skola Sodrai", code: "SKOLA", label: "Skola Sodrai" },
];

// The whole-company side of the metrics that carry a per-employee/total switch. Not in the order
// above: they stand in for their per-employee metric rather than taking a place of their own.
export const totalNames: MetricName[] = [
  { sheet: "Atlyginimų sąnaudos", code: "ATL.SĄN", label: "Atlyginimų sąnaudos" },
  {
    sheet: "Ne atlyginimų sąnaudos",
    code: "NEATL.SĄN",
    label: "Ne atlyginimų sąnaudos",
  },
];

const bySheet = new Map(
  [...metricNames, ...totalNames].map((entry) => [entry.sheet, entry]),
);

// Anything the dictionary does not name still needs shortening: the first two words, clipped.
const improvised = (name: string) =>
  name
    .split(/[^\p{L}\d]+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.slice(0, 4).toUpperCase())
    .join(".")
    .slice(0, 10);

export const codeOf = (sheet: string) =>
  sheet ? (bySheet.get(sheet)?.code ?? improvised(sheet)) : sheet;

export const labelOf = (sheet: string) => bySheet.get(sheet)?.label ?? sheet;

// Where a metric sits left-to-right. Unnamed metrics keep the place the sheet gave them.
export const orderOf = (sheet: string) =>
  metricNames.findIndex((entry) => entry.sheet === sheet);
