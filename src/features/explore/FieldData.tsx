"use client";

import { useMemo, useState } from "react";
import raw from "../../../data/data.json";
import { cn } from "@/lib/cn";
import { segName } from "../market-rough/segments";
import type { CompanyYear } from "../market-rough/types";
import { RISK_EN, tField, tTab, type RekLang } from "./rek-en";

// ---------------------------------------------------------------------------
// The legacy "🔎 Company field data" section (template.html rekTableSection):
// per-company sub-tabs over three sources — Initial (dashboard dataset),
// Rekvizitai (scraped rek_tabs.json) and Sodra — with a Merged mode that
// unions rows by field, colour-codes provenance cubes and flags conflicts.
// ---------------------------------------------------------------------------

/** One [field, value] row of a Rekvizitai tab. */
export type RekRow = [string, string];

export type RekTab = { columns?: string[]; rows: RekRow[] };

export type SodraMonth = {
  month: number | string;
  avgWage?: number | null;
  numInsured?: number | null;
  tax?: number | null;
};

export type SodraRecord = {
  jarCode?: string | number;
  sodraCode?: number;
  name?: string;
  ecoActName?: string | null;
  municipality?: string | null;
  latest?: SodraMonth | null;
  months?: SodraMonth[];
  source?: string;
};

export type RekCompany = {
  slug: string;
  name: string;
  brand?: string | null;
  order: string[];
  tabs: Record<string, RekTab>;
  /** Įmonės kodas — attached by the legacy build (build_site.py). */
  code?: string | null;
  // NOTE (data gap): data/rek_tabs.json itself carries NO `sodra` key — the
  // legacy build_site.py attaches data/sodra/<slug>.json to each company at
  // build time before injecting __REK_DATA__. The v3 page passes rek_tabs.json
  // straight through, so `sodra` is undefined here and the Sodra source is
  // empty until the page (or a build step) enriches the file the same way.
  sodra?: SodraRecord | null;
};

/** Typed shape of data/rek_tabs.json (as injected into the legacy as __REK_DATA__). */
export type RekTabsFile = { companies: RekCompany[] };

// The legacy dataset row may carry a per-field provenance map on the latest year.
type DataRow = CompanyYear & { _provenance?: Record<string, string> };
const DATA = raw as DataRow[];

type Source = "initial" | "rekvizitai" | "sodra";
const SOURCES: Source[] = ["initial", "rekvizitai", "sodra"];
const SRC_LABEL: Record<Source, string> = {
  initial: "Initial",
  rekvizitai: "Rekvizitai",
  sodra: "Sodra",
};
// Provenance colours, as the legacy src-cube / .mv classes:
// Initial green, Rekvizitai accent (blue), Sodra amber.
const CUBE_BG: Record<Source, string> = {
  initial: "bg-green",
  rekvizitai: "bg-accent",
  sodra: "bg-amber",
};
const MV_TEXT: Record<Source, string> = {
  initial: "text-green",
  rekvizitai: "text-accent",
  sodra: "text-amber",
};

type Mode = "merged" | Source;
const DEFAULT_ORDER = ["Įmonė", "Finansai", "Darbuotojai", "Skolos"];

const eur = (v: number) =>
  Math.round(v).toLocaleString("lt-LT").replace(/,/g, " ") + " €";

type SrcTabs = Record<string, RekRow[]>;

// Build the "original" rows per sub-tab from the dashboard record for `brand`,
// using field names that line up with Rekvizitai data so merge can detect overlaps.
function buildOrigTabs(brand: string | null | undefined): SrcTabs {
  const T: SrcTabs = { Įmonė: [], Finansai: [], Darbuotojai: [], Skolos: [] };
  if (!brand) return T;
  const recs = DATA.filter((d) => d.brand === brand).sort((a, b) => a.year - b.year);
  if (!recs.length) return T;
  const last = recs[recs.length - 1];
  if (last.company) T["Įmonė"].push(["Pavadinimas", last.company]);
  if (last.brand) T["Įmonė"].push(["Brandas", last.brand]);
  if (last.city) T["Įmonė"].push(["Miestas", last.city]);
  if (last.risk) T["Įmonė"].push(["Kreditavimo rizika", last.risk]);
  if (last.activities && last.activities.length)
    T["Įmonė"].push(["Veiklos sritys", last.activities.join(", ")]);
  recs.forEach((r) => {
    if (r.revenue != null)
      T["Finansai"].push([`Pardavimo pajamos ${r.year}`, eur(r.revenue)]);
    if (r.estimatedIncome != null)
      T["Finansai"].push([`Spėjamos pajamos ${r.year}`, eur(r.estimatedIncome)]);
    if (r.profit != null)
      T["Finansai"].push([`Grynasis pelnas (nuostoliai) ${r.year}`, eur(r.profit)]);
    if (r.employees != null)
      T["Darbuotojai"].push([
        `Darbuotojų skaičius ${r.year}`,
        String(Math.round(r.employees)),
      ]);
    if (r.avgSalary)
      T["Darbuotojai"].push([`Atlyginimų vidurkis ${r.year}`, eur(r.avgSalary)]);
  });
  return T;
}

