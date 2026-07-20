"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import sheetsRaw from "../../../data/sheets_data.json";

/* ---------- data + legacy constants (ported from legacy-src/template.html) ---------- */

type Cell = string | number | null;
type Sheet = { columns: string[]; rows: Cell[][] };
const SHEETS = sheetsRaw as Record<string, Sheet>;

const SHEET_ORDER = ["Įmonės", "Įmonės-analizei", "Kūryba", "PR", "Raw"];
const ALL_SHEETS = [
  ...SHEET_ORDER,
  ...Object.keys(SHEETS).filter((k) => !SHEET_ORDER.includes(k)),
];

type Tier = "start" | "detail" | "niche";
const SHEET_DESC: Record<
  string,
  { title: string; tier: Tier; what: string; best: string }
> = {
  Įmonės: {
    title: "All companies (cleaned)",
    tier: "start",
    what: "The master list — one row per agency (169 in all) with everything we know: contacts, website & socials, headcount, salaries, turnover and profit for every year 2019–2024, plus a credit-risk rating. Built from the raw import with duplicates removed and gaps filled.",
    best: "Looking up a single company and seeing its whole profile at a glance.",
  },
  "Įmonės-analizei": {
    title: "Year-by-year financials",
    tier: "start",
    what: "The same 113 companies, one row per company per year (660 rows). Easier to compare or sort a single metric across time — this is the data behind the dashboard charts.",
    best: "Sorting or filtering by one number (e.g. biggest turnover in 2024) and spotting trends.",
  },
  Kūryba: {
    title: "Creative agencies — yearly",
    tier: "detail",
    what: "A filtered slice — only firms doing creative / advertising work (kūryba), with their yearly figures and segment totals.",
    best: "Sizing up just the creative corner of the market.",
  },
  PR: {
    title: "PR agencies — yearly",
    tier: "detail",
    what: "A filtered slice — only public-relations firms, with their yearly figures and segment totals.",
    best: "Sizing up just the PR corner of the market.",
  },
  Raw: {
    title: "Pre-cleaning import (source)",
    tier: "niche",
    what: 'The untouched source export — 103 rows before deduplication; 77% of its columns fed into "All companies (cleaned)". Has messy headers and duplicates; kept for traceability only.',
    best: "Checking where a data point came from; most users should use the cleaned tables above.",
  },
};

const TIER_LABEL: Record<Tier, { t: string; cls: string }> = {
  start: { t: "Start here", cls: "text-green border-green" },
  detail: { t: "Focused view", cls: "text-accent border-accent" },
  niche: { t: "Advanced / raw", cls: "text-muted border-muted" },
};

const MONEY_COLS = new Set([
  "Apyvarta",
  "Apyvarta 2019",
  "Apyvarta 2020",
  "Apyvarta 2021",
  "Apyvarta 2022",
  "Apyvarta 2023",
  "Apyvarta 2024",
  "Grynasis pelnas 2019",
  "Grynasis pelnas 2020",
  "Grynasis pelnas 2021",
  "Grynasis pelnas 2022",
  "Grynasis pelnas 2023",
  "Grynasis pelnas 2024",
  "Pelnas",
  "DU sąnaudos",
  "Ne-atlyginimų sąnaudos",
  "Spėjamos pajamos",
  "Atlyginimų sąnaudos 2019",
  "Atlyginimų sąnaudos 2020",
  "Atlyginimų sąnaudos 2021",
  "Atlyginimų sąnaudos 2022",
  "Atlyginimų sąnaudos 2023",
  "Atlyginimų sąnaudos 2024",
  "Atlyginimų sąnaudos 2025 05",
  "Skola Sodrai",
  "Apyvarta (1)",
  "Spėjamos pajamos (1)",
  "DU sąnaudos (1)",
  "Ne-atlyginimų sąnaudos (1)",
  "Pelnas (1)",
]);
const PCT_PARTIAL = ["Pokytis", "pokytis"];
const URL_PARTIAL = [
  "URL",
  "Svetainė",
  "svetainė",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "http",
];

