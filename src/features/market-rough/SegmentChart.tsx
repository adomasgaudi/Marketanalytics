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

/** One ring's worth of on-slice text: `lines[i]` is drawn stacked in slice `i`,
 *  but only where the slice holds at least `min` percent of the circle. */
type RingLabels = { lines: string[][]; pcts: number[]; min: number; size: number };

/** Draws "12%" / "€36.6M" / a company name on slices big enough to hold it.
 *  Works per dataset, so the outer segment ring and the inner company ring can
 *  carry different text at different sizes. */
const onSlice = {
  id: "segOnSlice",
  afterDatasetsDraw(chart: Chart) {
    const rings = (chart.options as { ringLabels?: (RingLabels | null)[] }).ringLabels;
    if (!rings) return;
    const { ctx } = chart;
    rings.forEach((ring, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      const arcs = meta?.data;
      // Chart.js can paint one final animation frame after a dataset has been
      // replaced or destroyed. In that frame its arcs and our labels are not
      // guaranteed to have matching lengths, so skip it rather than throwing.
      if (!ring?.lines?.length || !arcs?.length || arcs.length !== ring.lines.length)
        return;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // A soft dark halo, not a hard stroke: keeps white text legible on the
      // lighter tints without outlining every glyph.
      ctx.shadowColor = "rgba(0,0,0,.55)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 0.5;
      ctx.fillStyle = "#fff";
      arcs.forEach((arc, i) => {
        const lines = ring.lines[i];
        const share = ring.pcts[i];
        if (!lines?.length || !Number.isFinite(share) || share < ring.min) return;
        const pos = (
          arc as { tooltipPosition: (b: boolean) => { x: number; y: number } }
        ).tooltipPosition(false);
        lines.forEach((line, l) => {
          ctx.font = `${l === 0 ? 700 : 600} ${l === 0 ? ring.size : ring.size - 1.5}px system-ui`;
          ctx.globalAlpha = l === 0 ? 1 : 0.85;
          ctx.fillText(
            line,
            pos.x,
            pos.y + (l - (lines.length - 1) / 2) * (ring.size + 2),
          );
        });
      });
      ctx.restore();
    });
  },
};

/** The hole is dead space; the total belongs in it. Two lines, centred on the
 *  ring's own centre so it stays put whatever the legend does to the layout. */
const centreText = {
  id: "segCentre",
  afterDatasetsDraw(chart: Chart) {
    const centre = (chart.options as { centre?: { top: string; big: string } }).centre;
    const arc = chart.getDatasetMeta(0)?.data?.[0] as unknown as
      { x: number; y: number } | undefined;
    if (!centre || !arc) return;
    const { ctx } = chart;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = cssVar("--color-muted") || "#888";
    ctx.font = "600 10px system-ui";
    ctx.fillText(centre.top.toUpperCase(), arc.x, arc.y - 13);
    ctx.fillStyle = cssVar("--color-ink") || "#111";
    ctx.font = "700 22px system-ui";
    ctx.fillText(centre.big, arc.x, arc.y + 7);
    ctx.restore();
  },
};

/**
 * A company's shade of its segment's colour. Companies have no colour identity
 * of their own — they belong to the segment — so the ring reads as one hue
 * stepping light to dark rather than a second, competing palette. The step is
 * by POSITION IN THE RING, so neighbours always differ.
 */
function tint(hex: string, i: number, n: number) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  // -22%..+30% lightness across the ring, alternating so adjacent slices sit at
  // opposite ends of the range instead of blending into a gradient.
  const t = n < 2 ? 0 : ((i % 2 === 0 ? i : n - i) / n) * 0.52 - 0.22;
  const mix = (c: number) =>
    Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

const cssVar = (name: string) =>
  typeof document === "undefined"
    ? ""
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * The chart's legend, as HTML rather than Chart.js's own. Two reasons: its
 * width is FIXED, so a long name or an extra entry can no longer shrink the
 * canvas and slide the donut sideways; and names wrap onto a second line
 * instead of being clipped. Scrolls once a segment has more companies than the
 * chart is tall.
 */