// Build the "sodra" rows per sub-tab from the company's attached Sodra record.
// Sodra gives monthly headcount + avg wage (wage withheld for 1-employee firms),
// so its data lands in the Darbuotojai tab as "<metric> YYYY-MM".
function buildSodraTabs(sodra: SodraRecord | null | undefined): SrcTabs {
  const T: SrcTabs = { Įmonė: [], Finansai: [], Darbuotojai: [], Skolos: [] };
  if (!sodra) return T;
  if (sodra.ecoActName) T["Įmonė"].push(["Veiklos sritys (Sodra)", sodra.ecoActName]);
  if (sodra.municipality) T["Įmonė"].push(["Miestas", sodra.municipality]);
  (sodra.months || []).forEach((m) => {
    const ym = String(m.month); // 202604 -> 2026-04
    const lbl = ym.length === 6 ? ym.slice(0, 4) + "-" + ym.slice(4) : ym;
    if (m.numInsured != null)
      T["Darbuotojai"].push([`Darbuotojų skaičius ${lbl}`, String(m.numInsured)]);
    if (m.avgWage != null && m.avgWage > 0)
      T["Darbuotojai"].push([`Atlyginimų vidurkis ${lbl}`, eur(m.avgWage)]);
  });
  return T;
}

// Normalise a value for "same fact?" comparison: strip €/%, spaces, unify decimals.
function normVal(v: unknown): string {
  return String(v)
    .replace(/[€%\s ]/g, "")
    .replace(",", ".")
    .toLowerCase();
}

type MergedRow = {
  field: string;
  value?: string;
  vals: Partial<Record<Source, string>>;
  sources: Source[];
  diff?: boolean;
};

// Rows for a mode. Single-source -> one row per [field,value]; Merged -> union
// by field across all sources; each row carries vals per source + a `sources`
// list (which sources HAVE the field) for the cube tags + `diff`.
function rowsForMode(
  mode: Mode,
  tab: string,
  srcRows: Record<Source, SrcTabs>,
): MergedRow[] {
  if (mode !== "merged") {
    return (srcRows[mode][tab] || []).map((r) => ({
      field: r[0],
      value: r[1],
      sources: [mode],
      vals: { [mode]: r[1] },
    }));
  }
  const byField = new Map<string, MergedRow>();
  SOURCES.forEach((src) => {
    (srcRows[src][tab] || []).forEach(([f, v]) => {
      let o = byField.get(f);
      if (!o) {
        o = { field: f, vals: {}, sources: [] };
        byField.set(f, o);
      }
      o.vals[src] = v;
      o.sources.push(src);
    });
  });
  const out: MergedRow[] = [];
  byField.forEach((o) => {
    const uniq = [...new Set(Object.values(o.vals).map(normVal))];
    o.diff = uniq.length > 1; // sources disagree on the value
    o.value = Object.values(o.vals)[0]; // representative for single-value rows
    out.push(o);
  });
  return out;
}