/* Raw-sheet column headers: base dict; falls back to Lithuanian for unmapped columns. */
const COL_EN: Record<string, string> = {
  Apyvarta: "Turnover",
  "Apyvart. Pokytis": "Turnover change",
  "Apyvartos pokytis": "Turnover change",
  "Atlyginimo vidurkis": "Avg salary",
  "Atlyginimų vidurkis": "Avg salary",
  "Atlyginimo pokytis": "Salary change",
  "Atl. Pokytis": "Salary change",
  "Atl .Pokytis": "Salary change",
  "Atlyginimų sąnaudos": "Salary costs",
  Darbuotojai: "Employees",
  "Darbuotojų skaičius": "Employee count",
  "Darbuotojų pokytis": "Employees change",
  "Darb. Pokytis": "Employees change",
  "DU sąnaudos": "Wage costs",
  "DU sąnaudų pokytis": "Wage costs change",
  "Gr. Peln. Pokytis": "Net profit change",
  "Grynasis pelnas": "Net profit",
  "Grynasis pelningumas": "Net profitability",
  Pelnas: "Profit",
  "Pelnas prieš mokesčius": "Profit before tax",
  "Pelno mokestis": "Profit tax",
  "Fiks ir pelno mokestis": "Fixed & profit tax",
  "EVRK v2 veikla": "NACE v2 activity",
  "EVRK v2 veiklos kodas": "NACE v2 activity code",
  "El. paštas": "Email",
  "Pagrindinis brandas": "Main brand",
  Svetainė: "Website",
  Kodas: "Code",
  "PVM kodas": "VAT code",
  Metai: "Year",
  "Įmonės pavadinimas": "Company name",
  Įmonė: "Company",
  Miestas: "City",
  Rizika: "Risk",
  Pavadinimas: "Name",
  Adresas: "Address",
  Sektorius: "Sector",
};

/* Translate a column header to English: peel year/%/dup suffixes like the legacy tCol. */
function tCol(c: string, en: boolean): string {
  if (!en || c == null) return c;
  let s = String(c).trim();
  if (!s) return c;
  const veik = s.match(/^Veikla \((.+)\)$/i);
  if (veik) return "Activity (" + veik[1] + ")";
  let pct = "";
  if (/,\s*%$/.test(s)) {
    pct = ", %";
    s = s.replace(/,\s*%$/, "").trim();
  }
  let suf = "";
  const ym = s.match(/\s+(\d{4}(?:\s\d{2}(?:\s\d{2})?)?|\d{2}-\d{2})$/);
  if (ym) {
    suf = " " + ym[1];
    s = s.slice(0, ym.index).trim();
  }
  let dup = "";
  const dm = s.match(/(-|\.\d+)$/);
  if (dm) {
    dup = dm[1];
    s = s.slice(0, dm.index).trim();
  }
  const t = COL_EN[s];
  return t ? t + suf + pct + dup : c;
}

function isNumCol(c: string, sample: Cell[]): boolean {
  if (MONEY_COLS.has(c)) return true;
  return (
    sample.filter((v) => v !== null && !isNaN(Number(v))).length > sample.length * 0.5
  );
}
function fmtMoney(v: Cell): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (Math.abs(n) >= 1e6) return "€" + (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return "€" + Math.round(n).toLocaleString("lt-LT");
  return "€" + n.toFixed(0);
}
function fmtNum(v: Cell): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (Number.isInteger(n) || Math.abs(n) > 100)
    return Math.round(n).toLocaleString("lt-LT");
  return n.toFixed(2);
}

type ColType = {
  name: string;
  isMoney: boolean;
  isPct: boolean;
  isUrl: boolean;
  isNum: boolean;
};

/* ---------- one rendered cell, matching legacy null/url/pct/money/num rules ---------- */
function CellTd({ v, ct }: { v: Cell; ct: ColType }) {
  const base = "border-line border-b px-3 py-1.5 whitespace-nowrap";
  if (v === null || v === undefined || v === "None" || v === "\\N")
    return <td className={cn(base, "text-muted")}>—</td>;
  if (ct.isUrl) {
    const s = String(v);
    if (s.startsWith("http")) {
      const d = s.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      return (
        <td className={base}>
          <a
            href={s}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {d.length > 40 ? d.slice(0, 38) + "…" : d}
          </a>
        </td>
      );
    }
    return <td className={base}>{s}</td>;
  }
  if (ct.isPct) {
    const n = Number(v);
    if (!isNaN(n))
      return (
        <td
          className={cn(
            base,
            "text-right tabular-nums",
            n > 0 ? "text-green" : n < 0 ? "text-red" : "",
          )}
        >
          {(n > 0 ? "+" : "") + (n * 100).toFixed(1)}%
        </td>
      );
    return <td className={base}>{String(v)}</td>;
  }
  if (ct.isMoney) {
    const n = Number(v);
    if (!isNaN(n))
      return (
        <td className={cn(base, "text-right tabular-nums", n < 0 && "text-red")}>
          {fmtMoney(n)}
        </td>
      );
    return <td className={base}>{String(v)}</td>;
  }
  if (ct.isNum) {
    const n = Number(v);
    if (!isNaN(n)) {
      // Legacy colours profit-like columns ('elnas' matches Pelnas/pelnas) by sign.
      const cls = ct.name.includes("elnas")
        ? n > 0
          ? "text-green"
          : n < 0
            ? "text-red"
            : ""
        : "";
      return <td className={cn(base, "text-right tabular-nums", cls)}>{fmtNum(n)}</td>;
    }
  }
  return <td className={base}>{String(v)}</td>;
}