function DonutLegend({
  items,
}: {
  items: { key: string; text: string; value: string; color: string }[];
}) {
  return (
    <ul className="absolute inset-y-0 right-0 hidden w-[164px] [scrollbar-width:thin] list-none flex-col justify-center gap-[3px] overflow-y-auto py-1 text-[11px] sm:flex">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-1.5 leading-[1.35]">
          <span
            className="mt-[3px] h-2.5 w-2.5 flex-none rounded-[3px]"
            style={{ background: item.color }}
          />
          <span className="min-w-0 flex-1 break-words">{item.text}</span>
          <span className="text-muted flex-none tabular-nums">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** "{year} Revenue by segment" — doughnut or SVG bars, %/€, follows year + basis. */
export function SegmentChart({ model }: { model: MarketModel }) {
  const [{ year, market, segment }] = useDashboardParams(model.last);
  const SEG_COLORS = useSegColors();
  const [type, setType] = useState<"doughnut" | "bars">("doughnut");
  const [metric, setMetric] = useState<SegMetricKey>("revenue");
  const [show, setShow] = useState<"pct" | "eur">("pct");

  const basis: SegBasis =
    market === "avg" ? "company" : market === "emp" ? "emp" : "total";

  // Fixed segment order AND fixed length: every segment always occupies its
  // own slot, reporting years contribute 0. Slices therefore keep both their
  // position and their colour as the year changes — a segment that starts
  // reporting (e.g. PA) grows from nothing instead of shoving its neighbours
  // along. `has` marks the slots with real data, for the legend and bars.
  // Scoped to one segment, the outer ring collapses to that segment's own full
  // circle and the inner ring becomes the readable half: its companies. The
  // two-ring shape is kept rather than swapped, so the picker reads as a zoom.
  const shownSegments = segment ? [segment] : model.segments;
  const rows = shownSegments.map((s) => {
    const v = segMetricVal(model.rows, s, metric, basis, year);
    return { s, v: v ?? 0, has: v != null };
  });

  const total = rows.reduce((sum, o) => sum + Math.max(0, o.v), 0) || 1;
  const pct = (i: number) => (Math.max(0, rows[i].v) / total) * 100;
  const shown = (i: number) =>
    show === "pct" ? `${pct(i).toFixed(pct(i) < 10 ? 1 : 0)}%` : fmtEur(rows[i].v);

  const title = `${year} ${SEG_METRICS[metric].label} ${segment ? `in ${segName(segment)} by company` : "by segment"}${basis === "total" ? "" : ` · ${basisWord(basis)}`}`;

  // Fixed company slots preserve every inner-slice position across years and
  // metric/basis changes. Missing or unreported companies simply shrink to 0.
  const companySlices = rows.flatMap((segmentRow) => {
    const brands = [
      ...new Set(
        model.rows.filter((d) => d.activities.includes(segmentRow.s)).map((d) => d.brand),
      ),
    ].sort();
    const valuesByBrand = new Map(
      model.rows
        .filter((d) => d.year === year && d.activities.includes(segmentRow.s))
        .map((d) => {
          const raw = SEG_METRICS[metric].f(d);
          const value =
            raw == null ? 0 : basis === "emp" ? raw / Math.max(d.employees ?? 0, 1) : raw;
          return [d.brand, Math.max(0, value)] as const;
        }),
    );
    const companyTotal = [...valuesByBrand.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    const displayedSegmentValue = Math.max(0, segmentRow.v);
    return brands.map((brand, i) => {
      const value = valuesByBrand.get(brand) ?? 0;
      return {
        value:
          companyTotal > 0 && displayedSegmentValue > 0
            ? (value / companyTotal) * displayedSegmentValue
            : 0,
        brand,
        // Scoped, the ring IS the chart, so each company takes its own shade;
        // unscoped it stays a flat subdivision of the segment's colour.
        color: segment
          ? tint(SEG_COLORS[segmentRow.s] ?? "#888", i, brands.length)
          : (SEG_COLORS[segmentRow.s] ?? "#888"),
      };
    });
  });

  // Company shares of the ring, for the on-slice labels and the legend.
  const companyTotal = companySlices.reduce((sum, s) => sum + s.value, 0) || 1;
  const companyPct = (i: number) => (companySlices[i].value / companyTotal) * 100;
  /** Legend figure for a company row, in whichever unit the toggle is on. */
  const shownVal = (value: number, share: number) =>
    show === "pct" ? `${share.toFixed(share < 10 ? 1 : 0)}%` : fmtEur(value);

  // Both modes keep an inner company ring. It is intentionally unlabeled in
  // All Segments, where 150+ slices are structural detail rather than text.
  const segmentRing = {
    label: "Segments",
    data: rows.map((o) => Math.max(0, o.v)),
    backgroundColor: rows.map((o) => SEG_COLORS[o.s] ?? "#888"),
    borderColor: cssVar("--color-chart-bg"),
    borderWidth: 2,
    weight: segment ? 0.4 : 2,
  };
  const companyRing = {
    label: "Companies",
    data: companySlices.map((slice) => slice.value),
    backgroundColor: companySlices.map((slice) => slice.color),
    borderColor: cssVar("--color-chart-bg"),
    borderWidth: 1,
    weight: segment ? 3 : 1,
  };

  return (
    <section className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h2 className="mb-1 text-[15px] font-semibold">{title}</h2>
      {/* Legacy .seg-row: three joined .seg groups, 7px gap, 10px below. */}
      <div className="mb-2.5 flex flex-wrap gap-[7px]">
        <Seg
          label="Chart type"
          value={type}
          onChange={setType}
          btnClassName="px-2 py-1 text-[11.5px]"
          options={[
            { value: "doughnut", label: "Doughnut" },
            { value: "bars", label: "Bars" },
          ]}
        />
        <Seg
          label="Metric"
          value={metric}
          onChange={setMetric}
          btnClassName="px-2 py-1 text-[11.5px]"
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
          btnClassName="px-2 py-1 text-[11.5px]"
          options={[
            { value: "pct", label: "%" },
            { value: "eur", label: "€" },
          ]}
        />
      </div>

      {!rows.some((o) => o.has) ? (
        <p className="text-muted p-6 text-center text-[13px]">
          No companies have reported {year} figures yet.
        </p>
      ) : type === "doughnut" ? (
        // The canvas stays a DIRECT child of the sized box — Chart.js measures
        // its parent, and wrapping it in another div (flex item or absolute)
        // leaves it measuring a box that isn't laid out yet, which collapses
        // the donut. The legend's column is reserved with padding instead, and
        // being a fixed width it can never resize the canvas or shift the
        // donut sideways.
        <div className="chartbox relative h-[340px] sm:pr-[176px]">
          <EngTag label="Chart.js" />
          <Doughnut
            // Remount whenever the SLICE COUNT changes — i.e. when the segment
            // scope changes. Chart.js tweens arcs between updates; if the
            // number of arcs changes mid-flight (stepping segments quickly
            // with ↑/↓ or the wheel) it is left drawing arcs whose radius and
            // angle belong to two different charts, and the donut collapses
            // into skewed slivers. Within one scope the key is stable, so
            // year and metric changes still animate.
            // A scope change replaces the ring structure, but year/metric
            // changes keep the same slots and animate each slice in place.
            // The plugins above safely ignore Chart.js's teardown frame.
            key={segment || "all"}
            data={{
              labels: rows.map((o) => segName(o.s)),
              datasets: [segmentRing, companyRing],
            }}
            options={
              {
                maintainAspectRatio: false,
                cutout: "58%",
                // Room for the labels of the outermost slices, which sit near
                // the canvas edge once the legend no longer squeezes the box.
                layout: { padding: 6 },
                // Per-ring on-slice text. Unscoped: the segment share on the
                // outer ring. Scoped: the outer ring is one slice at 100% — a
                // tautology, so it stays blank — and the company ring carries
                // name + share wherever an arc is wide enough to hold two lines.
                ringLabels: segment
                  ? [
                      null,
                      {
                        lines: companySlices.map((s, i) => [
                          s.brand,
                          `${companyPct(i).toFixed(companyPct(i) < 10 ? 1 : 0)}%`,
                        ]),
                        pcts: companySlices.map((_, i) => companyPct(i)),
                        min: 4.5,
                        size: 10.5,
                      },
                    ]
                  : [
                      {
                        lines: rows.map((_, i) => [shown(i)]),
                        pcts: rows.map((_, i) => pct(i)),
                        min: 5,
                        size: 11,
                      },
                      null,
                    ],
                centre: {
                  top: segment ? segName(segment) : "Total",
                  big: fmtEur(rows.reduce((sum, o) => sum + Math.max(0, o.v), 0)),
                },
                plugins: {
                  // Replaced by the fixed-width HTML legend beside the canvas.
                  legend: { display: false },
                  tooltip: {
                    titleColor: cssVar("--color-ink"),
                    bodyColor: cssVar("--color-ink"),
                    backgroundColor: cssVar("--color-panel"),
                    borderColor: cssVar("--color-line"),
                    borderWidth: 1,
                    callbacks: {
                      label: (c: {
                        datasetIndex: number;
                        dataIndex: number;
                        label?: string;
                      }) => {
                        if (c.datasetIndex === 1) {
                          const s = companySlices[c.dataIndex];
                          return s
                            ? ` ${s.brand}: ${fmtEur(s.value)} (${companyPct(c.dataIndex).toFixed(1)}%)`
                            : " Company";
                        }
                        return ` ${c.label}: ${fmtEur(rows[c.dataIndex].v)} (${pct(c.dataIndex).toFixed(1)}%)`;
                      },
                    },
                  },
                },
              } as never
            }
            plugins={[onSlice, centreText]}
          />
          <DonutLegend
            items={
              segment
                ? companySlices
                    .map((s, i) => ({
                      key: s.brand,
                      text: s.brand,
                      value: shownVal(s.value, companyPct(i)),
                      color: s.color,
                      sort: s.value,
                    }))
                    .filter((e) => e.sort > 0)
                    .sort((a, b) => b.sort - a.sort)
                : rows
                    .map((o, i) => ({
                      key: o.s,
                      text: segName(o.s),
                      value: shown(i),
                      color: SEG_COLORS[o.s] ?? "#888",
                      sort: o.has ? o.v : -1,
                    }))
                    .filter((e) => e.sort >= 0)
            }
          />
        </div>
      ) : (
        <div className="chartbox relative h-[340px]">
          <EngTag label="SVG" />
          <BarsSvg
            rows={rows
              .map((o, i) => ({
                label: segName(o.s),
                value: show === "pct" ? pct(i) : o.v,
                color: SEG_COLORS[o.s] ?? "#888",
                has: o.has,
              }))
              .filter((r) => r.has)}
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
