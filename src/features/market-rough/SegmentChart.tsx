"use client";

import { ArcElement, Chart, Legend, Tooltip } from "chart.js";
import { useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Seg } from "@/components/ui/seg";
import { BarsSvg } from "./BarsSvg";
import { fmtEur } from "./format";
import {
  basisWord,
  SEG_METRICS,
  type SegBasis,
  type SegMetricKey,
  segMetricVal,
  segName,
} from "./segments";
import { useSegColors } from "./useSegColors";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

Chart.register(ArcElement, Tooltip, Legend);

/** The tiny engine badge in the chart box's top-left corner (legacy .eng-tag). */
export function EngTag({ label }: { label: string }) {
  return (
    <span className="bg-panel2 text-muted pointer-events-none absolute top-1 left-1 z-[7] rounded-[3px] px-1 py-0.5 text-[8px] font-semibold tracking-[.04em] opacity-70">
      {label}
    </span>
  );
}

/** Draws "12%" / "€36.6M" on slices that are big enough to hold it. */
const onSlice = {
  id: "segOnSlice",
  afterDatasetsDraw(chart: Chart) {
    const labels = (chart.options as { sliceLabels?: string[] }).sliceLabels;
    const pcts = (chart.options as { slicePcts?: number[] }).slicePcts;
    if (!labels || !pcts) return;
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = "700 11px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.6)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 0.5;
    ctx.fillStyle = "#fff";
    meta.data.forEach((arc, i) => {
      if (pcts[i] < 5) return;
      const pos = (
        arc as { tooltipPosition: (b: boolean) => { x: number; y: number } }
      ).tooltipPosition(false);
      ctx.fillText(labels[i], pos.x, pos.y);
    });
    ctx.restore();
  },
};

const cssVar = (name: string) =>
  typeof document === "undefined"
    ? ""
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** "{year} Revenue by segment" — doughnut or SVG bars, %/€, follows year + basis. */
export function SegmentChart({ model }: { model: MarketModel }) {
  const [{ year, market }] = useDashboardParams(model.last);
  const SEG_COLORS = useSegColors();
  const [type, setType] = useState<"doughnut" | "bars">("doughnut");
  const [metric, setMetric] = useState<SegMetricKey>("revenue");
  const [show, setShow] = useState<"pct" | "eur">("pct");

  const basis: SegBasis =
    market === "avg" ? "company" : market === "emp" ? "emp" : "total";

  const rows = model.segments
    .map((s) => ({ s, v: segMetricVal(model.rows, s, metric, basis, year) }))
    .filter((o): o is { s: string; v: number } => o.v != null)
    .sort((a, b) => b.v - a.v);

  const total = rows.reduce((sum, o) => sum + Math.max(0, o.v), 0) || 1;
  const pct = (i: number) => (Math.max(0, rows[i].v) / total) * 100;
  const shown = (i: number) =>
    show === "pct" ? `${pct(i).toFixed(pct(i) < 10 ? 1 : 0)}%` : fmtEur(rows[i].v);

  const title = `${year} ${SEG_METRICS[metric].label} by segment${basis === "total" ? "" : ` · ${basisWord(basis)}`}`;

  return (
    <section className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h2 className="mb-1 text-[15px] font-semibold">{title}</h2>
      {/* Legacy .seg-row: three joined .seg groups, 7px gap, 10px below. */}
      <div className="mb-2.5 flex flex-wrap gap-[7px]">
        <Seg
          label="Chart type"
          value={type}
          onChange={setType}
          btnClassName="px-[11px]"
          options={[
            { value: "doughnut", label: "Doughnut" },
            { value: "bars", label: "Bars" },
          ]}
        />
        <Seg
          label="Metric"
          value={metric}
          onChange={setMetric}
          btnClassName="px-[11px]"
          options={[
            { value: "revenue", label: "Revenue" },
            { value: "turnover", label: "Turnover" },
            { value: "profit", label: "Profit" },
          ]}
        />
        <Seg
          label="Show as"
          value={show}
          onChange={setShow}
          btnClassName="px-[11px]"
          options={[
            { value: "pct", label: "%" },
            { value: "eur", label: "€" },
          ]}
        />
      </div>

      {!rows.length ? (
        <p className="text-muted p-6 text-center text-[13px]">
          No companies have reported {year} figures yet.
        </p>
      ) : type === "doughnut" ? (
        <div className="chartbox relative h-[340px]">
          <EngTag label="Chart.js" />
          <Doughnut
            // Remount on data-shape changes (full build animation, as the
            // legacy destroy+rebuild); %/€ relabels update in place.
            key={`${year}-${metric}-${basis}`}
            updateMode="none"
            data={{
              labels: rows.map((o) => segName(o.s)),
              datasets: [
                {
                  data: rows.map((o) => Math.max(0, o.v)),
                  backgroundColor: rows.map((o) => SEG_COLORS[o.s] ?? "#888"),
                  borderColor: cssVar("--color-chart-bg"),
                  borderWidth: 2,
                },
              ],
            }}
            options={
              {
                maintainAspectRatio: false,
                sliceLabels: rows.map((_, i) => shown(i)),
                slicePcts: rows.map((_, i) => pct(i)),
                plugins: {
                  legend: {
                    position: "right" as const,
                    labels: {
                      color: cssVar("--color-ink"),
                      boxWidth: 12,
                      font: { size: 11 },
                      generateLabels: (chart: Chart) =>
                        (chart.data.labels as string[]).map((lab, i) => ({
                          text: `${lab} · ${shown(i)}`,
                          fillStyle: (chart.data.datasets[0].backgroundColor as string[])[
                            i
                          ],
                          strokeStyle: "transparent",
                          lineWidth: 0,
                          index: i,
                          fontColor: cssVar("--color-ink"),
                        })),
                    },
                  },
                  tooltip: {
                    titleColor: cssVar("--color-ink"),
                    bodyColor: cssVar("--color-ink"),
                    backgroundColor: cssVar("--color-panel"),
                    borderColor: cssVar("--color-line"),
                    borderWidth: 1,
                    callbacks: {
                      label: (c: { dataIndex: number; label?: string }) =>
                        ` ${c.label}: ${fmtEur(rows[c.dataIndex].v)} (${pct(c.dataIndex).toFixed(1)}%)`,
                    },
                  },
                },
              } as never
            }
            plugins={[onSlice]}
          />
        </div>
      ) : (
        <div className="chartbox relative h-[340px]">
          <EngTag label="SVG" />
          <BarsSvg
            rows={rows.map((o, i) => ({
              label: segName(o.s),
              value: show === "pct" ? pct(i) : o.v,
              color: SEG_COLORS[o.s] ?? "#888",
            }))}
            fmt={show === "pct" ? (v: number) => `${v.toFixed(v < 10 ? 1 : 0)}%` : fmtEur}
            xTitle={
              show === "pct"
                ? "Share of total, %"
                : `${basis === "total" ? "Total" : "Median"} ${SEG_METRICS[metric].short}, €`
            }
            tip={(r) => {
              const i = rows.findIndex((o) => segName(o.s) === r.label);
              return show === "pct"
                ? `<b>${r.label}</b>: ${r.value.toFixed(1)}% (${fmtEur(rows[i]?.v)})`
                : `<b>${r.label}</b>: ${fmtEur(r.value)} (${basisWord(basis)})`;
            }}
          />
        </div>
      )}
    </section>
  );
}
