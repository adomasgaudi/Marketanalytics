"use client";

import { ArcElement, Chart, Legend, Tooltip } from "chart.js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Seg } from "@/components/ui/seg";
import { fmtEur } from "./format";
import {
  basisWord,
  marketMetricTotal,
  SEG_METRICS,
  type SegBasis,
  type SegMetricKey,
  segmentShareTotal,
  segMetricVal,
  segName,
} from "./segments";
import { PeriodToggle } from "./PeriodToggle";
import { useSegColors } from "./useSegColors";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

Chart.register(ArcElement, Tooltip, Legend);

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
  onPick,
}: {
  items: { key: string; text: string; value: string; color: string }[];
  onPick?: (key: string) => void;
}) {
  return (
    // justify-center-safe, not justify-center: a centred flex column that
    // overflows spills off BOTH ends, and the rows above the top edge cannot be
    // scrolled back to. `safe` centres only while the list fits and falls back
    // to start-aligned once it doesn't, so the first company is always reachable.
    <ul className="absolute inset-y-0 right-0 hidden w-[164px] [scrollbar-width:thin] list-none flex-col justify-center-safe gap-[3px] overflow-y-auto py-1 text-[11px] sm:flex">
      {items.map((item) => (
        <li
          key={item.key}
          className={`flex items-start gap-1.5 leading-[1.35] ${onPick ? "cursor-pointer hover:opacity-80" : ""}`}
          onClick={onPick ? () => onPick(item.key) : undefined}
        >
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
  const [{ year, market, segment, per }, setParams] = useDashboardParams(model.last);
  const router = useRouter();
  // Same URL shape as the strip's "Open in dashboard" link.
  const companyHref = (brand: string) =>
    `/companies?companies=${encodeURIComponent(brand)}&year=${year}`;
  const SEG_COLORS = useSegColors();
  const [metric, setMetric] = useState<SegMetricKey>("revenue");
  const [show, setShow] = useState<"pct" | "eur">("pct");

  /**
   * The aggregation basis is a way of comparing SEGMENTS with each other —
   * whole, average company, average per employee. Scoped to one segment the
   * donut stops comparing segments and starts listing companies, and a
   * per-company reading of a per-company list is not a thing.
   *
   * Applying it anyway was not merely redundant, it was wrong: "company" made
   * the segment's value its AVERAGE, and the company ring was then rescaled so
   * its slices summed to that average. Every company was drawn at its real
   * figure x (average / sum) — Fabula's EUR 2.7M appeared as EUR 48k, a number
   * that is neither its revenue nor an average of anything.
   */
  const basis: SegBasis = segment
    ? // "per company" is the only reading with nothing to say about a list of
      // companies. "Per employee" still divides each company by its own
      // headcount, which reorders them, so it is kept.
      market === "emp"
      ? "emp"
      : "total"
    : market === "avg"
      ? "company"
      : market === "emp"
        ? "emp"
        : "total";

  // Fixed segment order AND fixed length: every segment always occupies its
  // own slot, reporting years contribute 0. Slices therefore keep both their
  // position and their colour as the year changes — a segment that starts
  // reporting (e.g. PA) grows from nothing instead of shoving its neighbours
  // along. `has` marks the slots with real data, for the legend and bars.
  // Scoped to one segment, the outer ring collapses to that segment's own full
  // circle and the inner ring becomes the readable half: its companies. The
  // two-ring shape is kept rather than swapped, so the picker reads as a zoom.
  const shownSegments = segment ? [segment] : model.segments;
  // The year over twelve, applied AFTER the basis so it composes with it —
  // exactly as on the money-flow card. Ratio metrics (margin, salary) are
  // already per-month or unitless, so they are left alone.
  const months = per === "month" && !SEG_METRICS[metric].ratio ? 12 : 1;
  const rows = shownSegments.map((s) => {
    const v = segMetricVal(model.rows, s, metric, basis, year);
    return { s, v: v == null ? 0 : v / months, has: v != null };
  });

  const shareTotal = segmentShareTotal(
    model.rows,
    metric,
    basis,
    year,
    segment ?? null,
    rows.map((o) => o.v),
  );
  // Scoped: the segment's own total. Per employee that must be the WEIGHTED
  // figure — total revenue over total headcount — not the sum of the slices,
  // because adding up per-employee ratios gives a number nobody earns.
  const scopedRows = segment
    ? model.rows.filter((d) => d.year === year && d.activities.includes(segment))
    : [];
  const centreValue = segment
    ? basis === "emp"
      ? (() => {
          const v = scopedRows.reduce(
            (sum, d) => sum + (SEG_METRICS[metric].f(d) ?? 0),
            0,
          );
          const e = scopedRows.reduce((sum, d) => sum + (d.employees ?? 0), 0);
          return e > 0 ? v / e / months : 0;
        })()
      : Math.max(0, rows[0]?.v ?? 0)
    : marketMetricTotal(model.rows, metric, basis, year) / months;
  const pct = (i: number) => (Math.max(0, rows[i].v) / shareTotal) * 100;
  const shown = (i: number) =>
    show === "pct" ? `${pct(i).toFixed(pct(i) < 10 ? 1 : 0)}%` : fmtEur(rows[i].v);

  const title = `${year} ${SEG_METRICS[metric].label} ${segment ? `in ${segName(segment)} by company` : "by segment"}${basis === "total" ? "" : ` · ${basisWord(basis)}`}`;

  // Inner company ring only when scoped to one segment — in All Segments the
  // same brand can sit in several slices and would be drawn multiple times.
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
          // Same divisor the segment ring used, or the inner ring would be
          // twelve times the outer one.
          return [d.brand, Math.max(0, value) / months] as const;
        }),
    );
    const companyTotal = [...valuesByBrand.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    // Scoped to one segment the slices ARE the figures — no rescaling, so a
    // company reads its own value. Unscoped they are still normalised into
    // their segment's arc, which is what makes the inner ring line up with the
    // outer one.
    const displayedSegmentValue = Math.max(0, segmentRow.v);
    const rescale = !segment && companyTotal > 0 && displayedSegmentValue > 0;
    return brands.map((brand, i) => {
      const value = valuesByBrand.get(brand) ?? 0;
      return {
        value: rescale ? (value / companyTotal) * displayedSegmentValue : value,
        brand,
        seg: segmentRow.s,
        color: tint(SEG_COLORS[segmentRow.s] ?? "#888", i, brands.length),
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
          label="Metric"
          value={metric}
          onChange={setMetric}
          btnClassName="px-2 py-1 text-[11.5px]"
          // Turnover first: it is the registry-filed headline figure, so it
          // leads and revenue sits beside it as the derived reading.
          options={[
            { value: "turnover", label: "Turnover" },
            { value: "revenue", label: "Revenue" },
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
        {/* Same year/month unit as the money-flow card, reading the same URL
            param, so the two never disagree about the period on screen. Shown
            in % mode too: the shares are indeed identical either way, but the
            CENTRE figure is always in euro, so the toggle still changes it. */}
        <PeriodToggle defaultYear={model.last} />
      </div>

      {!rows.some((o) => o.has) ? (
        <p className="text-muted p-6 text-center text-[13px]">
          No companies have reported {year} figures yet.
        </p>
      ) : (
        // The canvas stays a DIRECT child of the sized box — Chart.js measures
        // its parent, and wrapping it in another div (flex item or absolute)
        // leaves it measuring a box that isn't laid out yet, which collapses
        // the donut. The legend's column is reserved with padding instead, and
        // being a fixed width it can never resize the canvas or shift the
        // donut sideways.
        <div className="chartbox relative h-[340px] sm:pr-[176px]">
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
                // In All Segments a click on either ring scopes the donut to
                // that slice's segment — same URL param the picker writes, so
                // every card follows. Scoped, a company slice opens that
                // company in the dashboard (the strip's "Open in dashboard"
                // URL); the one-slice outer ring stays inert.
                onClick: (
                  _e: unknown,
                  els: { datasetIndex: number; index: number }[],
                ) => {
                  if (!els.length) return;
                  const { datasetIndex, index } = els[0];
                  if (segment) {
                    const brand = datasetIndex === 1 ? companySlices[index]?.brand : null;
                    if (brand) router.push(companyHref(brand));
                    return;
                  }
                  const s =
                    datasetIndex === 0 ? rows[index]?.s : companySlices[index]?.seg;
                  if (s) setParams({ segment: s });
                },
                onHover: (
                  e: { native?: { target?: HTMLElement } },
                  els: { datasetIndex: number }[],
                ) => {
                  const t = e.native?.target;
                  if (t)
                    t.style.cursor =
                      els.length && (!segment || els[0].datasetIndex === 1)
                        ? "pointer"
                        : "";
                },
                // Per-ring on-slice text. Unscoped: the segment share on the
                // outer ring. Scoped: the outer ring is one slice at 100% — a
                // tautology, so it stays blank — and the company ring carries
                // name + share wherever an arc is wide enough to hold two lines.
                ringLabels: segment
                  ? [
                      null,
                      {
                        // shownVal, not a hardcoded %: the €/% toggle has to
                        // reach the on-slice text too, or switching to € changes
                        // the legend and the tooltip while the donut keeps
                        // showing percentages.
                        lines: companySlices.map((s, i) => [
                          s.brand,
                          shownVal(s.value, companyPct(i)),
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
                  top: segment ? segName(segment) : "Total market",
                  big: fmtEur(centreValue),
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
            onPick={
              segment
                ? // Scoped: rows are companies; open the company dashboard.
                  (key) => router.push(companyHref(key))
                : (key) => setParams({ segment: key })
            }
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
      )}
    </section>
  );
}