// Split a field suffix into {base,key,kind}: kind "year" (YYYY), "date"
// (YYYY-MM or YYYY-MM-DD -> dated snapshot series), else null (plain field).
function splitYear(field: string) {
  let m = field.match(/^(.*?)[\s ](\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { base: m[1].trim(), key: `${m[2]}-${m[3]}-${m[4]}`, kind: "date" };
  m = field.match(/^(.*?)[\s ](\d{4})-(\d{2})$/);
  if (m) return { base: m[1].trim(), key: `${m[2]}-${m[3]}`, kind: "date" };
  m = field.match(/^(.*?)[\s ](\d{4})$/);
  if (m) return { base: m[1].trim(), key: m[2], kind: "year" };
  return null;
}

// Strip parenthetical qualifiers so "Darbuotojų skaičius (grafikas)" and plain
// "Darbuotojų skaičius" are recognised as the SAME metric across sources.
function canonBase(base: string) {
  return base
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Collapse a time point to a period: yearly stays a year row; any dated point
// (YYYY-MM or YYYY-MM-DD) folds to its MONTH so values from different sources
// line up on one axis and disagreements surface.
function periodOf(sp: { key: string; kind: string }) {
  if (sp.kind === "year")
    return { period: sp.key, kind: "year" as const, sort: sp.key + "-00", day: sp.key };
  return {
    period: sp.key.slice(0, 7),
    kind: "month" as const,
    sort: sp.key.slice(0, 7),
    day: sp.key,
  };
}

type PivotCell = {
  period: string;
  kind: "year" | "month";
  sort: string;
  vals: Partial<Record<Source, string>>;
  days: Partial<Record<Source, string>>;
  srcSet: Set<Source>;
  sources: Source[];
  diff: boolean;
  value?: string;
};
type PivotMatrix = { base: string; cells: Record<string, PivotCell>; sources: Source[] };
type PivotSeries = { base: string; rows: PivotCell[] };

// Group time-suffixed rows by canonical metric. A metric with ANY dated points
// becomes ONE unified time series (Initial + Rekvizitai + Sodra on a single time
// column, with per-period conflicts flagged); purely-yearly metrics stay a clean
// metric×year matrix.
function pivotRows(rows: MergedRow[]) {
  const groups = new Map<
    string,
    { base: string; hasDate: boolean; keys: Map<string, PivotCell> }
  >();
  const flat: MergedRow[] = [];
  rows.forEach((r) => {
    const sp = splitYear(r.field);
    if (!sp) {
      flat.push(r);
      return;
    }
    const canon = canonBase(sp.base);
    const p = periodOf(sp);
    if (!groups.has(canon))
      groups.set(canon, { base: canon, hasDate: false, keys: new Map() });
    const g = groups.get(canon)!;
    if (p.kind !== "year") g.hasDate = true;
    if (!g.keys.has(p.period))
      g.keys.set(p.period, {
        period: p.period,
        kind: p.kind,
        sort: p.sort,
        vals: {},
        days: {},
        srcSet: new Set(),
        sources: [],
        diff: false,
      });
    const cell = g.keys.get(p.period)!;
    const vals = r.vals;
    (Object.entries(vals) as [Source, string][]).forEach(([s, v]) => {
      if (v == null) return;
      if (cell.days[s] == null || String(p.day) >= String(cell.days[s])) {
        cell.vals[s] = v; // latest day in a month wins
        cell.days[s] = p.day;
      }
      cell.srcSet.add(s);
    });
  });
  const years = new Set<string>();
  const matrix: PivotMatrix[] = [];
  const series: PivotSeries[] = [];
  groups.forEach((g) => {
    g.keys.forEach((cell) => {
      const uniq = [...new Set(Object.values(cell.vals).map(normVal))];
      cell.diff = uniq.length > 1;
      cell.value = Object.values(cell.vals)[0];
      cell.sources = [...cell.srcSet];
    });
    const keys = [...g.keys.values()];
    if (g.hasDate) {
      keys.sort((a, b) => String(a.sort).localeCompare(String(b.sort)));
      series.push({ base: g.base, rows: keys });
    } else {
      const cells: Record<string, PivotCell> = {};
      const srcs = new Set<Source>();
      keys.forEach((c) => {
        years.add(c.period);
        cells[c.period] = c;
        c.sources.forEach((s) => srcs.add(s));
      });
      matrix.push({ base: g.base, cells, sources: [...srcs] });
    }
  });
  return { years: [...years].sort(), matrix, series, flat };
}

// Translate a value: risk grades + segment names; free text and numbers as-is.
function tVal(value: string | undefined, field: string, lang: RekLang) {
  if (lang !== "en" || value == null) return value;
  const s = String(value).trim();
  if (RISK_EN[s]) return RISK_EN[s];
  if (/rizik/i.test(field || "")) return RISK_EN[s] || value; // credit-risk field
  if (/Veiklos sritys/i.test(field || ""))
    return s
      .split(/,\s*/)
      .map((p) => segName(p))
      .join(", ");
  return value;
}

const numLike = (v: unknown) =>
  /^[-+]?[\d.,\s ]+\s*(€|%)?$/.test(String(v).trim()) && /\d/.test(String(v));

// ---------------------------------------------------------------------------
// UI pieces
// ---------------------------------------------------------------------------

/** The 10px provenance cube (legacy .src-cube). */
function Cube({ src, empty, title }: { src: Source; empty?: boolean; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-block h-[10px] w-[10px] shrink-0 rounded-[3px] align-middle",
        empty ? "border-line border bg-transparent opacity-50" : CUBE_BG[src],
      )}
    />
  );
}

// A row's source-cube cell. In Merged we always render all 3 cubes, dimming
// the sources that have no value for this row (owner's choice).
function CubeCell({ sources }: { sources: Source[] }) {
  const have = new Set(sources);
  return (
    <td className="border-line w-[54px] border-b px-2 py-[5px] align-top whitespace-nowrap">
      <span className="flex items-center gap-[3px]">
        {SOURCES.map((s) => (
          <Cube
            key={s}
            src={s}
            empty={!have.has(s)}
            title={SRC_LABEL[s] + (have.has(s) ? "" : " — no value")}
          />
        ))}
      </span>
    </td>
  );
}

const thCls =
  "border-b border-line px-2 py-[6px] text-left align-bottom text-[11px] font-semibold text-muted";
const tdCls = "border-b border-line px-2 py-[5px] align-top";
const numCls = "text-right tabular-nums whitespace-nowrap";

/** Merged value cell content: single value, or per-source colour-keyed stack. */
function CellVals({ cell, merged }: { cell: PivotCell; merged: boolean }) {
  if (merged && cell.diff)
    return (
      <>
        {SOURCES.filter((s) => cell.vals[s] != null).map((s) => (
          <span key={s} className={cn("inline-block [&+span]:ml-2.5", MV_TEXT[s])}>
            {cell.vals[s]}
          </span>
        ))}
      </>
    );
  return <>{cell.value}</>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FieldData({ brand, tabs }: { brand: string; tabs: RekTabsFile }) {
  // One entry per dashboard brand: sourced companies carry full Rekvizitai
  // (+Sodra) tabs; any other brand is Initial-only, built on the fly.
  const company = useMemo<RekCompany>(() => {
    const sourced = tabs.companies.find((c) => c.brand === brand);
    if (sourced) return sourced;
    const rec = DATA.filter((d) => d.brand === brand).sort((a, b) => b.year - a.year)[0];
    return {
      brand,
      name: rec?.company || brand,
      slug: "init-" + brand,
      order: DEFAULT_ORDER,
      tabs: {},
      sodra: null,
    };
  }, [brand, tabs]);

  const origTabs = useMemo(() => buildOrigTabs(company.brand), [company]);
  const sodraTabs = useMemo(() => buildSodraTabs(company.sodra), [company]);
  const srcRows = useMemo<Record<Source, SrcTabs>>(() => {
    const rek: SrcTabs = {};
    Object.entries(company.tabs || {}).forEach(([t, v]) => {
      rek[t] = (v && v.rows) || [];
    });
    return { initial: origTabs, rekvizitai: rek, sodra: sodraTabs };
  }, [company, origTabs, sodraTabs]);

  const order = company.order || [];
  const [tab, setTab] = useState<string>(order[0] || "");
  const [mode, setMode] = useState<Mode>("merged");
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<RekLang>("lt");

  // Keep the same tab (e.g. Finansai) when switching companies, if the new one
  // has it; clear the search — as the legacy selectCompany(). Render-time
  // state adjustment ("prev" pattern) instead of an effect.
  const [prevCompany, setPrevCompany] = useState(company);
  if (prevCompany !== company) {
    setPrevCompany(company);
    if (!order.includes(tab)) setTab(order[0] || "");
    setQuery("");
  }

  const merged = mode === "merged";
  const allRows = useMemo(() => rowsForMode(mode, tab, srcRows), [mode, tab, srcRows]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.field.toLowerCase().includes(q) || String(r.value).toLowerCase().includes(q),
    );
  }, [allRows, query]);
  const { years, matrix, series, flat } = useMemo(() => pivotRows(rows), [rows]);

  // Provenance hint: per-field source tags on the latest dataset record.
  const prov = useMemo(() => {
    if (!company.brand) return null;
    const rec = DATA.filter((d) => d.brand === company.brand).sort(
      (a, b) => b.year - a.year,
    )[0];
    const p = rec?._provenance;
    return p && Object.keys(p).length ? { year: rec.year, map: p } : null;
  }, [company]);

  const exportCsv = () => {
    const BOM = "﻿";
    const escCsv = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const filtered = rows;
    let csv =
      BOM +
      ["field", "value"]
        .concat(merged ? ["sources"] : [])
        .map(escCsv)
        .join(",") +
      "\n";
    filtered.forEach((r) => {
      const val =
        merged && r.diff
          ? SOURCES.filter((s) => r.vals[s] != null)
              .map((s) => `${s}:${r.vals[s]}`)
              .join(" | ")
          : r.value;
      csv +=
        [r.field, val]
          .concat(merged ? [(r.sources || []).join("+")] : [])
          .map(escCsv)
          .join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sourced_${company.slug}_${tab}_${mode}.csv`;
    a.click();
  };

  const noCompany = !order.length;
  const SPAN_LABEL = { year: "Yearly", month: "Monthly" } as const;

  return (
    <details
      open
      className="border-line bg-panel group mb-4 overflow-hidden rounded-[10px] border"
    >
      <summary className="text-ink flex cursor-pointer list-none flex-wrap items-center gap-2 px-3.5 py-[11px] text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="text-muted inline-block transition-transform duration-150 group-open:rotate-90">
          ▸
        </span>
        🔎 Company field data{" "}
        <span className="text-muted text-[12px] font-normal">
          · {company.name || company.slug}
        </span>
      </summary>
      <div className="px-3.5 pt-0.5 pb-3.5">
        {/* Sub-tab strip (row counts follow the active mode) */}
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {order.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setQuery("");
              }}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-1.5 text-[13px]",
                t === tab
                  ? "border-accent text-ink bg-panel2 font-semibold"
                  : "border-line bg-panel2 text-muted hover:text-ink",
              )}
            >
              {tTab(t, lang)}{" "}
              <span className="opacity-55">({rowsForMode(mode, t, srcRows).length})</span>
            </button>
          ))}
        </div>

        {/* Controls: mode seg · 🌐 · search · count · legend · CSV */}
        <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
          <div className="border-line bg-panel2 flex overflow-hidden rounded-lg border">
            {(["merged", "initial", "rekvizitai", "sodra"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "cursor-pointer px-3 py-1.5 text-[13px]",
                  m === mode
                    ? "bg-panel text-ink font-semibold"
                    : "text-muted hover:text-ink",
                )}
              >
                {m === "merged" ? "Merged" : SRC_LABEL[m]}
              </button>
            ))}
          </div>
          <button
            title="Translate field names to English"
            onClick={() => setLang((l) => (l === "en" ? "lt" : "en"))}
            className="border-line bg-panel2 text-ink cursor-pointer rounded-lg border px-3 py-1.5 text-[13px]"
          >
            {lang === "en" ? "🌐 Lietuvių" : "🌐 English"}
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search field & value…"
            className="border-line bg-panel2 text-ink min-w-[200px] rounded-lg border px-3 py-1.5 text-[13px]"
          />
          <span className="border-line bg-panel2 text-muted rounded-md border px-2 py-0.5 text-[11px]">
            {rows.length} field{rows.length !== 1 ? "s" : ""}
          </span>
          {/* legend shows the source cubes only in Merged (where the cube column appears) */}
          {merged && (
            <span className="text-muted flex items-center gap-2.5 text-[12px]">
              {SOURCES.map((s) => (
                <span key={s} className="flex items-center gap-[5px]">
                  <Cube src={s} />
                  {SRC_LABEL[s].toLowerCase()}
                </span>
              ))}
            </span>
          )}
          <button
            onClick={exportCsv}
            className="border-line bg-panel2 text-ink ml-auto cursor-pointer rounded-lg border px-3 py-1.5 text-[13px]"
          >
            Export CSV
          </button>
        </div>

        {/* Provenance hint (hidden when the record has no _provenance map) */}
        {prov && (
          <div className="text-muted my-1 mb-2.5 text-[12px]">
            <b>Field sources ({prov.year}):</b>{" "}
            {Object.entries(prov.map).map(([k, v], i) => (
              <span key={k}>
                {i > 0 && " · "}
                {k}=
                <span
                  className={cn(
                    "font-semibold",
                    v === "rekvizitai"
                      ? "text-accent"
                      : v === "sodra" || v === "estimated"
                        ? "text-amber"
                        : v === "derived"
                          ? "text-purple"
                          : undefined,
                  )}
                >
                  {v}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Tables */}
        {noCompany ? (
          <div className="text-muted p-5 text-center text-[13px]">
            No data for this company.
          </div>
        ) : !matrix.length && !series.length && !flat.length ? (
          <div className="text-muted p-5 text-center text-[13px]">
            No fields for this view
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1) year matrix (metric × year) */}
            {matrix.length > 0 && years.length > 0 && (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className={thCls}>Metric</th>
                    {years.map((y) => (
                      <th key={y} className={cn(thCls, "text-right")}>
                        {y}
                      </th>
                    ))}
                    {merged && <th className={cn(thCls, "w-[54px]")}>Src</th>}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((m) => (
                    <tr key={m.base}>
                      <td className={tdCls}>{tField(m.base, lang)}</td>
                      {years.map((y) => {
                        const c = m.cells[y];
                        return (
                          <td key={y} className={cn(tdCls, numCls)}>
                            {c && <CellVals cell={c} merged={merged} />}
                          </td>
                        );
                      })}
                      {merged && <CubeCell sources={m.sources} />}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* 2) unified time series — all sources on ONE time axis, yearly and
                monthly measurements in SEPARATE value columns */}
            {series.map((sObj) => {
              const spans = (["year", "month"] as const).filter((sp) =>
                sObj.rows.some((r) => r.kind === sp),
              );
              return (
                <table
                  key={sObj.base}
                  className="mt-3.5 w-full border-collapse text-[13px]"
                >
                  <thead>
                    <tr>
                      <th className={thCls}>{tField(sObj.base, lang)} — time</th>
                      {spans.map((sp) => (
                        <th key={sp} className={cn(thCls, "text-right")}>
                          {SPAN_LABEL[sp]}
                        </th>
                      ))}
                      {merged && <th className={cn(thCls, "w-[54px]")}>Src</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sObj.rows.map((c) => {
                      const days = Object.values(c.days).sort() as string[];
                      const dayTip =
                        c.kind === "month" &&
                        days.length &&
                        days[days.length - 1] !== c.period
                          ? days[days.length - 1]
                          : undefined;
                      return (
                        <tr key={c.period}>
                          <td className={tdCls} title={dayTip}>
                            {c.period}
                          </td>
                          {spans.map((sp) =>
                            c.kind !== sp ? (
                              <td key={sp} className={cn(tdCls, numCls)} />
                            ) : (
                              <td
                                key={sp}
                                className={cn(
                                  tdCls,
                                  numCls,
                                  merged &&
                                    c.diff &&
                                    "cursor-help shadow-[inset_3px_0_0_var(--color-amber)]",
                                )}
                                title={
                                  merged && c.diff
                                    ? "Sources disagree — " +
                                      SOURCES.filter((s) => c.vals[s] != null)
                                        .map((s) => SRC_LABEL[s] + ": " + c.vals[s])
                                        .join(" · ")
                                    : undefined
                                }
                              >
                                <CellVals cell={c} merged={merged} />
                              </td>
                            ),
                          )}
                          {merged && <CubeCell sources={c.sources} />}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })}
            {/* 3) flat field/value (non-year fields) — long text wraps */}
            {flat.length > 0 && (
              <table
                className={cn(
                  "w-full border-collapse text-[13px]",
                  (matrix.length || series.length) && "mt-3.5",
                )}
              >
                <thead>
                  <tr>
                    <th className={thCls}>Field</th>
                    <th className={thCls}>Value</th>
                    {merged && <th className={cn(thCls, "w-[54px]")}>Src</th>}
                  </tr>
                </thead>
                <tbody>
                  {flat.map((r) => (
                    <tr key={r.field}>
                      <td className={tdCls}>{tField(r.field, lang)}</td>
                      <td className={cn(tdCls, numLike(r.value) && numCls)}>
                        {tVal(r.value, r.field, lang)}
                      </td>
                      {merged && <CubeCell sources={r.sources} />}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
