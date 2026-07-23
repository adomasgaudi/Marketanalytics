"use client";

import {
  Chart,
  Legend,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bubble } from "react-chartjs-2";
import { fmtM } from "./format";
import { primarySegment, segName } from "./segments";
import { useSegColors } from "./useSegColors";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

Chart.register(PointElement, LinearScale, LogarithmicScale, Tooltip, Legend);

// Symmetric log for margin %: handles negatives, compresses outliers.
const slog = (v: number) => Math.sign(v) * Math.log10(1 + Math.abs(v));
const MARGIN_TICKS = [-50, -20, -10, -5, 0, 5, 10, 20, 50, 100];

type Dot = {
  x: number;
  y: number;
  yPct: number;
  r: number;
  brand: string;
  emp: number;
  seg: string;
};

const cssVar = (name: string) =>
  typeof document === "undefined"
    ? ""
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Size vs profitability: one bubble per company, revenue × margin, r = headcount. */
export function ScatterChart({ model }: { model: MarketModel }) {
  const [{ year, market, segment }] = useDashboardParams(model.last);
  const SEG_COLORS = useSegColors();
  const perEmp = market === "emp";
  const [hiddenSegs, setHiddenSegs] = useState<Set<string>>(() => new Set());

  // Bottom-bar segment scopes the pool; crossed-out legend items hide colour groups.
  useEffect(() => {
    if (segment) {
      setHiddenSegs(new Set(model.segments.filter((s) => s !== segment)));
    } else {
      setHiddenSegs(new Set());
    }
  }, [segment, model.segments]);

  const rows: Dot[] = useMemo(
    () =>
      model.rows
        .filter(
          (d) =>
            d.year === year &&
            (!segment || d.activities.includes(segment)) &&
            (d.estimatedIncome ?? 0) > 50_000 &&
            d.profit != null &&
            (d.employees ?? 0) > 0,
        )
        .map((d) => ({
          x: perEmp
            ? (d.estimatedIncome as number) / (d.employees as number)
            : (d.estimatedIncome as number),
          y: slog(((d.profit as number) / (d.estimatedIncome as number)) * 100),
          yPct: ((d.profit as number) / (d.estimatedIncome as number)) * 100,
          r: Math.max(4, Math.sqrt(d.employees as number) * 2.2),
          brand: d.brand,
          emp: d.employees as number,
          seg: primarySegment(d),
        })),
    [model.rows, year, perEmp, segment],
  );

  const segColor = (seg: string) =>
    SEG_COLORS[seg] ?? (cssVar("--color-muted") || "#888");

  // One dataset per segment slot — legend stays fixed; hidden ones strike through.
  const datasets = useMemo(
    () =>
      model.segments.map((s) => {
        const color = segColor(s);
        const hidden = hiddenSegs.has(s);
        return {
          label: segName(s),
          data: hidden ? [] : rows.filter((r) => r.seg === s),
          hidden,
          backgroundColor: `${color}73`,
          borderColor: color,
          borderWidth: 1.5,
          hoverBackgroundColor: `${color}cc`,
          hoverBorderWidth: 2,
        };
      }),
    [rows, model.segments, hiddenSegs, SEG_COLORS],
  );

  const visibleRows = rows.filter((r) => !hiddenSegs.has(r.seg));

  if (!visibleRows.length) {
    return (
      <section className="card border-line bg-panel mb-4 rounded-xl border p-[18px]">
        <h2 className="mb-1 text-[15px] font-semibold">
          Size vs profitability ({year}
          {segment ? ` · ${segName(segment)}` : ""})
        </h2>
        <p className="text-muted p-6 text-center text-[13px]">No data for {year}.</p>
      </section>
    );
  }

  const ink = cssVar("--color-ink");
  const muted = cssVar("--color-muted") || ink;
  const grid = cssVar("--color-grid");

  return (
    <section className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h2 className="mb-1 text-[15px] font-semibold">
        Size vs profitability ({year}
        {segment ? ` · ${segName(segment)}` : ""}
        {perEmp ? " · per employee" : ""})
      </h2>
      {/* The phone height is intentionally shorter via the mobile override;
          tablets and desktops retain enough vertical room for axes, legend,
          and the bubble field to remain readable. */}
      <div className="chartbox tall relative h-[450px] md:h-[300px] lg:h-[320px]">
        <span className="text-muted absolute top-0 left-0 z-1 text-[10px] opacity-60">
          Chart.js
        </span>
        <Bubble
          data={{ datasets }}
          options={
            {
              maintainAspectRatio: false,
              animation: false,
              responsive: true,
              plugins: {
                legend: {
                  onClick: (
                    _e: unknown,
                    item: { datasetIndex?: number },
                  ) => {
                    const seg = model.segments[item.datasetIndex ?? -1];
                    if (!seg) return;
                    setHiddenSegs((prev) => {
                      const next = new Set(prev);
                      if (next.has(seg)) next.delete(seg);
                      else next.add(seg);
                      return next;
                    });
                  },
                  labels: {
                    color: ink,
                    usePointStyle: true,
                    pointStyle: "circle",
                    boxWidth: 8,
                    boxHeight: 8,
                    padding: 16,
                    font: { size: 12 },
                    filter: (item: { text?: string }) => (item.text ?? "").length > 0,
                    generateLabels: (chart: {
                      data: { datasets: { label?: string }[] };
                    }) =>
                      chart.data.datasets.map((ds, i) => {
                        const seg = model.segments[i];
                        const off = hiddenSegs.has(seg);
                        const color = segColor(seg);
                        return {
                          text: ds.label ?? segName(seg),
                          fillStyle: color,
                          strokeStyle: color,
                          lineWidth: 1.5,
                          hidden: false,
                          datasetIndex: i,
                          fontColor: off ? muted : ink,
                          strikeThrough: off,
                        };
                      }),
                  },
                },
                tooltip: {
                  titleColor: ink,
                  bodyColor: ink,
                  backgroundColor: cssVar("--color-panel"),
                  borderColor: cssVar("--color-line"),
                  borderWidth: 1,
                  cornerRadius: 8,
                  padding: 10,
                  boxPadding: 4,
                  usePointStyle: true,
                  callbacks: {
                    label: (c: { raw: Dot }) => {
                      const p = c.raw;
                      return ` ${p.brand}: €${fmtM(p.x)} ${perEmp ? "rev/emp" : "rev"}, ${p.yPct.toFixed(1)}% margin, ${p.emp} empl.`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  type: "logarithmic" as const,
                  title: {
                    display: true,
                    text: perEmp ? "Revenue / employee (€, log)" : "Revenue (€, log)",
                    color: ink,
                    font: { size: 11 },
                  },
                  grid: { display: false },
                  border: { display: false },
                  ticks: {
                    color: cssVar("--color-muted") || ink,
                    font: { size: 11 },
                    callback: (v: number) =>
                      [
                        1e4, 2e4, 3e4, 5e4, 1e5, 2e5, 3e5, 5e5, 1e6, 3e6, 1e7, 3e7,
                      ].includes(v)
                        ? `€${fmtM(v)}`
                        : "",
                  },
                },
                y: {
                  title: {
                    display: true,
                    text: "Net profit margin % (signed log)",
                    color: ink,
                    font: { size: 11 },
                  },
                  grid: {
                    color: (c: { tick: { value: number } }) =>
                      c.tick.value === 0 ? ink : grid,
                    lineWidth: (c: { tick: { value: number } }) =>
                      c.tick.value === 0 ? 1.5 : 1,
                  },
                  border: { display: false, dash: [4, 4] },
                  min: slog(-60),
                  max: slog(120),
                  afterBuildTicks: (axis: { ticks: { value: number }[] }) => {
                    axis.ticks = MARGIN_TICKS.map((v) => ({ value: slog(v) }));
                  },
                  ticks: {
                    color: cssVar("--color-muted") || ink,
                    font: { size: 11 },
                    callback: (v: number) => {
                      const pct = Math.sign(v) * (10 ** Math.abs(v) - 1);
                      return `${Math.round(pct)}%`;
                    },
                  },
                },
              },
            } as never
          }
        />
      </div>
    </section>
  );
}
