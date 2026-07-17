"use client";

import { ArcElement, Chart, Legend, Tooltip } from "chart.js";
import { useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Pill, PillRow } from "@/components/ui/pills";
import { fmtEur } from "./format";
import {
  basisWord,
  SEG_COLORS,
  SEG_METRICS,
  segDesc,
  type SegBasis,
  type SegMetricKey,
  segMetricVal,
  segName,
} from "./segments";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

Chart.register(ArcElement, Tooltip, Legend);

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

/** "{year} Revenue by segment" — doughnut or bars, %/€, follows year + basis. */
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
    <section className="border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h2 className="mb-1 text-[15px] font-semibold">{title}</h2>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1.5">
        <PillRow label="Chart type">
          {(["doughnut", "bars"] as const).map((v) => (
            <Pill key={v} selected={type === v} onClick={() => setType(v)}>
              {v === "doughnut" ? "Doughnut" : "Bars"}
            </Pill>
          ))}
        </PillRow>
        <PillRow label="Metric">
          {(["revenue", "turnover", "profit"] as SegMetricKey[]).map((m) => (
            <Pill key={m} selected={metric === m} onClick={() => setMetric(m)}>
              {SEG_METRICS[m].label}
            </Pill>
          ))}
        </PillRow>
        <PillRow label="Show as">
          {(["pct", "eur"] as const).map((s) => (
            <Pill key={s} selected={show === s} onClick={() => setShow(s)}>
              {s === "pct" ? "%" : "€"}
            </Pill>
          ))}
        </PillRow>
      </div>

      {!rows.length ? (
        <p className="text-muted p-6 text-center text-[13px]">
          No companies have reported {year} figures yet.
        </p>
      ) : type === "doughnut" ? (
        <div className="relative h-[340px]">
          <Doughnut
            data={{
              labels: rows.map((o) => segName(o.s)),
              datasets: [
                {
                  data: rows.map((o) => Math.max(0, o.v)),
                  backgroundColor: rows.map((o) => SEG_COLORS[o.s] ?? "#888"),
                  borderColor: cssVar("--color-panel"),
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
        <div className="flex flex-col gap-1.5 py-2">
          {rows.map((o, i) => {
            const isPct = show === "pct";
            const value = isPct ? pct(i) : o.v;
            const max = isPct ? pct(0) : rows[0].v;
            return (
              <div key={o.s} className="flex items-center gap-2 text-[12px]">
                <span className="text-muted w-[110px] flex-none truncate text-right">
                  {segName(o.s)}
                </span>
                <div className="bg-panel2 h-[18px] flex-1 overflow-hidden rounded-sm">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${max > 0 ? Math.max(1, (Math.max(0, value) / max) * 100) : 1}%`,
                      background: SEG_COLORS[o.s] ?? "#888",
                    }}
                  />
                </div>
                <span className="w-[64px] flex-none font-semibold">
                  {isPct ? `${value.toFixed(value < 10 ? 1 : 0)}%` : fmtEur(o.v)}
                </span>
              </div>
            );
          })}
          <p className="text-muted mt-1 text-[11px]">
            {show === "pct" ? "Share of total, %" : segDesc(metric, basis)}
          </p>
        </div>
      )}
    </section>
  );
}
