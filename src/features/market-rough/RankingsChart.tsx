"use client";

import { useState } from "react";
import { Pill, PillRow } from "@/components/ui/pills";
import { fmtEur, fmtInt } from "./format";
import { margin } from "./metrics";
import { SEG_COLORS, segName } from "./segments";
import type { CompanyYear, MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

const MY_BRAND = "Fabula";

const RANK_METRICS: {
  key: string;
  label: string;
  f: (r: CompanyYear) => number | null;
  fmt: (v: number) => string;
}[] = [
  { key: "estimatedIncome", label: "Revenue", f: (r) => r.estimatedIncome, fmt: fmtEur },
  { key: "revenue", label: "Turnover", f: (r) => r.revenue, fmt: fmtEur },
  { key: "profit", label: "Net profit", f: (r) => r.profit, fmt: fmtEur },
  { key: "employees", label: "Employees", f: (r) => r.employees, fmt: fmtInt },
  {
    key: "avgSalary",
    label: "Avg. salary",
    f: (r) => ((r.avgSalary ?? 0) > 500 ? r.avgSalary : null),
    fmt: (v) => `€${Math.round(v).toLocaleString()}`,
  },
  { key: "margin", label: "Profit margin", f: margin, fmt: (v) => `${v.toFixed(1)}%` },
];

/** Top 10 versus bottom 10 on a chosen metric, filterable by segment. */
export function RankingsChart({ model }: { model: MarketModel }) {
  const [{ year, basis }] = useDashboardParams(model.last);
  const [metricKey, setMetricKey] = useState("estimatedIncome");
  const [segs, setSegs] = useState<Set<string>>(new Set(model.segments));

  const metric = RANK_METRICS.find((m) => m.key === metricKey) ?? RANK_METRICS[0];
  const perEmp = basis === "emp" && metricKey !== "avgSalary" && metricKey !== "margin";

  const rows = model.rows
    .filter((r) => r.year === year && r.activities.some((a) => segs.has(a)))
    .map((r) => {
      let v = metric.f(r);
      if (v != null && perEmp) v = (r.employees ?? 0) > 0 ? v / r.employees! : null;
      return { brand: r.brand, seg: r.activities[0] ?? "Other", v };
    })
    .filter((o): o is { brand: string; seg: string; v: number } => o.v != null)
    .sort((a, b) => b.v - a.v);

  const top = rows.slice(0, 10);
  const bottom = rows.length > 10 ? rows.slice(-10) : [];
  const maxAbs = Math.max(...rows.map((o) => Math.abs(o.v)), 1);

  const bar = (o: { brand: string; seg: string; v: number }, i: number) => (
    <div key={o.brand} className="flex items-center gap-2 text-[12px]">
      <span className="text-muted w-4 flex-none text-right">{i + 1}</span>
      <span
        className={`w-[130px] flex-none truncate text-right ${o.brand === MY_BRAND ? "text-gold font-bold" : ""}`}
      >
        {o.brand}
      </span>
      <div className="bg-panel2 h-[18px] flex-1 overflow-hidden rounded-sm">
        <div
          className="h-full rounded-sm"
          style={{
            width: `${Math.max(1, (Math.abs(o.v) / maxAbs) * 100)}%`,
            background:
              o.brand === MY_BRAND
                ? "var(--color-gold)"
                : o.v < 0
                  ? "var(--color-red)"
                  : (SEG_COLORS[o.seg] ?? "var(--color-accent)"),
          }}
        />
      </div>
      <span className="w-[70px] flex-none font-semibold">{metric.fmt(o.v)}</span>
    </div>
  );

  return (
    <section id="rankings">
      <div className="border-line bg-panel min-w-0 rounded-xl border p-[18px]">
        <h3 className="mb-2 text-[15px] font-semibold">
          Top 10 versus bottom 10 · {metric.label} {year}
          {perEmp ? " · per employee" : ""}
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
                  return next.size ? next : new Set(model.segments);
                })
              }
            >
              {segName(s)}
            </Pill>
          ))}
        </PillRow>

        {!rows.length ? (
          <p className="text-muted p-6 text-center text-[13px]">
            No companies match in {year}.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {top.map((o, i) => bar(o, i))}
            {bottom.length > 0 && (
              <>
                <div className="text-muted my-1.5 text-center text-[11px]">
                  ··· {Math.max(0, rows.length - 20)} companies in between ···
                </div>
                {bottom.map((o, i) => bar(o, rows.length - bottom.length + i))}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
