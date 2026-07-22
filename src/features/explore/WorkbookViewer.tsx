"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import workbook from "../../../data/workbook.json";
import disagreements from "../../../data/disagreements.json";
import { codeOf, labelOf, orderOf } from "./metric-names";

type CellValue = string | number | boolean | null;
type CellStyle = {
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  left?: number;
  top?: number;
};
// What a derived column replaced. Keyed "row-column": the figure the sheet stored, a note where
// that figure disagrees with the derivation, and the cells nothing in the sheet accounts for.
type Derivation = {
  columns: Set<number>;
  formulaByColumn: Map<number, string>;
  stored: Map<string, CellValue>;
  storedFormulas: Map<string, string>;
  notes: Map<string, string>;
  unexplained: Set<string>;
};
type Sheet = {
  name: string;
  address: string;
  values: CellValue[][];
  formulas?: string[][];
  numberFormats?: string[][];
  derived?: Derivation;
};

// Columns lifted out of the grid: they are hidden, and their values show as a hover
// popup on the anchor column instead. Labels come from the sheet's own header row.
type SheetConfig = {
  anchor: number;
  hidden: number[];
  shortenNames?: number[];
  narrow?: number[];
};
const sheetConfig: Record<string, SheetConfig> = {
  // The tab that holds everything: Įmonės renamed, with Raw already merged in
  // (scripts/merge-raw-into-imones.mjs) and Įmonės-analizei kept alongside as a supplementary
  // per-year view. Columns 1-16 are contacts and registry data, 77-82 the links and risk tail,
  // 83-91 what came over from Raw — all company facts, all in the name cell's hover.
  Main: {
    anchor: 0,
    hidden: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 77, 78, 79, 80, 81, 82, 83,
      84, 85, 86, 87, 88, 89, 90, 91,
      // The five activity categories Įmonės-analizei knows and this sheet did not (92-96).
      92,
      93, 94, 95, 96,
    ],
    shortenNames: [0],
  },
};

// The export writes missing values as a literal \N.
const isBlank = (value: CellValue) => value === null || value === "" || value === "\\N";

const columnName = (index: number) => {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
};

const addressStart = (address: string) => {
  const match = address.match(/^([A-Z]+)(\d+)/);
  if (!match) return { column: 0, row: 1 };
  const column =
    match[1]
      .split("")
      .reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  return { column, row: Number(match[2]) };
};

const formatNumber = (value: number, excelFormat?: string) => {
  if (excelFormat?.includes("%")) {
    const decimals = Math.max(0, excelFormat.match(/0\.([0#]+)/)?.[1].length ?? 1);
    return new Intl.NumberFormat("lt-LT", {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
  if (excelFormat?.includes("0.00"))
    return new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 2 }).format(value);
  if (excelFormat?.includes("0.0"))
    return new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 1 }).format(value);
  return new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 12 }).format(value);
};

const displayCell = (value: CellValue, format?: string) => {
  if (isBlank(value)) return "";
  return typeof value === "number" ? formatNumber(value, format) : String(value);
};

// "Darbuotojai 2019" -> metric "Darbuotojai" above, period "2019" in the column itself.
// Anything without a trailing period keeps its full label and gets no metric heading.
const splitHeader = (label: CellValue) => {
  const text = typeof label === "string" ? label.trim() : "";
  const match = text.match(/^(.*?)[\s.]*((?:19|20)\d{2}(?:[\s.-]+\d{2})*)$/);
  return match && match[1]
    ? { group: match[1].trim(), period: match[2] }
    : { group: "", period: text };
};

// Every "… Pokytis 19-20" column is a change on the year column just left of it, so it leaves
// the grid and shows up when that year's cell is hovered instead.
const isChangeHeader = (label: CellValue) =>
  typeof label === "string" && /pokytis/i.test(label);

// Both sides of the comparison are shown at 3 significant figures, so a pasted -0.24
// and a recomputed -0.238095… are read on the same scale.
const sigFigs = (value: CellValue, digits = 3) =>
  typeof value === "number" && Number.isFinite(value) && value !== 0
    ? Number(value.toPrecision(digits))
    : value;

// Rounded figures read as 8,9M rather than 8 900 000 — the zeros carry no information once rounded.
const mantissa = new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 2 });
const compactNumber = (value: number) => {
  const size = Math.abs(value);
  const [divisor, suffix] =
    size >= 1e9
      ? [1e9, "B"]
      : size >= 1e6
        ? [1e6, "M"]
        : size >= 1e3
          ? [1e3, "K"]
          : [1, ""];
  return mantissa.format(value / divisor) + suffix;
};

// Changes ride along next to the figure they belong to, so they stay short: "+4,0 %".
const percentFormat = new Intl.NumberFormat("lt-LT", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const parseNumeric = (value: CellValue) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  return /^-?\d*\.?\d+$/.test(cleaned) ? Number(cleaned) : null;
};

