"use client";

import { useState } from "react";
import { Pill, PillRow } from "@/components/ui/pills";
import { type BarRow, BarsSvg } from "./BarsSvg";
import { margin } from "./metrics";
import { EngTag } from "./SegmentChart";
import { segName } from "./segments";
import { useSegColors } from "./useSegColors";
import type { CompanyYear, MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

const MY_BRAND = "Fabula";

const RANK_METRICS: {
  key: string;
  label: string;
  f: (r: CompanyYear) => number | null;
  money: boolean;
}[] = [
  { key: "estimatedIncome", label: "Revenue", f: (r) => r.estimatedIncome, money: true },
  { key: "revenue", label: "Turnover", f: (r) => r.revenue, money: true },
  { key: "profit", label: "Net profit", f: (r) => r.profit, money: true },
  { key: "employees", label: "Employees", f: (r) => r.employees, money: false },
  {
    key: "avgSalary",
    label: "Avg. salary",
    f: (r) => ((r.avgSalary ?? 0) > 500 ? r.avgSalary : null),
    money: false,
  },
  { key: "margin", label: "Profit margin", f: margin, money: false },
];

type Row = { brand: string; val: number; rank: number; grp?: "top" | "mid" | "bot" };

/** Legacy drawTop: single-year rankings on the drawBarsSvg engine. >20 matches
    → top 10 + bottom 10, with any selected company pulled back in from the
    hidden middle; selected gold, top green, bottom red. */
export function RankingsChart({ model }: { model: MarketModel }) {
  const [{ year, basis, companies }] = useDashboardParams(model.last);
  const SEG_COLORS = useSegColors();
  const [metricKey, setMetricKey] = useState("estimatedIncome");
  const [segs, setSegs] = useState<Set<string>>(new Set(model.segments));

  const metric = RANK_METRICS.find((m) => m.key === metricKey) ?? RANK_METRICS[0];
  const perEmp = basis === "emp" && metric.money;
  const allOn = segs.size === model.segments.length;
  const selected = new Set(companies.length ? companies : [MY_BRAND]);

  const tfmt = (v: number) =>
    metric.money
      ? perEmp
        ? `€${Math.round(v).toLocaleString()}`
        : `€${v.toFixed(2)}M`
      : metricKey === "margin"
        ? `${v.toFixed(1)}%`
        : Math.round(v).toLocaleString();

  let rows: Row[] = model.rows
    .filter((r) => r.year === year && r.activities.some((a) => segs.has(a)))
    .map((r) => {
      let v = metric.f(r);
      if (v != null && perEmp) v = (r.employees ?? 0) > 0 ? v / r.employees! : null;
      return { brand: r.brand, val: v as number, rank: 0 };
    })
    .filter((o) => o.val != null && o.val !== 0)
    .sort((a, b) => b.val - a.val);

  const total = rows.length;
  rows.forEach((r, i) => (r.rank = i + 1));

  const split = total > 20;
  if (split) {
    const top = rows.slice(0, 10).map((r) => ({ ...r, grp: "top" as const }));
    const bot = rows.slice(-10).map((r) => ({ ...r, grp: "bot" as const }));
    const shown = new Set([...top, ...bot].map((r) => r.rank));
    // Selected companies from the hidden middle are pulled back in, in place.
    const mid = rows
      .filter((r) => selected.has(r.brand) && !shown.has(r.rank))
      .map((r) => ({ ...r, grp: "mid" as const }));
    rows = [...top, ...mid, ...bot];
  }

  const barColor = (r: Row) => {
    if (selected.has(r.brand)) return "var(--color-gold)";
    if (r.grp === "top") return "var(--color-green)";
    if (r.grp === "bot") return "var(--color-red)";
    return r.val < 0 ? "var(--color-red)" : "var(--color-accent)";
  };

  const bars: BarRow[] = rows.map((r) => ({
    label: r.brand,
    value: metric.money && !perEmp ? r.val / 1e6 : r.val,
    color: barColor(r),
  }));
  const byBrandRow = new Map(rows.map((r) => [r.brand, r]));
  const height = Math.max(90, 44 + rows.length * 32);

  return (
    <section id="rankings">
      <div className="card border-line bg-panel min-w-0 rounded-xl border p-[18px]">
        <h3 className="mb-2 text-[15px] font-semibold">
          {!total
            ? `No ${year} data`
            : split
              ? "Top 10 versus bottom 10"
              : `${total} ${total === 1 ? "company" : "companies"} ranked`}
        </h3>

        <PillRow label="Ranking metric" className="mb-2">
          {RANK_METRICS.map((m) => (
            <Pill
              key={m.key}
              selected={metricKey === m.key}
              onClick={() => setMetricKey(m.key)}
            >
              {m.label}
            </Pill>
          ))}
        </PillRow>

        <PillRow label="Segments" className="mb-3">
          {model.segments.map((s) => (
            <Pill
              key={s}
              selected={segs.has(s)}
              onClick={() =>
                setSegs((old) => {
                  const next = new Set(old);
                  if (next.has(s)) next.delete(s);
                  else next.add(s);
                  // Legacy: the last selected segment can't be deselected.
                  return next.size ? next : old;
                })
              }
            >
              <span
                className="mr-1 inline-block h-2 w-2 rounded-full align-[-1px]"
                style={{ background: SEG_COLORS[s] ?? "#888" }}
              />
              {segName(s)}
            </Pill>
          ))}
          <Pill
            selected={false}
            onClick={() =>
              setSegs(allOn ? new Set([model.segments[0]]) : new Set(model.segments))
            }
          >
            {allOn ? "Clear all" : "Select all"}
          </Pill>
        </PillRow>

        {!total ? (
          <p className="text-muted p-6 text-center text-[13px]">
            No {year} {metric.label.toLowerCase()} data yet
            {year > model.last ? ` — ${year} financials land ~mid-${year + 1}.` : "."}
          </p>
        ) : (
          <div className="chartbox relative" style={{ height }}>
            <EngTag label="SVG" />
            <BarsSvg
              rows={bars}
              fmt={tfmt}
              tip={(bar) => {
                const r = byBrandRow.get(bar.label);
                return `<b>${bar.label}</b>: ${tfmt(bar.value)}${r ? ` · #${r.rank} of ${total}` : ""}`;
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
