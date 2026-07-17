"use client";

import { ArcElement, Chart, Legend, Tooltip } from "chart.js";
import { useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Seg } from "@/components/ui/seg";
import { fmtEur } from "./format";
import {
  basisWord,
  SEG_COLORS,
  SEG_METRICS,
  type SegBasis,
  type SegMetricKey,
  segMetricVal,
  segName,
} from "./segments";
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
          />
        </div>
      )}
    </section>
  );
}

/** Horizontal SVG bar chart in the legacy drawBarsSvg style: labels left,
    value at each bar's end, x-axis title under the plot. */
function BarsSvg({
  rows,
  fmt,
  xTitle,
}: {
  rows: { label: string; value: number; color: string }[];
  fmt: (v: number) => string;
  xTitle: string;
}) {
  // Legacy drawBarsSvg geometry: names sit INSIDE the plot at each bar's
  // start, so the left margin is tiny and bars span nearly the full width.
  const W = 754;
  const H = 320;
  const m = { t: 6, r: 42, b: 24, l: 10 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const max = Math.max(...rows.map((r) => Math.max(0, r.value)), 1);
  const xAt = (v: number) => m.l + (Math.max(0, v) / max) * pw;
  const band = ph / rows.length;
  const barH = Math.max(2, Math.min(22, band * 0.62));

  // Round 1/2/5×10ⁿ tick values, as the legacy niceTicks (PB-1).
  const ticks: number[] = [];
  {
    const raw = max / 8;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const nrm = raw / mag;
    const step = (nrm < 1.5 ? 1 : nrm < 3 ? 2 : nrm < 7 ? 5 : 10) * mag;
    for (let v = 0; v <= max + step * 1e-9; v += step) ticks.push(v);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible" role="img">
      <defs>
        <filter id="segbar-sh" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="0.5"
            stdDeviation="1"
            floodColor="#000"
            floodOpacity="0.5"
          />
        </filter>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={xAt(v)}
            y1={m.t}
            x2={xAt(v)}
            y2={m.t + ph}
            stroke="var(--color-grid)"
            strokeWidth="1"
          />
          <text
            x={xAt(v)}
            y={H - 12}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-muted)"
          >
            {fmt(v)}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const cy = m.t + band * (i + 0.5);
        const x1 = xAt(r.value);
        const nameX = m.l + 4;
        const nameW = r.label.length * 5.8;
        return (
          <g key={r.label}>
            <rect
              x={m.l}
              y={cy - barH / 2}
              width={Math.max(0, x1 - m.l)}
              height={barH}
              rx="2"
              fill={r.color}
            />
            {/* Name inside the plot at the bar's start, shadowed for contrast. */}
            <text
              x={nameX}
              y={cy + 3}
              fontSize="10"
              fontWeight="600"
              fill="var(--color-ink)"
              filter="url(#segbar-sh)"
            >
              {r.label}
            </text>
            {/* Value after the bar end, never overlapping the name. */}
            <text
              x={Math.max(x1 + 4, nameX + nameW + 6)}
              y={cy + 3}
              fontSize="9"
              fill="var(--color-muted)"
            >
              {fmt(r.value)}
            </text>
          </g>
        );
      })}
      <text
        x={m.l + pw / 2}
        y={H - 1}
        textAnchor="middle"
        fontSize="10"
        fill="var(--color-muted)"
      >
        {xTitle}
      </text>
    </svg>
  );
}