// Įmonės-analizei repeats figures Main also holds, one row per company-year. Where the two
// disagree the cell is marked rather than quietly trusted — after the duplicated columns were
// dropped, what is left disagrees somewhere, and that is the interesting part. Each entry says
// how Main expresses the same figure; `of` reads a metric for the row's own year.
type MainReader = (metric: string, yearOffset?: number) => number | null;
const salaryBill = (of: MainReader, offset = 0) => {
  const wage = of("Atlyginimų vidurkis", offset);
  const staff = of("Darbuotojai", offset);
  return wage === null || staff === null ? null : wage * staff * 12;
};
const otherCosts = (of: MainReader, offset = 0) => {
  const du = salaryBill(of, offset);
  const turnover = of("Apyvarta", offset);
  const profit = of("Grynasis pelnas", offset);
  return du === null || turnover === null || profit === null
    ? null
    : turnover - du - profit;
};
const mainMirror: Record<string, (of: MainReader, offset?: number) => number | null> = {
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
// A recorded disagreement names a field of the retired sheets; this is the Main metric whose
// column it argues with, so the flag lands on the figure a reader would compare it against.
const recordedIn: Record<string, string> = {
  "Darbuotojų skaičius": "Darbuotojai",
  "Darbuotojų pokytis, %": "Darbuotojai",
  "Atlyginimo vidurkis": "Atlyginimų vidurkis",
  "Atlyginimo pokytis, %": "Atlyginimų vidurkis",
  "DU sąnaudos": "Atlyginimų vidurkis",
  "DU sąnaudų pokytis, %": "Atlyginimų vidurkis",
  Apyvarta: "Apyvarta",
  "Apyvartos pokytis, %": "Apyvarta",
  Pelnas: "Grynasis pelnas",
  "Pelno pokytis, %": "Grynasis pelnas",
  "Ne-atlyginimų sąnaudos": "Ne atlyginimų sąnaudos darbuotojui",
  "Ne-atlyginimų sąnaudų pokytis, %": "Ne atlyginimų sąnaudos darbuotojui",
  "Fiks ir pelno mokestis": "Fiks ir pelno mokestis",
  "Spėjamos pajamos": "Spėjamos pajamos",
};

// Figures that are worked out from the turnover, and so mean nothing without one.
const derivedFromTurnover = new Set(["Ne-atlyginimų sąnaudos", "Spėjamos pajamos"]);

// Each change column measures one of those metrics against the year before.
const changeMirror: Record<string, string> = {
  "Darbuotojų pokytis, %": "Darbuotojų skaičius",
  "Atlyginimo pokytis, %": "Atlyginimo vidurkis",
  "DU sąnaudų pokytis, %": "DU sąnaudos",
  "Apyvartos pokytis, %": "Apyvarta",
  "Ne-atlyginimų sąnaudų pokytis, %": "Ne-atlyginimų sąnaudos",
  "Pelno pokytis, %": "Pelnas",
};

// Some metrics are the same fact at two scales, so they share one column and a switch rather
// than taking up two. "Atlyginimų vidurkis" is the monthly wage of one employee; the yearly
// wage bill of everyone is that times headcount times twelve — which is how the workbook's own
// "Atlyginimų sąnaudos" formula reads. That column is folded away: 168 of its cells hold a
// monthly figure where the rest hold a yearly one, so recomputing beats reading it.
type MetricMode = {
  total: string;
  scale: (perEmployee: number, staff: number) => number;
};
const metricModes: Record<string, MetricMode> = {
  "Atlyginimų vidurkis": {
    total: "Atlyginimų sąnaudos",
    scale: (wage, staff) => wage * staff * 12,
  },
  "Ne atlyginimų sąnaudos darbuotojui": {
    total: "Ne atlyginimų sąnaudos",
    scale: (cost, staff) => cost * staff,
  },
};
const foldedMetrics = new Set(Object.values(metricModes).map((mode) => mode.total));

// Two figures the analysis sheet works out per year. They are computed here from the figures
// already in the row rather than copied across, so they follow the data instead of going stale:
//   salary cost   = average salary × headcount × 12   (the workbook's own formula)
//   other costs   = turnover − salary cost − profit
//   tax           = salary cost × 0.43
//   likely income = turnover − other costs + tax
// The salary cost is recomputed rather than read because the stored column mixes monthly and
// annual figures (168 of its cells are 12x too low).
const taxRate = 0.43;
const computedMetrics = [
  { name: "Fiks ir pelno mokestis", of: (du: number) => du * taxRate },
  {
    name: "Spėjamos pajamos",
    of: (du: number, apyvarta: number, pelnas: number) => du + pelnas + du * taxRate,
  },
];

const withComputedColumns = (sheet: Sheet): Sheet => {
  const header = sheet.values[0] ?? [];
  const columnOf = (name: string) => header.indexOf(name);
  const years = header.flatMap((cell) =>
    typeof cell === "string" && cell.startsWith("Apyvarta ")
      ? [cell.slice("Apyvarta ".length)]
      : [],
  );
  const inputs = years
    .map((year) => ({
      year,
      salary: columnOf(`Atlyginimų vidurkis ${year}`),
      staff: columnOf(`Darbuotojai ${year}`),
      turnover: columnOf(`Apyvarta ${year}`),
      profit: columnOf(`Grynasis pelnas ${year}`),
    }))
    .filter(
      (entry) =>
        entry.salary >= 0 && entry.staff >= 0 && entry.turnover >= 0 && entry.profit >= 0,
    );
  if (!inputs.length) return sheet;

  const values = sheet.values.map((row) => [...row]);
  computedMetrics.forEach((metric) => {
    inputs.forEach((entry) => {
      values[0].push(`${metric.name} ${entry.year}`);
      for (let index = 1; index < values.length; index += 1) {
        const salary = parseNumeric(values[index][entry.salary]);
        const staff = parseNumeric(values[index][entry.staff]);
        const turnover = parseNumeric(values[index][entry.turnover]);
        const profit = parseNumeric(values[index][entry.profit]);
        const du = salary === null || staff === null ? null : salary * staff * 12;
        values[index].push(
          du === null || !du || turnover === null || profit === null
            ? null
            : metric.of(du, turnover, profit),
        );
      }
    });
  });
  return { ...sheet, values };
};

// A figure the sheet stores but should work out. Half of Main's rows were pasted in as static
// values, so the stored column is a mix of live formulas and numbers frozen at some past moment —
// the cell is recomputed from the core figures instead, and what it held is kept for comparison.
// The wage bill is expanded to `vidurkis × darbuotojai × 12` rather than read from "Atlyginimų
// sąnaudos", because that column holds one month in many rows: the very fault being corrected.
const derivedColumns = [
  {
    metric: "Ne atlyginimų sąnaudos darbuotojui",
    inputs: ["Apyvarta", "Atlyginimų vidurkis", "Darbuotojai"],
    of: ([turnover, wage, staff]: number[]) =>
      staff ? (turnover - wage * staff * 12) / staff : null,
    // How the same cell reads if the broken salary column is taken at face value. Where that
    // reproduces the stored figure, the disagreement is the known monthly/yearly fault.
    asStored: ([turnover, , staff]: number[], salaryBill: number | null) =>
      staff && salaryBill !== null ? (turnover - salaryBill) / staff : null,
    storedSalary: "Atlyginimų sąnaudos",
    // Written in the workbook's own reference syntax so the cell traces back to its inputs.
    formula: ([turnover, wage, staff]: string[]) =>
      `=(${turnover}-${wage}*${staff}*12)/${staff}`,
  },
];

// "Apyvarta 2024" -> "[[#This Row],[Apyvarta 2024]]", which formulaTokens reads as a named term.
const thisRow = (label: string) => `[[#This Row],[${label}]]`;

const agrees = (a: number, b: number) =>
  Math.abs(a - b) <= Math.max(1, Math.abs(b)) * 0.01;

const withDerivedColumns = (sheet: Sheet): Sheet => {
  const header = sheet.values[0] ?? [];
  const derived: Derivation = {
    columns: new Set(),
    formulaByColumn: new Map(),
    stored: new Map(),
    storedFormulas: new Map(),
    notes: new Map(),
    unexplained: new Set(),
  };
  const values = sheet.values.map((row) => [...row]);

  derivedColumns.forEach((spec) => {
    header.forEach((cell, columnIndex) => {
      const { group, period } = splitHeader(cell);
      if (group !== spec.metric || !period) return;
      const inputs = spec.inputs.map((name) => header.indexOf(`${name} ${period}`));
      if (inputs.some((index) => index < 0)) return;
      const salaryColumn = header.indexOf(`${spec.storedSalary} ${period}`);
      derived.columns.add(columnIndex);
      derived.formulaByColumn.set(
        columnIndex,
        spec.formula(spec.inputs.map((name) => thisRow(`${name} ${period}`))),
      );

      values.forEach((row, rowIndex) => {
        if (rowIndex === 0) return;
        const key = `${rowIndex}-${columnIndex}`;
        const stored = row[columnIndex];
        const figures = inputs.map((index) => parseNumeric(row[index]));
        const value = figures.every((figure) => figure !== null)
          ? spec.of(figures as number[])
          : null;
        derived.stored.set(key, stored);
        const formula = sheet.formulas?.[rowIndex]?.[columnIndex];
        if (formula) derived.storedFormulas.set(key, formula);
        row[columnIndex] = value;

        const before = parseNumeric(stored);
        if (before === null) {
          // Nothing was stored, or it was an error the sheet never resolved — not a disagreement.
          if (value === null) return;
          return;
        }
        if (value === null) {
          derived.notes.set(
            key,
            `the sheet stored ${displayCell(sigFigs(before))} here, but the figures behind it are missing`,
          );
          derived.unexplained.add(key);
          return;
        }
        if (agrees(before, value)) return;

        const naive = spec.asStored(figures as number[], parseNumeric(row[salaryColumn]));
        const explained = naive !== null && agrees(before, naive);
        derived.notes.set(
          key,
          explained
            ? `the sheet stored ${displayCell(sigFigs(before))}, worked out from a wage bill of one month instead of twelve`
            : `the sheet stored ${displayCell(sigFigs(before))}, and nothing in the row accounts for it`,
        );
        if (!explained) derived.unexplained.add(key);
      });
    });
  });

  return derived.columns.size ? { ...sheet, values, derived } : sheet;
};

const sheets = (workbook.sheets as Sheet[])
  .map(withComputedColumns)
  .map(withDerivedColumns);

// "UAB \"Inspired Communications\"" -> "Inspired Communications"
const legalForms =
  /(^|[\s,(])(uab|ab|mb|všį|iį|vį|kūb|tūb|žūb|sį|ką|ltd|llc|inc|gmbh|oy|as)\.?(?=$|[\s,)])/gi;
const shortName = (name: string) => {
  const short = name
    .replace(/["“”„»«]/g, "")
    .replace(legalForms, "$1")
    .replace(/\s*[,(]\s*\)?/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.\-–]+|[\s,.\-–]+$/g, "");
  return short || name;
};

// Excel structured references are unreadable raw:
//   _20250609_reklama_data[[#This Row],[Atlyginimų vidurkis 2020]]*…[[Darbuotojai 2020]]*12
// Drop the table name and the [#This Row] wrapper so only the column name survives, then hand
// back tokens the popup can set as maths — named terms italic, ASCII operators as real signs.
const structuredReference =
  /(?:[A-Za-z_][\w.]*)?\[(?:\[#This Row\],)?\[?([^\][]+)\]?\]\]?/g;
const operatorSigns: Record<string, string> = {
  "*": "×",
  "/": "÷",
  "-": "−",
  ">=": "≥",
  "<=": "≤",
  "<>": "≠",
  "=": "=",
};

const formulaTokens = (formula: string) =>
  (
    formula
      .replace(/^=/, "")
      .replace(structuredReference, "«$1»")
      .match(/«[^»]*»|>=|<=|<>|[A-Za-z_][\w.]*|\d+(?:[.,]\d+)?|"[^"]*"|\S/g) ?? []
  ).map((token) =>
    token.startsWith("«")
      ? { kind: "name" as const, text: token.slice(1, -1) }
      : /^[\d.,]+$/.test(token)
        ? { kind: "number" as const, text: token }
        : { kind: "operator" as const, text: operatorSigns[token] ?? token },
  );

// A formula reads like code, not prose: "Atlyginimų vidurkis 2020" becomes ATLVI20. The full
// term is one hover away, so the shape of the expression stays visible at a glance.
const abbreviate = (label: string) => {
  const { group, period } = splitHeader(label);
  const words = (group || period).split(/[^\p{L}\d]+/u).filter(Boolean);
  const stem =
    words.length > 1
      ? words[0].slice(0, 3) + words[1].slice(0, 2)
      : (words[0]?.slice(0, 5) ?? "");
  const digits = group ? period.replace(/\D/g, "") : "";
  return (stem + (digits.length === 4 ? digits.slice(2) : digits)).toUpperCase();
};

// Layout choices (freeze panes, column widths) survive reloads.
const layoutKey = "financial-data-viewer:layout";
type Layout = {
  frozenColumns: number;
  frozenRows: number;
  widths: Record<string, Record<string, number>>;
  letters?: boolean;
};
const defaultLayout: Layout = { frozenColumns: 1, frozenRows: 1, widths: {} };

const readLayout = (): Layout => {
  try {
    const stored = window.localStorage.getItem(layoutKey);
    return stored
      ? { ...defaultLayout, ...(JSON.parse(stored) as Layout) }
      : defaultLayout;
  } catch {
    return defaultLayout;
  }
};

// Search text a sheet opens with. The company sheets list the whole market, so they start
// scoped to Fabula and every other row opens on click.
const sheetDefaultQuery: Record<string, string> = { Main: "fab" };
const defaultQuery = (sheetIndex: number) =>
  sheetDefaultQuery[sheets[sheetIndex]?.name] ?? "";

export function WorkbookViewer() {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [query, setQuery] = useState(() => defaultQuery(0));
  const [highlightFormulas, setHighlightFormulas] = useState(false);
  // The retired sheets' disagreements, marked in gold on the figures they argue with.
  const [showDisagreements, setShowDisagreements] = useState(true);
  // The ±% beside each figure. Off by default: it doubles the ink in every cell,
  // and the sort-by-change pills still work without it being on screen.
  const [showChanges, setShowChanges] = useState(false);
  // Ranking by any figure, which is all the retired Analizė-bendra tab ever did.
  const [sort, setSort] = useState<{
    column: number;
    ascending: boolean;
    byChange?: boolean;
  } | null>(null);
  // Metrics whose numbers are shown in full instead of rounded to 3 significant figures.
  const [exactGroups, setExactGroups] = useState<Set<string>>(new Set());
  // Metrics switched from per employee to the whole company.
  const [totalMetrics, setTotalMetrics] = useState<Set<string>>(new Set());
  // Derived metrics switched back to the figures the sheet itself stored, for comparison.
  const [storedMetrics, setStoredMetrics] = useState<Set<string>>(new Set());
  // Rows opened by clicking them while a search is narrowing the sheet.
  const [openedRows, setOpenedRows] = useState<Set<number>>(new Set());
  // The cell whose popup is pinned open by a click. Hover still previews a popup;
  // pinning is what lets you read a long one without keeping the pointer still.
  const [pinned, setPinned] = useState<{ row: number; column: number } | null>(null);
  // The formula cell whose inputs are being traced, and the arrows drawn to them.
  const [traced, setTraced] = useState<{ row: number; column: number } | null>(null);
  const [arrows, setArrows] = useState<
    { x1: number; y1: number; x2: number; y2: number; label: string; full: string }[]
  >([]);
  const [showSettings, setShowSettings] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  // null is untouched and falls back to the newest year; "" is a deliberate "All years";
  // a year keeps only that one, dropping the rest from the grid.
  const [yearChoice, setYearChoice] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>(defaultLayout);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [offsets, setOffsets] = useState<{ left: number[]; top: number[] }>({
    left: [],
    top: [],
  });
  const [groupRowHeight, setGroupRowHeight] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);
  const drag = useRef<{
    sheet: string;
    column: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const { frozenColumns, frozenRows } = layout;
  const setFrozenColumns = (value: number) =>
    setLayout((current) => ({ ...current, frozenColumns: value }));
  const setFrozenRows = (value: number) =>
    setLayout((current) => ({ ...current, frozenRows: value }));

  const toggleLetters = () =>
    setLayout((current) => ({ ...current, letters: !(current.letters ?? false) }));

  // Light/dark comes from the app's own theme switcher (data-theme on <html>);
  // the viewer's palette is scoped to that attribute in workbook-viewer.css.
  useEffect(() => {
    // localStorage can only be read after mount, so this state write is the
    // hydration-safe way in — same shape as TopNav's theme/palette restore.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLayout(readLayout());
    setLayoutLoaded(true);
  }, []);

  // Full screen hides the toolbar and, where the browser allows it, the chrome too.
  const toggleFullScreen = () => {
    const next = !fullScreen;
    setFullScreen(next);
    setShowSettings(false);
    if (next) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    const sync = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!layoutLoaded) return;
    try {
      window.localStorage.setItem(layoutKey, JSON.stringify(layout));
    } catch {
      // storage unavailable (private mode, quota) — layout just stops persisting
    }
  }, [layout, layoutLoaded]);

  const activeSheet = sheets[activeSheetIndex];
  const start = addressStart(activeSheet.address);
  const config = sheetConfig[activeSheet.name];
  const headerRow = activeSheet.values[0] ?? [];

  const hiddenColumns = useMemo(() => new Set(config?.hidden ?? []), [config]);

  // metric name -> its year columns, in sheet order
  const metricColumns = useMemo(() => {
    const map = new Map<string, number[]>();
    headerRow.forEach((cell, index) => {
      if (isChangeHeader(cell) || hiddenColumns.has(index)) return;
      const { group } = splitHeader(cell);
      if (!group) return;
      map.set(group, [...(map.get(group) ?? []), index]);
    });
    return map;
  }, [headerRow, hiddenColumns]);

  // Changes are computed, never read: the workbook's own "Pokytis" columns agree with the
  // arithmetic everywhere except one row where its sign is wrong, so they only leave the grid.
  // year column -> the year column it is measured against
  const previousYear = useMemo(() => {
    const map = new Map<number, number>();
    metricColumns.forEach((columns) => {
      columns.forEach((column, index) => {
        if (index > 0) map.set(column, columns[index - 1]);
      });
    });
    return map;
  }, [metricColumns]);

  const foldedColumns = useMemo(
    () =>
      new Set(
        headerRow.flatMap((cell, index) =>
          isChangeHeader(cell) || foldedMetrics.has(splitHeader(cell).group)
            ? [index]
            : [],
        ),
      ),
    [headerRow],
  );

  // Metrics keep their year columns together even when the sheet interleaves them.
  // Every other sheet repeats Main. A value Main already holds is not shown again — only what
  // Main cannot account for stays, and where the two disagree the cell says so.
  const { flags: mismatches, duplicates } = useMemo(() => {
    const flags = new Map<string, string>();
    const duplicates = new Set<string>();

    // In this sheet's own "Atlyginimų sąnaudos" column, 168 cells hold a monthly figure where
    // the rest hold a yearly one. Spotted by arithmetic, so it keeps up with the data.
    headerRow.forEach((cell, columnIndex) => {
      const { group, period } = splitHeader(cell);
      if (group !== "Atlyginimų sąnaudos") return;
      const wageColumn = headerRow.indexOf(`Atlyginimų vidurkis ${period}`);
      const staffColumnIndex = headerRow.indexOf(`Darbuotojai ${period}`);
      if (wageColumn < 0 || staffColumnIndex < 0) return;
      activeSheet.values.forEach((row, rowIndex) => {
        if (rowIndex === 0) return;
        const stored = parseNumeric(row[columnIndex]);
        const wage = parseNumeric(row[wageColumn]);
        const staff = parseNumeric(row[staffColumnIndex]);
        if (!stored || wage === null || staff === null || !wage || !staff) return;
        const monthly = wage * staff;
        if (Math.abs(stored - monthly) > Math.max(1, monthly) * 0.01) return;
        // The wage column is where this shows: it carries the salary bill behind the switch.
        flags.set(
          `${rowIndex}-${wageColumn}`,
          `the workbook stores one month here (${displayCell(sigFigs(stored))}), not a year`,
        );
      });
    });

    // The retired sheets left their disagreements behind in src/data/disagreements.json; each
    // one marks the Main cell it argues with, unless the reader has turned the marks off.
    if (!showDisagreements || activeSheet.name !== "Main") return { flags, duplicates };
    const rowOf = new Map<string, number>();
    activeSheet.values.forEach((row, index) => {
      if (index > 0 && !isBlank(row[0]))
        rowOf.set(shortName(String(row[0])).toLocaleLowerCase("lt-LT"), index);
    });

    disagreements.forEach((entry) => {
      const rowIndex = rowOf.get(
        shortName(String(entry.company)).toLocaleLowerCase("lt-LT"),
      );
      const metric = recordedIn[entry.field];
      if (rowIndex === undefined || !metric) return;
      const columnIndex = headerRow.indexOf(`${metric} ${entry.year}`);
      if (columnIndex < 0) return;
      const key = `${rowIndex}-${columnIndex}`;
      const note = `${entry.sheet} had ${displayCell(sigFigs(entry.theirs))} for ${entry.field}${
        entry.ours === null ? "" : ` where this reads ${displayCell(sigFigs(entry.ours))}`
      } — ${entry.why}`;
      const already = flags.get(key);
      flags.set(key, already ? `${already}. ${note}` : note);
    });

    return { flags, duplicates };
  }, [activeSheet, headerRow, showDisagreements]);

  // A column whose every figure is one Main already holds has nothing left to show.
  const allRepeated = (column: number) => {
    let held = false;
    for (let row = 1; row < activeSheet.values.length; row += 1) {
      if (isBlank(activeSheet.values[row][column])) continue;
      if (!duplicates.has(`${row}-${column}`)) return false;
      held = true;
    }
    return held;
  };

  // Every period a metric column carries, newest first — the year filter's options.
  const years = useMemo(() => {
    const found = new Set<string>();
    headerRow.forEach((cell) => {
      const { group, period } = splitHeader(cell);
      const match = group && period.match(/^(19|20)\d{2}/);
      if (match) found.add(match[0]);
    });
    return [...found].sort().reverse();
  }, [headerRow]);

  // Untouched, the filter sits on the newest year the sheet holds: the grid opens on one
  // period rather than every period at once. Picking "All years" is an explicit "" choice.
  const year = yearChoice ?? years[0] ?? "";

  const visibleColumns = useMemo(() => {
    // A block is a metric with all its year columns, or a single column that has no metric.
    const blocks: { key: string; columns: number[] }[] = [];
    const placed = new Set<string>();
    headerRow.forEach((cell, index) => {
      if (hiddenColumns.has(index) || foldedColumns.has(index)) return;
      const metric = isChangeHeader(cell) ? "" : splitHeader(cell).group;
      if (!metric) {
        // A column with no metric is keyed by its own label, so the dictionary can move it too.
        if (!allRepeated(index))
          blocks.push({ key: String(headerRow[index] ?? ""), columns: [index] });
        return;
      }
      if (placed.has(metric)) return;
      placed.add(metric);
      const columns = (metricColumns.get(metric) ?? [index]).filter(
        (column) =>
          !hiddenColumns.has(column) &&
          !foldedColumns.has(column) &&
          !allRepeated(column) &&
          // Year filter drops the other periods entirely; undated columns always stay.
          (!year || splitHeader(headerRow[column]).period.startsWith(year)),
      );
      blocks.push({ key: metric, columns });
    });

    // Blocks the dictionary names take the places those blocks already occupy, in dictionary
    // order — so a figure comes before the figures worked out from it. Everything else, the
    // company name above all, stays exactly where the sheet put it.
    const slots = blocks.flatMap((block, index) =>
      orderOf(block.key) >= 0 ? [index] : [],
    );
    const sorted = slots
      .map((index) => blocks[index])
      .sort((a, b) => orderOf(a.key) - orderOf(b.key));
    slots.forEach((slot, position) => {
      blocks[slot] = sorted[position];
    });

    return blocks.flatMap((block) => block.columns);
  }, [headerRow, hiddenColumns, foldedColumns, metricColumns, year]);

  // Consecutive visible columns sharing a metric ("Darbuotojai") merge into one heading above them.
  const headerGroups = useMemo(() => {
    const groups: { group: string; span: number; position: number }[] = [];
    visibleColumns.forEach((columnIndex, position) => {
      const { group } = splitHeader(headerRow[columnIndex]);
      const last = groups[groups.length - 1];
      if (last && group && last.group === group) last.span += 1;
      else groups.push({ group, span: 1, position });
    });
    return groups;
  }, [headerRow, visibleColumns]);

  const hasHeaderGroups = headerGroups.some((entry) => entry.group);

  // Metrics the viewer works out rather than reads, so their heading can offer the switch.
  const derivedGroups = useMemo(
    () =>
      new Set(
        [...(activeSheet.derived?.columns ?? [])].map(
          (columnIndex) => splitHeader(headerRow[columnIndex]).group,
        ),
      ),
    [activeSheet, headerRow],
  );
  // The letter row is off by default, but only where the metric row can stand in for it —
  // otherwise the pin that unhides it would have nowhere to live.
  const showLetters = !hasHeaderGroups || (layout.letters ?? false);

  // Only the first column of each metric keeps a visible rule; the rest fade into the background.
  const groupStarts = useMemo(
    () => new Set(headerGroups.map((entry) => entry.position)),
    [headerGroups],
  );

  // Dividing by |before| is what the workbook does too: a profit going -4 052 -> 6 521 is a rise,
  // not a fall, and only the absolute base gets the sign right.
  const yearChange = (rowIndex: number, columnIndex: number) => {
    const previous = previousYear.get(columnIndex);
    if (previous === undefined) return null;
    // Compare what the cells show: a metric switched to totals changes with headcount too.
    const before = parseNumeric(scaledValue(rowIndex, previous));
    const after = parseNumeric(scaledValue(rowIndex, columnIndex));
    if (before === null || after === null || before === 0) return null;
    return (after - before) / Math.abs(before);
  };

  const sheetWidths = layout.widths[activeSheet.name] ?? {};
  const widthOf = (columnIndex: number) => sheetWidths[String(columnIndex)];
  // Every inline style the grid sets. Spelled out rather than typed as React's
  // CSSProperties: preserveSymlinks (needed for the dev-tools symlink) stops TS
  // resolving csstype through pnpm, so CSSProperties resolves to an empty type.
  const sizedStyle = (columnIndex: number): CellStyle => {
    const width = widthOf(columnIndex);
    return width ? { width, minWidth: width, maxWidth: width } : {};
  };

  const startResize = (
    event: React.PointerEvent<HTMLSpanElement>,
    columnIndex: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const header = event.currentTarget.parentElement as HTMLElement;
    drag.current = {
      sheet: activeSheet.name,
      column: columnIndex,
      startX: event.clientX,
      startWidth: header.getBoundingClientRect().width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveResize = (event: React.PointerEvent<HTMLSpanElement>) => {
    const active = drag.current;
    if (!active) return;
    const width = Math.max(
      48,
      Math.round(active.startWidth + event.clientX - active.startX),
    );
    setLayout((current) => ({
      ...current,
      widths: {
        ...current.widths,
        [active.sheet]: {
          ...(current.widths[active.sheet] ?? {}),
          [active.column]: width,
        },
      },
    }));
  };

  const endResize = () => {
    drag.current = null;
  };

  const resetWidth = (columnIndex: number) =>
    setLayout((current) => {
      const forSheet = { ...(current.widths[activeSheet.name] ?? {}) };
      delete forSheet[String(columnIndex)];
      return { ...current, widths: { ...current.widths, [activeSheet.name]: forSheet } };
    });

  const frozenColumnCount = Math.min(frozenColumns, visibleColumns.length);
  const frozenRowCount = Math.min(frozenRows, activeSheet.values.length);

  // A search no longer removes rows: every company stays listed, and only the matches show
  // their figures. Anything else can be opened one row at a time by clicking it.
  const matchingRows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("lt-LT");
    const matches = new Set<number>();
    if (!search) return matches;
    activeSheet.values.forEach((row, rowIndex) => {
      const hit = row.some((cell, columnIndex) =>
        displayCell(cell, activeSheet.numberFormats?.[rowIndex]?.[columnIndex])
          .toLocaleLowerCase("lt-LT")
          .includes(search),
      );
      if (hit) matches.add(rowIndex);
    });
    return matches;
  }, [activeSheet, query]);

  const filtering = query.trim() !== "";
  const isOpen = (rowIndex: number) =>
    !filtering || matchingRows.has(rowIndex) || openedRows.has(rowIndex);

  const toggleRow = (rowIndex: number) =>
    setOpenedRows((current) => {
      const next = new Set(current);
      if (!next.delete(rowIndex)) next.add(rowIndex);
      return next;
    });

  const staffColumn = useMemo(() => {
    const map = new Map<string, number>();
    headerRow.forEach((cell, index) => {
      const { group, period } = splitHeader(cell);
      if (group === "Darbuotojai") map.set(period, index);
    });
    return map;
  }, [headerRow]);

  // A derived metric reads as the sheet stored it only while its switch says so; otherwise the
  // cell holds the figure worked out from the core columns, which is what the sheet already has.
  const sourceValue = (rowIndex: number, columnIndex: number) => {
    const derived = activeSheet.derived;
    if (!derived?.columns.has(columnIndex) || rowIndex === 0)
      return activeSheet.values[rowIndex]?.[columnIndex];
    const group = splitHeader(headerRow[columnIndex]).group;
    return storedMetrics.has(group)
      ? (derived.stored.get(`${rowIndex}-${columnIndex}`) ?? null)
      : activeSheet.values[rowIndex]?.[columnIndex];
  };

  // A derived column shows one formula for every row — the sheet's mix of live formulas and
  // pasted numbers is what made the column look half-computed in the first place.
  const formulaAt = (rowIndex: number, columnIndex: number) => {
    const derived = activeSheet.derived;
    const stored = activeSheet.formulas?.[rowIndex]?.[columnIndex] ?? "";
    if (!derived?.columns.has(columnIndex) || rowIndex === 0) return stored;
    return storedMetrics.has(splitHeader(headerRow[columnIndex]).group)
      ? (derived.storedFormulas.get(`${rowIndex}-${columnIndex}`) ?? "")
      : (derived.formulaByColumn.get(columnIndex) ?? "");
  };

  // What a cell shows once its metric's per-employee/total switch is taken into account.
  const scaledValue = (rowIndex: number, columnIndex: number) => {
    const { group, period } = splitHeader(headerRow[columnIndex]);
    const mode = metricModes[group];
    const raw = sourceValue(rowIndex, columnIndex);
    if (!mode || !totalMetrics.has(group) || rowIndex === 0) return raw;
    const perEmployee = parseNumeric(raw);
    const staff = parseNumeric(
      activeSheet.values[rowIndex]?.[staffColumn.get(period) ?? -1],
    );
    return perEmployee === null || staff === null ? raw : mode.scale(perEmployee, staff);
  };

  // A row whose every figure is one Main already holds has nothing of its own left to say.
  const rowIsRepeated = (rowIndex: number) => {
    if (!duplicates.size) return false;
    let held = false;
    for (const column of visibleColumns) {
      if (column === config?.anchor || config?.narrow?.includes(column)) continue;
      if (isBlank(activeSheet.values[rowIndex][column])) continue;
      if (!duplicates.has(`${rowIndex}-${column}`)) return false;
      held = true;
    }
    return held;
  };

  // Rank by the figure itself, or by its change from the year before — the two orders the
  // retired ranking tabs kept as separate sheets.
  const toggleSort = (column: number, byChange = false) =>
    setSort((current) =>
      current?.column !== column || !!current.byChange !== byChange
        ? { column, ascending: false, byChange }
        : current.ascending
          ? null
          : { column, ascending: true, byChange },
    );

  const frozenRowIndices = activeSheet.values
    .slice(0, frozenRowCount)
    .map((_, index) => index);
  const scrollingRows = activeSheet.values
    .map((_, index) => index)
    .filter((rowIndex) => rowIndex >= frozenRowCount && !rowIsRepeated(rowIndex));
  if (sort) {
    // Rows with nothing in the sorted column sink to the bottom either way — an absent figure
    // is not a small one.
    const rank = (rowIndex: number) =>
      sort.byChange
        ? yearChange(rowIndex, sort.column)
        : parseNumeric(scaledValue(rowIndex, sort.column));
    scrollingRows.sort((left, right) => {
      const [a, b] = [rank(left), rank(right)];
      if (a === null && b === null) return left - right;
      if (a === null) return 1;
      if (b === null) return -1;
      return sort.ascending ? a - b : b - a;
    });
  }

  // Sticky offsets depend on rendered widths/heights, so measure them from the DOM.
  const [measureTick, setMeasureTick] = useState(0);
  useEffect(() => {
    // Column widths also move with the viewport, and stale offsets show as gaps beside frozen cells.
    const table = tableRef.current;
    if (!table || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setMeasureTick((tick) => tick + 1));
    observer.observe(table);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    // Read each cell's own layout position rather than summing widths: sticky offsets have to
    // land exactly on the column edge, and rounded widths leave a gap the grid shows through.
    // offsetLeft/offsetTop report the unstuck position, so measuring never chases itself.
    const firstRow = table.querySelector("tbody tr");
    const rowCells = Array.from(firstRow?.children ?? []) as HTMLElement[];
    const columnRow = table.querySelector("thead tr.column-row") as HTMLElement | null;
    const headStart =
      (table.querySelector("thead tr") as HTMLElement | null)?.offsetTop ?? 0;
    setGroupRowHeight(columnRow ? columnRow.offsetTop - headStart : 0);
    // The row-number column is pinned to a fixed width in CSS (--rownum), so the first frozen
    // column always knows where its edge is — measuring that one was what let it drift under
    // the numbers. Any further frozen columns stack on top of it by their rendered widths.
    const rowNumber =
      Number.parseFloat(getComputedStyle(table).getPropertyValue("--rownum")) || 0;
    const left: number[] = [0];
    for (let index = 1; index <= frozenColumnCount; index += 1) {
      const previous =
        index === 1
          ? rowNumber
          : (rowCells[index - 1]?.getBoundingClientRect().width ?? 0);
      left.push(Math.floor(left[index - 1] + previous));
    }
    // Rows and cells report offsets against the table itself, so the head is the zero point.
    const headTop = (table.querySelector("thead") as HTMLElement | null)?.offsetTop ?? 0;
    const top: number[] = [];
    (Array.from(table.querySelectorAll("tbody tr.frozen-row")) as HTMLElement[]).forEach(
      (row) => {
        top.push(row.offsetTop - headTop);
      },
    );
    setOffsets((previous) =>
      previous.left.join() === left.join() && previous.top.join() === top.join()
        ? previous
        : { left, top },
    );
  }, [
    activeSheetIndex,
    frozenColumnCount,
    frozenRowCount,
    query,
    highlightFormulas,
    scrollingRows.length,
    layout,
    measureTick,
  ]);

  const chooseSheet = (index: number) => {
    setActiveSheetIndex(index);
    setQuery(defaultQuery(index));
    setOpenedRows(new Set());
    setExactGroups(new Set());
    setSort(null);
    setTotalMetrics(new Set());
  };

  const toggleExact = (group: string) =>
    setExactGroups((current) => {
      const next = new Set(current);
      if (!next.delete(group)) next.add(group);
      return next;
    });

  const toggleStored = (group: string) =>
    setStoredMetrics((current) => {
      const next = new Set(current);
      if (!next.delete(group)) next.add(group);
      return next;
    });

  const toggleTotal = (group: string) =>
    setTotalMetrics((current) => {
      const next = new Set(current);
      if (!next.delete(group)) next.add(group);
      return next;
    });

  // Headcount column for a given year, so a per-employee figure can be scaled to the company.

  // Header label -> column, so a formula's named terms can be pointed back at their columns.
  const columnByLabel = useMemo(() => {
    const map = new Map<string, number>();
    headerRow.forEach((cell, index) => {
      const label = displayCell(cell);
      if (label && !map.has(label)) map.set(label, index);
    });
    return map;
  }, [headerRow]);

  // Full header -> code word, kept unique within the sheet so two codes never mean two columns.
  const codeWords = useMemo(() => {
    const taken = new Set<string>();
    const map = new Map<string, string>();
    headerRow.forEach((cell) => {
      const label = displayCell(cell);
      if (!label || map.has(label)) return;
      const base = abbreviate(label) || label.slice(0, 5).toUpperCase();
      let code = base;
      for (let suffix = 2; taken.has(code); suffix += 1) code = `${base}·${suffix}`;
      taken.add(code);
      map.set(label, code);
    });
    return map;
  }, [headerRow]);

  const referencedColumns = (formula: string) =>
    formulaTokens(formula)
      .flatMap((token) => (token.kind === "name" ? [columnByLabel.get(token.text)] : []))
      .filter(
        (column): column is number => column !== undefined && !hiddenColumns.has(column),
      );

  const tracedColumns = useMemo(() => {
    if (!traced) return new Set<number>();
    return new Set(referencedColumns(formulaAt(traced.row, traced.column)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traced, activeSheet, columnByLabel, hiddenColumns]);

  // A pinned popup closes on the next click anywhere that is not a cell, and on Escape.
  useEffect(() => {
    if (!pinned) return;
    const onDown = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest("td")) setPinned(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPinned(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  // Arrow endpoints are read off the laid-out cells, so they survive resizes and column folds.
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!traced || !table) {
      setArrows((current) => (current.length === 0 ? current : []));
      return;
    }
    // Anchored at the top edge, not the centre: every input sits in the same row, so the
    // arrows have to arc over it instead of running along it on top of each other.
    const centre = (element: HTMLElement | null) =>
      element
        ? { x: element.offsetLeft + element.offsetWidth / 2, y: element.offsetTop }
        : null;
    const from = centre(
      table.querySelector(`[data-cell="${traced.row}-${traced.column}"]`),
    );
    if (!from) return;
    const next = [...tracedColumns].flatMap((column) => {
      const to = centre(table.querySelector(`[data-cell="${traced.row}-${column}"]`));
      const full = displayCell(headerRow[column]);
      return to
        ? [
            {
              x1: from.x,
              y1: from.y,
              x2: to.x,
              y2: to.y,
              label: codeWords.get(full) ?? full,
              full,
            },
          ]
        : [];
    });
    setArrows((current) =>
      JSON.stringify(current) === JSON.stringify(next) ? current : next,
    );
  }, [traced, tracedColumns, layout, query, activeSheetIndex, offsets]);

  const detailsFor = (rowIndex: number) => {
    if (!config || rowIndex === 0) return [];
    return config.hidden
      .map((source) => ({
        label: displayCell(headerRow[source]) || columnName(start.column + source),
        text: displayCell(
          activeSheet.values[rowIndex]?.[source],
          activeSheet.numberFormats?.[rowIndex]?.[source],
        ),
      }))
      .filter((detail) => detail.text);
  };

  // "TOP 40 įmonės pagal apyvartą" titles a whole ranking — rank, company and figures — but the
  // workbook can only put it in one cell, so it reads as a heading for the rank column alone.
  // Lifted out and spanned across the block it belongs to, up to where the next one starts.
  const sectionTitles = (rowIndex: number) => {
    const titles: { title: string; position: number; span: number }[] = [];
    visibleColumns.forEach((columnIndex, position) => {
      const value = activeSheet.values[rowIndex]?.[columnIndex];
      if (typeof value !== "string" || !/^TOP\b/i.test(value)) return;
      const last = titles[titles.length - 1];
      if (last) last.span = position - last.position;
      titles.push({ title: value, position, span: visibleColumns.length - position });
    });
    return titles;
  };

  const renderRow = (
    rowIndex: number,
    frozenIndex: number,
    titlesLifted = false,
  ): React.ReactElement => {
    const isFrozenRow = frozenIndex >= 0;
    // Closed rows keep their name and their place in the list; only the figures are veiled.
    const closed = rowIndex > 0 && !isOpen(rowIndex);
    const titles = titlesLifted ? [] : sectionTitles(rowIndex);
    if (titles.length) {
      const rest = visibleColumns.some(
        (columnIndex) =>
          !isBlank(activeSheet.values[rowIndex][columnIndex]) &&
          !titles.some((entry) => visibleColumns[entry.position] === columnIndex),
      );
      return (
        <>
          <tr key={`title-${rowIndex}`} className="section-row">
            <th scope="row" />
            {titles[0].position > 0 && <td colSpan={titles[0].position} />}
            {titles.map((entry) => (
              <th key={entry.position} colSpan={entry.span} scope="colgroup">
                {entry.title}
              </th>
            ))}
          </tr>
          {rest && renderRow(rowIndex, -1, true)}
        </>
      );
    }
    return (
      <tr
        key={rowIndex}
        className={[isFrozenRow ? "frozen-row" : "", closed ? "closed-row" : ""]
          .filter(Boolean)
          .join(" ")}
        onClick={rowIndex > 0 && filtering ? () => toggleRow(rowIndex) : undefined}
      >
        <th
          scope="row"
          className={
            isFrozenRow && frozenIndex === frozenRowCount - 1
              ? "frozen-row-edge"
              : undefined
          }
          style={isFrozenRow ? { top: offsets.top[frozenIndex] ?? 0 } : undefined}
        >
          {start.row + rowIndex}
        </th>
        {visibleColumns.map((columnIndex, position) => {
          // Where this sheet merely repeats Main, the value is not shown a second time.
          const repeated = duplicates.has(`${rowIndex}-${columnIndex}`);
          const stored = scaledValue(rowIndex, columnIndex);
          const format = activeSheet.numberFormats?.[rowIndex]?.[columnIndex];
          // Figures read at 3 significant figures unless their metric is switched to exact.
          const metric = splitHeader(headerRow[columnIndex]).group;
          const rounded = rowIndex > 0 && metric !== "" && !exactGroups.has(metric);
          const value = rounded ? sigFigs(stored) : stored;
          const raw =
            rounded && typeof value === "number" && !format?.includes("%")
              ? compactNumber(value)
              : displayCell(value, format);
          const exactText = rounded ? displayCell(stored, format) : "";
          const shorten =
            rowIndex > 0 &&
            config?.shortenNames?.includes(columnIndex) &&
            typeof value === "string";
          // Row 1 carries the labels: keep only the period, the metric sits in the header above.
          const lifted = titlesLifted && typeof value === "string" && /^TOP/i.test(value);
          // A label row usually reads "Apyvarta 2019" and keeps only the period; where it holds a
          // bare year, or anything else that is not a metric label, it stands as it is.
          const label = rowIndex === 0 ? splitHeader(value).period || raw : "";
          const text =
            repeated || lifted
              ? ""
              : rowIndex === 0
                ? label
                : shorten
                  ? shortName(raw)
                  : raw;
          const details = columnIndex === config?.anchor ? detailsFor(rowIndex) : [];
          if (shorten && text !== raw)
            details.unshift({ label: displayCell(headerRow[columnIndex]), text: raw });

          // Change from the previous year of the same metric, worked out from the two figures.
          const shownChange =
            rowIndex === 0 || !showChanges ? null : yearChange(rowIndex, columnIndex);
          if (exactText && exactText !== raw)
            details.push({ label: `${metric} · exact`, text: exactText });

          // This sheet disagrees with Main here; the cell says so rather than passing it off.
          const mismatch = mismatches.get(`${rowIndex}-${columnIndex}`) ?? "";
          // The name column stays legible so the list still reads as a list of companies.
          const veiled = closed && columnIndex !== config?.anchor;
          // Only the company cell gets a hover popup; a figure's change already rides beside it.
          if (veiled || columnIndex !== config?.anchor) details.length = 0;
          // A flagged figure explains itself in the same popup rather than a browser tooltip.
          if (mismatch && !veiled)
            details.push({ label: "Disagrees with Main", text: mismatch });
          // A derived cell says what the sheet held there, whichever way its switch is set: the
          // point of the switch is to compare the two, so both sides name the other.
          const derivedNote =
            activeSheet.derived?.notes.get(`${rowIndex}-${columnIndex}`) ?? "";
          if (derivedNote && !veiled)
            details.push({
              label: storedMetrics.has(metric) ? "Worked out" : "Not used",
              text: storedMetrics.has(metric)
                ? `the figures behind this row give ${displayCell(sigFigs(activeSheet.values[rowIndex]?.[columnIndex]))}`
                : derivedNote,
            });
          // …unless formula highlighting is on, in which case a formula cell reveals its formula.
          const formula = highlightFormulas ? formulaAt(rowIndex, columnIndex) : "";
          const isFrozenColumn = position < frozenColumnCount;
          const style: CellStyle = sizedStyle(columnIndex);
          if (isFrozenColumn) style.left = offsets.left[position + 1] ?? 0;
          if (isFrozenRow) style.top = offsets.top[frozenIndex] ?? 0;

          return (
            <td
              key={columnIndex}
              className={[
                // Some sheets store figures as text ("18"), so align on what the value *is*.
                rowIndex > 0 && parseNumeric(value) !== null ? "number" : "",
                highlightFormulas && formulaAt(rowIndex, columnIndex).startsWith("=")
                  ? "formula-cell"
                  : "",
                isFrozenColumn ? "frozen-column" : "",
                isFrozenColumn && position === frozenColumnCount - 1
                  ? "frozen-column-edge"
                  : "",
                groupStarts.has(position) && position > 0 ? "group-edge" : "",
                isFrozenRow ? "frozen-cell" : "",
                isFrozenRow && frozenIndex === frozenRowCount - 1
                  ? "frozen-row-edge"
                  : "",
                widthOf(columnIndex) ? "sized" : "",
                rowIndex === 0 ? "label-cell" : "",
                rowIndex > 0 && columnIndex === config?.anchor ? "title-cell" : "",
                config?.narrow?.includes(columnIndex) ? "narrow-cell" : "",
                veiled ? "veiled" : "",
                repeated ? "repeated" : "",
                mismatch ||
                activeSheet.derived?.unexplained.has(`${rowIndex}-${columnIndex}`)
                  ? "mismatch"
                  : "",
                traced?.row === rowIndex && traced.column === columnIndex ? "traced" : "",
                traced?.row === rowIndex && tracedColumns.has(columnIndex)
                  ? "traced-source"
                  : "",
                pinned?.row === rowIndex && pinned.column === columnIndex ? "pinned" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={style}
              data-cell={`${rowIndex}-${columnIndex}`}
              onClick={
                details.length > 0 || formula
                  ? (event) => {
                      // Not stopped from bubbling: a click on a closed row should still open it.
                      const hit = event.target as HTMLElement;
                      // The popup is a child of this cell — clicking into it (to select
                      // its text) must not read as a second click on the cell.
                      if (hit.closest("button, .extra-popup")) return;
                      setPinned((current) =>
                        current?.row === rowIndex && current.column === columnIndex
                          ? null
                          : { row: rowIndex, column: columnIndex },
                      );
                    }
                  : undefined
              }
            >
              {formula && (
                <button
                  className="formula-dot"
                  aria-label="Show which columns this formula uses"
                  aria-pressed={traced?.row === rowIndex && traced.column === columnIndex}
                  onClick={(event) => {
                    event.stopPropagation();
                    setTraced((current) =>
                      current?.row === rowIndex && current.column === columnIndex
                        ? null
                        : { row: rowIndex, column: columnIndex },
                    );
                  }}
                />
              )}
              {rowIndex === 0 && metric !== "" && (
                <button
                  className={sort?.column === columnIndex ? "sort-pill on" : "sort-pill"}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSort(columnIndex);
                  }}
                  aria-pressed={sort?.column === columnIndex}
                  title={
                    sort?.column !== columnIndex
                      ? `Rank the companies by ${metric} ${text}, largest first`
                      : sort.ascending
                        ? "Sorted smallest first — click to go back to the sheet's own order"
                        : "Sorted largest first — click for smallest first"
                  }
                >
                  {sort?.column === columnIndex && !sort.byChange
                    ? sort.ascending
                      ? "▲"
                      : "▼"
                    : "↕"}
                </button>
              )}
              {rowIndex === 0 && metric !== "" && previousYear.has(columnIndex) && (
                <button
                  className={
                    sort?.column === columnIndex && sort.byChange
                      ? "sort-pill on"
                      : "sort-pill"
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSort(columnIndex, true);
                  }}
                  aria-pressed={sort?.column === columnIndex && !!sort.byChange}
                  title={
                    sort?.column !== columnIndex || !sort.byChange
                      ? `Rank the companies by their change in ${metric} to ${text}, biggest rise first`
                      : sort.ascending
                        ? "Sorted biggest fall first — click to go back to the sheet's own order"
                        : "Sorted biggest rise first — click for the biggest fall"
                  }
                >
                  {sort?.column === columnIndex && sort.byChange
                    ? sort.ascending
                      ? "%▲"
                      : "%▼"
                    : "%↕"}
                </button>
              )}
              {rowIndex === 0 && (
                <span
                  className="resizer"
                  role="separator"
                  aria-label={`Resize column ${columnName(start.column + columnIndex)}`}
                  title="Drag to resize · double-click to reset"
                  onPointerDown={(event) => startResize(event, columnIndex)}
                  onPointerMove={moveResize}
                  onPointerUp={endResize}
                  onPointerCancel={endResize}
                  onDoubleClick={() => resetWidth(columnIndex)}
                />
              )}
              <span
                className={
                  details.length > 0 || formula ? "cell-text has-extra" : "cell-text"
                }
                tabIndex={details.length > 0 || formula ? 0 : undefined}
              >
                {text}
              </span>
              {shownChange !== null && (
                <span
                  className={`delta ${shownChange > 0 ? "up" : shownChange < 0 ? "down" : "flat"}`}
                >
                  {percentFormat.format(shownChange)}
                </span>
              )}
              {/* Sibling of the clipped text, not a child of it, so the popup escapes the ellipsis. */}
              {(details.length > 0 || formula) && (
                <span
                  className={
                    details.length > 2 ? "extra-popup two-column" : "extra-popup"
                  }
                  role="tooltip"
                >
                  {details.map((detail) => (
                    <span key={detail.label}>
                      <em>{detail.label}</em>
                      {detail.text}
                    </span>
                  ))}
                  {formula && (
                    <span className="formula-detail">
                      <em>Formula</em>
                      <span className="formula-math">
                        {formulaTokens(formula).map((token, index) => (
                          <span
                            key={index}
                            className={`token-${token.kind}`}
                            title={token.kind === "name" ? token.text : undefined}
                          >
                            {token.kind === "name"
                              ? (codeWords.get(token.text) ?? token.text)
                              : token.text}
                          </span>
                        ))}
                      </span>
                    </span>
                  )}
                </span>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className={cn("wbv", fullScreen && "fullscreen")}>
      <header className="toolbar">
        <Link href="/explore" className="back-link">
          ‹ Data exploration
        </Link>
        <input
          className="search-input"
          value={query}
          onChange={(event) => {
            // A new search starts from a clean slate — rows opened by hand belong to the old one.
            setQuery(event.target.value);
            setOpenedRows(new Set());
          }}
          placeholder={`Search ${activeSheet.name}…`}
          aria-label="Find in this sheet"
        />
        <div className="toolbar-actions">
          {years.length > 1 && (
            <select
              className={year ? "year-select on" : "year-select"}
              value={year}
              onChange={(event) => setYearChoice(event.target.value)}
              aria-label="Show a single year"
              title="Keep one year's columns and drop the rest"
            >
              <option value="">All years</option>
              {years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          <button
            className={highlightFormulas ? "ghost-button on" : "ghost-button"}
            onClick={() => setHighlightFormulas((on) => !on)}
            aria-pressed={highlightFormulas}
            title="Outline cells whose value comes from a formula"
          >
            ƒ Formulas
          </button>
          <div className="menu-anchor">
            <button
              className="ghost-button"
              onClick={() => setShowSettings((open) => !open)}
              aria-expanded={showSettings}
            >
              ⚙ Settings
            </button>
            {showSettings && (
              <>
                <div
                  className="menu-catcher"
                  role="presentation"
                  onClick={() => setShowSettings(false)}
                />
                <div className="menu" role="menu">
                  <p className="menu-info">
                    {activeSheet.name} · {activeSheet.address} ·{" "}
                    {activeSheet.values.length} rows × {visibleColumns.length} columns
                    {hiddenColumns.size > 0
                      ? ` · ${hiddenColumns.size} in hover details`
                      : ""}
                    {duplicates.size > 0
                      ? ` · ${duplicates.size} values hidden because Main already holds them`
                      : ""}
                    {mismatches.size > 0
                      ? ` · ${mismatches.size} flagged in amber: they disagree with Main, hover for its figure`
                      : ""}
                  </p>
                  <div className="freeze-controls">
                    <label>
                      <span>Freeze columns</span>
                      <input
                        type="number"
                        min={0}
                        max={visibleColumns.length}
                        value={frozenColumns}
                        onChange={(event) =>
                          setFrozenColumns(Math.max(0, Number(event.target.value) || 0))
                        }
                      />
                    </label>
                    <label>
                      <span>Freeze rows</span>
                      <input
                        type="number"
                        min={0}
                        max={Math.min(10, activeSheet.values.length)}
                        value={frozenRows}
                        onChange={(event) =>
                          setFrozenRows(Math.max(0, Number(event.target.value) || 0))
                        }
                      />
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            className={showChanges ? "ghost-button change on" : "ghost-button change"}
            onClick={() => setShowChanges((current) => !current)}
            aria-pressed={showChanges}
            title="The year-on-year change beside every figure — off by default, the figures read cleaner without it"
          >
            {showChanges ? "◆ Changes" : "◇ Changes"}
          </button>
          {activeSheet.name === "Main" && (
            <button
              className={showDisagreements ? "ghost-button gold on" : "ghost-button gold"}
              onClick={() => setShowDisagreements((current) => !current)}
              aria-pressed={showDisagreements}
              title={`${disagreements.length} figures the retired sheets recorded differently — hover a marked cell for what they said`}
            >
              {showDisagreements ? "◆ Disagreements" : "◇ Disagreements"}
            </button>
          )}
          <button
            className="ghost-button"
            onClick={toggleFullScreen}
            aria-pressed={fullScreen}
            title="Hide the toolbar and fill the screen"
          >
            {fullScreen ? "✕ Exit full screen" : "⛶ Full screen"}
          </button>
        </div>
      </header>

      <section className="workbook" aria-label="Source workbook">
        <div className="grid-wrap" onClick={() => setTraced(null)}>
          <div className={traced ? "grid-stage tracing" : "grid-stage"}>
            <table ref={tableRef}>
              <thead>
                {hasHeaderGroups && (
                  <tr className="group-row">
                    <th className="corner">
                      <button
                        className={showLetters ? "letters-pin on" : "letters-pin"}
                        onClick={toggleLetters}
                        aria-pressed={showLetters}
                        title={
                          showLetters
                            ? "Hide the spreadsheet column letters"
                            : "Show the spreadsheet column letters"
                        }
                      >
                        📌
                      </button>
                    </th>
                    {headerGroups.map((entry) => {
                      const withinFrozen =
                        entry.position + entry.span <= frozenColumnCount;
                      // The metric the heading stands for, once its per-employee/total switch is
                      // taken into account. Every name in this heading comes off it.
                      const shown = totalMetrics.has(entry.group)
                        ? metricModes[entry.group].total
                        : entry.group;
                      return (
                        <th
                          key={`${entry.group}-${entry.position}`}
                          colSpan={entry.span}
                          className={[
                            entry.group ? "group-label" : "",
                            withinFrozen ? "frozen-column" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={
                            withinFrozen
                              ? { left: offsets.left[entry.position + 1] ?? 0 }
                              : undefined
                          }
                          title={labelOf(shown)}
                        >
                          {/* Absolutely positioned (see .group-inner): a heading kept on one line
                            would otherwise widen every column under it to fit its own text. */}
                          <span className="group-inner">
                            {codeOf(shown)}
                            {metricModes[entry.group] && (
                              <button
                                className={
                                  totalMetrics.has(entry.group)
                                    ? "scale-pill on"
                                    : "scale-pill"
                                }
                                onClick={() => toggleTotal(entry.group)}
                                aria-pressed={totalMetrics.has(entry.group)}
                                title={
                                  totalMetrics.has(entry.group)
                                    ? `${labelOf(metricModes[entry.group].total)} — the whole company; click for the figure per employee`
                                    : `${labelOf(entry.group)} — per employee; click for the whole company`
                                }
                              >
                                {totalMetrics.has(entry.group) ? "total" : "per"}
                              </button>
                            )}
                            {derivedGroups.has(entry.group) && (
                              <button
                                className={
                                  storedMetrics.has(entry.group)
                                    ? "source-pill on"
                                    : "source-pill"
                                }
                                onClick={() => toggleStored(entry.group)}
                                aria-pressed={storedMetrics.has(entry.group)}
                                title={
                                  storedMetrics.has(entry.group)
                                    ? `${labelOf(entry.group)} — the figures the sheet itself stored; click for the figures worked out from the columns behind them`
                                    : `${labelOf(entry.group)} — worked out from the columns behind it; click for the figures the sheet itself stored`
                                }
                              >
                                {storedMetrics.has(entry.group) ? "xls" : "f(x)"}
                              </button>
                            )}
                            {entry.group && (
                              <button
                                className={
                                  exactGroups.has(entry.group)
                                    ? "round-pill on"
                                    : "round-pill"
                                }
                                onClick={() => toggleExact(entry.group)}
                                aria-pressed={exactGroups.has(entry.group)}
                                title={
                                  exactGroups.has(entry.group)
                                    ? `${labelOf(entry.group)} — showing exact figures; click to round to 3 significant figures`
                                    : `${labelOf(entry.group)} — rounded to 3 significant figures; click for the exact figures`
                                }
                              >
                                {exactGroups.has(entry.group) ? "123" : "≈"}
                              </button>
                            )}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                )}
                <tr
                  className={showLetters ? "column-row" : "column-row hidden-row"}
                  aria-hidden={!showLetters}
                >
                  <th
                    className="corner"
                    aria-label="Row labels"
                    style={{ top: groupRowHeight }}
                  />
                  {visibleColumns.map((columnIndex, position) => (
                    <th
                      key={columnIndex}
                      className={[
                        "resizable",
                        position < frozenColumnCount ? "frozen-column" : "",
                        position === frozenColumnCount - 1 ? "frozen-column-edge" : "",
                        groupStarts.has(position) && position > 0 ? "group-edge" : "",
                        widthOf(columnIndex) ? "sized" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        ...sizedStyle(columnIndex),
                        top: groupRowHeight,
                        ...(position < frozenColumnCount
                          ? { left: offsets.left[position + 1] ?? 0 }
                          : {}),
                      }}
                    >
                      {columnName(start.column + columnIndex)}
                      <span
                        className="resizer"
                        role="separator"
                        aria-label={`Resize column ${columnName(start.column + columnIndex)}`}
                        title="Drag to resize · double-click to reset"
                        onPointerDown={(event) => startResize(event, columnIndex)}
                        onPointerMove={moveResize}
                        onPointerUp={endResize}
                        onPointerCancel={endResize}
                        onDoubleClick={() => resetWidth(columnIndex)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {frozenRowIndices.map((rowIndex) => renderRow(rowIndex, rowIndex))}
                {scrollingRows.map((rowIndex) => renderRow(rowIndex, -1))}
                {filtering && matchingRows.size === 0 && (
                  <tr>
                    <td className="no-results" colSpan={visibleColumns.length + 1}>
                      Nothing in {activeSheet.name} matches “{query.trim()}” — click any
                      row above to open it.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {arrows.length > 0 && (
              <svg className="trace-layer" aria-hidden>
                <defs>
                  <marker
                    id="trace-head"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0 L7,3.5 L0,7 z" />
                  </marker>
                </defs>
                {arrows.map((arrow, index) => {
                  // Each arc rises a little higher than the last so overlapping spans stay legible.
                  const lift =
                    Math.min(70, 16 + Math.abs(arrow.x2 - arrow.x1) * 0.14) + index * 18;
                  const top = Math.min(arrow.y1, arrow.y2) - lift;
                  // Cubic midpoint: (P0 + 3P1 + 3P2 + P3) / 8, where both controls sit at `top`.
                  const labelX = (arrow.x1 + arrow.x2) / 2;
                  const labelY = (arrow.y1 + arrow.y2 + 6 * top) / 8;
                  return (
                    <g key={index}>
                      <path
                        d={`M ${arrow.x1} ${arrow.y1} C ${arrow.x1} ${top}, ${arrow.x2} ${top}, ${arrow.x2} ${arrow.y2}`}
                        markerEnd="url(#trace-head)"
                      />
                      <circle
                        className="trace-origin"
                        cx={arrow.x1}
                        cy={arrow.y1}
                        r={2.5}
                      />
                      {/* An opaque chip punches the dashes out from behind the label. */}
                      <rect
                        className="trace-chip"
                        x={labelX - (arrow.label.length * 5.4 + 14) / 2}
                        y={labelY - 8}
                        width={arrow.label.length * 5.4 + 14}
                        height={16}
                        rx={8}
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <title>{arrow.full}</title>
                        {arrow.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
        <nav className="sheet-tabs" aria-label="Workbook sheets">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              className={activeSheetIndex === index ? "active" : ""}
              onClick={() => chooseSheet(index)}
            >
              {sheet.name}
            </button>
          ))}
        </nav>
      </section>

      {fullScreen && (
        <button
          className="exit-fullscreen"
          onClick={toggleFullScreen}
          title="Exit full screen"
        >
          ✕
        </button>
      )}
    </div>
  );
}
