"use client";

import { useState } from "react";
import { type BarRow, BarsSvg } from "./BarsSvg";
import { cmpColor } from "./CompanySelector";
import { fmtEur, fmtInt } from "./format";
import { type KpiMode, KpiModeToggle } from "./KpiCard";
import { EngTag } from "./SegmentChart";
import { margin, type Rank, rankOf } from "./metrics";
import type { CompanyYear, MarketModel } from "./types";

const pctText = (v: number) => `${v.toFixed(1)}%`;

/**
 * "{brand} vs the market" percentile chart on the drawBarsSvg engine (legacy):
 * one bar per metric, 100 = market top, gold when in the upper half. On partial
 * years (2025+) Employees/Avg-salary are dropped — only ~12 companies report.
 */
export function RankVsMarket({
  model,
  brand,
  brands,
  colorPool,
  year,
  perEmployee,
}: {
  model: MarketModel;
  brand: string;
  /** Full compare pool — >1 switches to grouped mode (one bar per company). */
  brands?: string[];
  /** Full pool incl. hidden brands — keeps bar colours matching the chips. */
  colorPool?: string[];
  year: number;
  perEmployee: boolean;
}) {
  // "value" = read the real €/%/headcount figure; "change" = the percentile.
  // Bar LENGTH is the percentile either way — the metrics share no unit.
  const [mode, setMode] = useState<KpiMode>("change");
  const pool = brands?.length ? brands : [brand];
  const grouped = pool.length > 1;
  const partialYear = year > model.last;

  const pe = (metric: (r: CompanyYear) => number | null) => (candidate: CompanyYear) => {
    const value = metric(candidate);
    if (!perEmployee) return value;
    const staff = candidate.employees ?? 0;
    return value != null && staff > 0 ? value / staff : null;
  };
  // `fmt` is each metric's own unit — the bar is always percentile-scaled, but
  // the € view reads the real figure out at the end of the bar.
  type Metric = {
    label: string;
    f: (r: CompanyYear) => number | null;
    fmt: (v: number) => string;
  };
  const metricDefs: Metric[] = [
    { label: "Revenue", f: pe((r) => r.estimatedIncome), fmt: fmtEur },
    { label: "Turnover", f: pe((r) => r.revenue), fmt: fmtEur },
    { label: "Net profit", f: pe((r) => r.profit), fmt: fmtEur },
    { label: "Profit margin", f: margin, fmt: pctText },
    ...(perEmployee || partialYear
      ? []
      : [{ label: "Employees", f: (r: CompanyYear) => r.employees, fmt: fmtInt }]),
    ...(partialYear
      ? []
      : [
          {
            label: "Avg salary",
            f: (r: CompanyYear) => ((r.avgSalary ?? 0) > 500 ? r.avgSalary : null),
            fmt: (v: number) => `€${Math.round(v).toLocaleString()}/mo`,
          },
        ]),
  ];
  const rankFor = (b: string, f: (r: CompanyYear) => number | null) =>
    rankOf(model.rows, year, model.byBrand[b]?.[year], f);

  // Grouped (>1 company): one metric HEADING per group (spacer above for a
  // gap), then one bar per company labelled with just the company name — its
  // chip colour identifies it (legacy v0.2.89). Tooltip still names the metric.
  const bars: BarRow[] = [];
  const meta: ({ metric: string; rank: Rank; realText: string } | null)[] = [];
  metricDefs.forEach((m, gi) => {
    const cells = (grouped ? pool : [brand]).flatMap((b) => {
      const rank = rankFor(b, m.f);
      if (!rank) return [];
      const cy = model.byBrand[b]?.[year];
      const real = cy ? m.f(cy) : null;
      const realText = real == null ? "—" : m.fmt(real);
      return {
        row: {
          label: grouped ? b : m.label,
          value: rank.pct,
          valueText: mode === "value" ? realText : undefined,
          color: grouped
            ? cmpColor((colorPool ?? pool).indexOf(b))
            : rank.pct >= 50
              ? "var(--color-gold-rank)"
              : "var(--color-muted)",
        },
        rank,
        realText,
      };
    });
    if (!cells.length) return;
    if (grouped) {
      if (gi > 0) {
        bars.push({ spacer: true, label: "", value: 0, color: "" });
        meta.push(null);
      }
      bars.push({ heading: m.label, label: "", value: 0, color: "" });
      meta.push(null);
    }
    cells.forEach((c) => {
      bars.push(c.row);
      meta.push({ metric: m.label, rank: c.rank, realText: c.realText });
    });
  });
  if (!meta.some(Boolean)) return null;

  // Legacy: chart box grows with the row count — 32px/row, 24px grouped.
  const height = Math.max(200, 44 + bars.length * (grouped ? 24 : 32));

  return (
    <div className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold">
          {grouped ? "Selected companies" : brand} vs the market ({year}
          {perEmployee ? ", per employee" : ""})
        </h3>
        <KpiModeToggle mode={mode} onChange={setMode} />
      </div>
      <div className="chartbox relative" style={{ height }}>
        <EngTag label="SVG" />
        <BarsSvg
          rows={bars}
          fmt={(v) => String(Math.round(v))}
          xTitle={`Percentile vs ${model.brands.length} agencies (100 = top)`}
          tip={(bar, i) => {
            const m = meta[i];
            if (!m) return "";
            const name = grouped ? `${m.metric} — ${bar.label}` : bar.label;
            // Tooltip always carries both readings, whichever the bars show.
            return `<b>${name}</b>: ${m.realText} · ${Math.round(bar.value)}th percentile · #${m.rank.pos} of ${m.rank.total}`;
          }}
        />
      </div>
    </div>
  );
}