/* ---------- the reusable engine (legacy mountSheetExplorer) ---------- */
export function SheetExplorer({ order }: { order?: string[] }) {
  const tabs = useMemo(() => (order ?? ALL_SHEETS).filter((s) => SHEETS[s]), [order]);
  const [sheet, setSheet] = useState(tabs[0]);
  const [en, setEn] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 }>({ col: -1, dir: 1 });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  const sh = SHEETS[sheet];
  const cols = useMemo(() => sh?.columns ?? [], [sh]);

  const colTypes: ColType[] = useMemo(
    () =>
      cols.map((c, i) => {
        const sample = (sh?.rows ?? []).slice(0, 20).map((r) => r[i]);
        const isMoney = MONEY_COLS.has(c);
        const isPct = PCT_PARTIAL.some((p) => c.includes(p));
        const isUrl = URL_PARTIAL.some((p) => c.includes(p));
        const isNum = !isPct && !isUrl && isNumCol(c, sample);
        return { name: c, isMoney, isPct, isUrl, isNum: isNum || isMoney };
      }),
    [cols, sh],
  );

  // Search filters across all columns; CSV exports this filtered (unsorted) set.
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const rows = sh?.rows ?? [];
    if (!q) return rows;
    return rows.filter((row) =>
      row.some((v) => v !== null && String(v).toLowerCase().includes(q)),
    );
  }, [sh, query]);

  const sorted = useMemo(() => {
    if (sort.col < 0) return filtered;
    const rows = [...filtered];
    rows.sort((a, b) => {
      const av = a[sort.col],
        bv = b[sort.col];
      if (av === null) return 1;
      if (bv === null) return -1;
      const an = Number(av),
        bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sort.dir;
      return String(av).localeCompare(String(bv), "lt") * sort.dir;
    });
    return rows;
  }, [filtered, sort]);

  const total = sorted.length;
  const start = page * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);
  const sd = SHEET_DESC[sheet];
  const tier = sd && TIER_LABEL[sd.tier];

  const pickSheet = (s: string) => {
    setSheet(s);
    setSort({ col: -1, dir: 1 });
    setPage(0);
    setQuery("");
  };
  const clickSort = (ci: number) => {
    setSort((s) =>
      s.col === ci ? { col: ci, dir: s.dir === 1 ? -1 : 1 } : { col: ci, dir: -1 },
    );
    setPage(0);
  };
  const exportCsv = () => {
    const esc = (v: Cell) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    };
    let csv = "﻿" + cols.map(esc).join(",") + "\n";
    filtered.forEach((row) => {
      csv += row.map(esc).join(",") + "\n";
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = sheet.replace(/\s+/g, "_") + ".csv";
    a.click();
  };

  const btnCls =
    "border-line bg-panel2 text-ink hover:border-accent cursor-pointer rounded-md border px-3 py-1.5 text-[12px]";

  if (!sh) return null;
  return (
    <div>
      {/* sheet tab strip */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tabs.map((s) => (
          <button
            key={s}
            onClick={() => pickSheet(s)}
            className={cn(
              "cursor-pointer rounded-md border px-3 py-1.5 text-[12px]",
              s === sheet
                ? "border-accent bg-accent/10 text-accent font-semibold"
                : "border-line bg-panel2 text-muted hover:text-ink",
            )}
          >
            {en ? (SHEET_DESC[s]?.title ?? s) : s}
          </button>
        ))}
      </div>

      {/* sheet description card */}
      {sd && tier && (
        <div className="border-line bg-panel2 mb-2 rounded-md border px-3 py-2 text-[12px]">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-ink font-semibold">{sd.title}</span>
            <span className={cn("rounded border px-1.5 py-px text-[10px]", tier.cls)}>
              {tier.t}
            </span>
          </div>
          <div className="text-muted">{sd.what}</div>
          <div className="text-muted mt-1">
            <b className="text-ink">Best for:</b> {sd.best}
          </div>
        </div>
      )}

      {/* controls */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setEn((v) => !v)}
          title="Translate to English"
          className={btnCls}
        >
          {en ? "🌐 Lietuvių" : "🌐 English"}
        </button>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search across all columns…"
          className="border-line bg-panel2 text-ink placeholder:text-muted focus:border-accent min-w-[220px] rounded-md border px-3 py-1.5 text-[13px] outline-none"
        />
        <span className="border-line text-muted rounded-full border px-2 py-0.5 text-[11px]">
          {total} row{total !== 1 ? "s" : ""} × {colTypes.length} columns
        </span>
        <button onClick={exportCsv} className={btnCls}>
          Export CSV
        </button>
      </div>

      {/* table */}
      <div className="border-line max-h-[70vh] overflow-auto rounded-lg border">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead className="sticky top-0 z-2">
            <tr>
              <th className="bg-panel2 text-muted border-line border-b-2 px-3 py-2 text-right text-[11px]">
                #
              </th>
              {cols.map((c, i) => (
                <th
                  key={i}
                  onClick={() => clickSort(i)}
                  aria-sort={
                    sort.col !== i
                      ? undefined
                      : sort.dir === 1
                        ? "ascending"
                        : "descending"
                  }
                  className="bg-panel2 text-muted border-line hover:text-ink cursor-pointer border-b-2 px-3 py-2 text-left text-[11px] tracking-[.06em] whitespace-nowrap uppercase select-none"
                >
                  {tCol(c, en) || "—"}
                  {sort.col === i && (
                    <span className="text-accent text-[10px]">
                      {sort.dir === 1 ? " ▲" : " ▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr
                key={start + ri}
                className="group [&>td]:bg-panel odd:[&>td]:bg-zebra hover:[&>td]:bg-panel2"
              >
                <td className="border-line text-muted border-b px-3 py-1.5 text-right tabular-nums">
                  {start + ri + 1}
                </td>
                {row.map((v, ci) => (
                  <CellTd key={ci} v={v} ct={colTypes[ci]} />
                ))}
              </tr>
            ))}
            {!pageRows.length && (
              <tr>
                <td
                  colSpan={cols.length + 1}
                  className="text-muted px-3 py-6 text-center"
                >
                  No rows match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pager */}
      <div className="text-muted mt-2 flex items-center gap-2 text-[12px]">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className={cn(btnCls, "disabled:cursor-default disabled:opacity-40")}
        >
          ← Prev
        </button>
        <span>
          {total > pageSize ? `Page ${page + 1} of ${Math.ceil(total / pageSize)}` : ""}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={start + pageSize >= total}
          className={cn(btnCls, "disabled:cursor-default disabled:opacity-40")}
        >
          Next →
        </button>
        <span className="ml-auto">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(+e.target.value);
            setPage(0);
          }}
          className="border-line bg-panel2 text-ink rounded-md border px-2 py-1"
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={250}>250</option>
          <option value={999999}>All</option>
        </select>
      </div>
    </div>
  );
}

/* ---------- the two legacy <details> sections from rekView ---------- */
export function RawSheets() {
  return (
    // One wrapper element: as ExploreView's `after` slot this crosses the RSC
    // boundary, where a fragment's child array warns for list keys.
    <div>
      <details className="mt-[26px]">
        <summary className="text-ink cursor-pointer font-semibold select-none">
          📑 Initial data — raw Excel sheets (all companies)
        </summary>
        <div className="text-muted my-2 text-[12px]">
          The full original Excel export — pick a sheet, search, sort, export CSV.
        </div>
        <SheetExplorer />
      </details>

      <details className="mt-4">
        <summary className="text-ink cursor-pointer font-semibold select-none">
          🗂️ Initial data — organised (my version)
        </summary>
        <div className="text-muted my-2 text-[12px]">
          A separate, reorganisable copy of the initial data — the original above stays
          untouched. For now it shows just the Raw tab.
        </div>
        <SheetExplorer order={["Raw"]} />
      </details>
    </div>
  );
}
