"use client";

import {
  Chart,
  Legend,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bubble } from "react-chartjs-2";
import { Seg } from "@/components/ui/seg";
import { fmtM } from "./format";
import { primarySegment, segName } from "./segments";
import { useSegColors } from "./useSegColors";
import type { CompanyYear, MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

Chart.register(PointElement, LinearScale, LogarithmicScale, Tooltip, Legend);

// Symmetric log for margin %: handles negatives, compresses outliers.
const slog = (v: number) => Math.sign(v) * Math.log10(1 + Math.abs(v));
/**
 * k×10ⁿ for k = 1..9 — 10,20,…,90, then 100,200,…,900, and so on. This is what
 * a log axis actually reads on: even steps inside each decade, the decade
 * itself ten times wider than the last. Both axes rule every rung and label
 * only some, so the spacing is visible without the labels colliding.
 */
function logLadder(from: number, to: number): number[] {
  const out: number[] = [];
  for (let decade = from; decade <= to; decade *= 10)
    for (let k = 1; k < 10; k++) if (k * decade <= to) out.push(k * decade);
  return out;
}

/** Round out to the next rung of the ladder: 3.2M → 4M, 137% → 200%. */
function ceilRung(v: number): number {
  if (v <= 0) return 0;
  const decade = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / decade) * decade;
}

/** Round IN to the rung at or below: 62k → 60k. The floor of a log axis. */
function floorRung(v: number): number {
  if (v <= 0) return 0;
  const decade = 10 ** Math.floor(Math.log10(v));
  return Math.floor(v / decade) * decade;
}

/** fmtM can't sign: it floors a −€500k to the literal string "-500000". */
const eur = (v: number) => `${v < 0 ? "−" : ""}€${fmtM(Math.abs(v))}`;

export type MetricKey = "turnover" | "revenue" | "profit" | "margin" | "employees";

/**
 * What either axis can be set to. `money` marks the figures per-employee mode
 * divides — a ratio and a headcount must not be divided again. `signed` marks
 * the ones that go to or below zero: Chart.js has no log scale that can hold
 * those, which is what decides whether the log toggle can reach this metric.
 */
const METRICS: Record<
  MetricKey,
  {
    label: string;
    money: boolean;
    signed: boolean;
    of: (d: CompanyYear) => number;
    fmt: (v: number) => string;
  }
> = {
  turnover: {
    label: "Turnover",
    money: true,
    signed: false,
    of: (d) => d.revenue ?? NaN,
    fmt: eur,
  },
  revenue: {
    label: "Revenue",
    money: true,
    signed: false,
    of: (d) => d.estimatedIncome ?? NaN,
    fmt: eur,
  },
  profit: {
    label: "Net profit",
    money: true,
    signed: true,
    of: (d) => d.profit ?? NaN,
    fmt: eur,
  },
  margin: {
    label: "Margin %",
    money: false,
    signed: true,
    of: (d) => ((d.profit ?? NaN) / (d.estimatedIncome ?? NaN)) * 100,
    fmt: (v) => `${v.toFixed(1)}%`,
  },
  employees: {
    label: "Employees",
    money: false,
    signed: false,
    of: (d) => d.employees ?? NaN,
    fmt: (v) => Math.round(v).toLocaleString(),
  },
};

/** The raw reading, on the current basis. */
const valueOf = (d: CompanyYear, key: MetricKey, perEmp: boolean) => {
  const M = METRICS[key];
  const raw = M.of(d);
  return M.money && perEmp ? raw / (d.employees as number) : raw;
};

/**
 * How an axis draws a metric. Only three shapes exist, and which one applies is
 * forced by the metric, not chosen. A figure that crosses zero cannot sit on
 * Chart.js's log scale at all — so it gets the SIGNED log instead, folded in
 * the data, which is what lets a −€2M and a +€2M year read symmetrically about
 * break-even. Net profit and margin both take that path; only the metrics that
 * stay positive can use a real log axis.
 */
const axisMode = (key: MetricKey, log: boolean): "log" | "slog" | "linear" =>
  !log ? "linear" : METRICS[key].signed ? "slog" : "log";

/** A company only plots if it filed everything the chart needs of it. */
const eligible = (d: CompanyYear) =>
  (d.estimatedIncome ?? 0) > 50_000 && d.profit != null && (d.employees ?? 0) > 0;

/**
 * The extent of one axis, from whatever readings it is handed. Feed it every
 * year and it becomes a fixed ruler: a field that grew and a field that shrank
 * no longer both fill the box, so movement between years is visible. Feed it
 * only what is on screen and the spread of THIS year fills the chart instead —
 * better for reading one year, useless for comparing two. That is the choice
 * the Fit control offers. Bounds land on a ladder rung either way, so the edge
 * of the chart is itself a labelled line.
 */
function boundsFrom(values: number[], key: MetricKey, log: boolean) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  if (!Number.isFinite(lo)) return { lo: 0, hi: 1 };
  // A log axis cannot start at zero, so it starts at the rung below the
  // smallest real reading — stated, not guessed, and steady across years.
  if (axisMode(key, log) === "log")
    return { lo: Math.max(floorRung(lo), 1), hi: ceilRung(hi) };
  return { lo: lo < 0 ? -ceilRung(-lo) : 0, hi: ceilRung(hi) };
}

type Dot = {
  /** Plotted position — slog-folded when that axis is in signed-log. */
  x: number;
  y: number;
  /** The readings themselves, for the tooltip, which never lies about units. */
  xRaw: number;
  yRaw: number;
  r: number;
  brand: string;
  emp: number;
  /** Canonical single segment — the slot when all nine are shown. */
  main: string;
  /** Every segment the company claims — the slots it can fill when some are off. */
  segs: string[];
};

const cssVar = (name: string) =>
  typeof document === "undefined"
    ? ""
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * The bubble field for one year. Extracted from the component so the PREVIOUS
 * year can be laid out through the identical filter and scaling — a trail is
 * only honest if both ends were computed the same way.
 */
function dotsFor(
  rows: CompanyYear[],
  year: number,
  perEmp: boolean,
  xKey: MetricKey,
  yKey: MetricKey,
  xLog: boolean,
  yLog: boolean,
): Dot[] {
  // Signed-log folds in the DATA, not the scale — Chart.js has no such scale.
  // Every other mode plots the reading as it stands.
  const place = (raw: number, key: MetricKey, log: boolean) =>
    axisMode(key, log) === "slog" ? slog(raw) : raw;
  return (
    rows
      .filter((d) => d.year === year && eligible(d))
      .map((d) => ({
        xRaw: valueOf(d, xKey, perEmp),
        yRaw: valueOf(d, yKey, perEmp),
        x: place(valueOf(d, xKey, perEmp), xKey, xLog),
        y: place(valueOf(d, yKey, perEmp), yKey, yLog),
        r: Math.max(4, Math.sqrt(d.employees as number) * 2.2),
        brand: d.brand,
        emp: d.employees as number,
        // BOTH kept, because which one files the bubble depends on what is
        // visible — see slotOf. The pool itself is never narrowed by the segment
        // filter: narrowing it here is what made un-crossing a legend entry do
        // nothing, since the companies it would have shown were already gone.
        main: primarySegment(d),
        segs: d.activities,
      }))
      // Turnover is missing for some filings, so a metric can be NaN even for a
      // company that passed `eligible`. Drop the bubble rather than plot it at 0.
      .filter((dot) => Number.isFinite(dot.x) && Number.isFinite(dot.y))
  );
}

/** Log is offered on every axis, but only the unsigned metrics can honour it —
    see axisMode. On the others the choice simply has no effect. */
const SCALE_OPTIONS = [
  { value: "log", label: "Log" },
  { value: "linear", label: "Linear" },
];

type AxisSkin = { ink: string; muted: string; grid: string };

/**
 * One axis, whichever metric it carries. Written once for both because the
 * three shapes differ only in how ticks are chosen and read back:
 *  - log    the rung ladder, ruled at every 10/20/30… and labelled sparsely
 *  - slog   the same ladder, mirrored through zero, folded in the data
 *  - linear Chart.js's own even steps, which need no help
 * Break-even gets a solid rule on any axis that crosses zero.
 */
function buildScale(
  key: MetricKey,
  log: boolean,
  perEmp: boolean,
  bounds: { lo: number; hi: number },
  skin: AxisSkin,
) {
  const M = METRICS[key];
  const mode = axisMode(key, log);
  const unfold = (v: number) => Math.sign(v) * (10 ** Math.abs(v) - 1);
  // In slog the tick carries the FOLDED value, so read it back before deciding
  // whether it is a rung worth naming; the round-trip lands a hair off the
  // integer, hence the rounding.
  const readTick = (v: number) => (mode === "slog" ? Math.round(unfold(v)) : v);
  const ladder =
    mode === "log"
      ? logLadder(1, 1e9).filter((v) => v >= bounds.lo && v <= bounds.hi)
      : mode === "slog"
        ? // Money folds from €100, percentages from 1: a euro ladder rung at
          // €2 or €7 is noise nobody reads, and it would crowd out the decades
          // that matter.
          (() => {
            const base = M.money ? 100 : 1;
            return [
              ...logLadder(base, -bounds.lo)
                .map((v) => -v)
                .reverse(),
              0,
              ...logLadder(base, bounds.hi),
            ];
          })()
        : [];
  // Sparse enough to stay readable: over a wide range only the decade heads are
  // named, or a signed €-axis would try to label 50-odd rungs. Both ends are
  // always named, so the extent of the axis is stated.
  const heads = ladder.length > 40 ? [1] : [1, 2, 3, 5];
  const named = new Set(
    ladder
      .filter((v) => {
        const mag = Math.abs(v);
        return mag === 0 || heads.includes(mag / 10 ** Math.floor(Math.log10(mag)));
      })
      .concat([bounds.lo, bounds.hi]),
  );

  return {
    type: mode === "log" ? ("logarithmic" as const) : ("linear" as const),
    min: mode === "slog" ? slog(bounds.lo) : bounds.lo,
    max: mode === "slog" ? slog(bounds.hi) : bounds.hi,
    // No title: the axis is named by its own controls, which sit where the
    // title would be. Two labels for one axis is one too many.
    title: { display: false },
    grid: {
      display: true,
      drawTicks: false,
      color: (c: { tick: { value: number } }) =>
        c.tick.value === 0 && bounds.lo < 0
          ? skin.ink
          : mode === "linear" || named.has(readTick(c.tick.value))
            ? skin.grid
            : `${skin.grid}55`,
      lineWidth: (c: { tick: { value: number } }) =>
        c.tick.value === 0 && bounds.lo < 0 ? 1.5 : 1,
    },
    border: { display: false },
    afterBuildTicks: (axis: { ticks: { value: number }[] }) => {
      if (!ladder.length) return;
      axis.ticks = ladder.map((v) => ({ value: mode === "slog" ? slog(v) : v }));
    },
    ticks: {
      color: skin.muted,
      font: { size: 11 },
      callback: (v: number) => {
        const read = readTick(v);
        return mode === "linear" || named.has(read) ? M.fmt(read) : "";
      },
    },
  };
}

/** Just the parts of the Chart.js instance the trail plugin touches. */
type TrailOptions = {
  on: boolean;
  /** Every earlier year's position, oldest first, per company. */
  paths: Record<string, { x: number; y: number }[]>;
};

type TrailChart = {
  ctx: CanvasRenderingContext2D;
  chartArea?: { left: number; right: number; top: number; bottom: number };
  scales: Record<string, { getPixelForValue: (v: number) => number } | undefined>;
  data: { datasets: { borderColor: string; data: Dot[] }[] };
  getDatasetMeta: (i: number) => { hidden?: boolean; data: { x: number; y: number }[] };
};

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

  const [showTrails, setShowTrails] = useState(true);
  const [xMetric, setXMetric] = useState<MetricKey>("revenue");
  const [yMetric, setYMetric] = useState<MetricKey>("margin");
  const [xLog, setXLog] = useState(true);
  const [yLog, setYLog] = useState(true);
  /** All years = a fixed ruler; this view = fill the box with what's shown. */
  const [fitAll, setFitAll] = useState(true);

  // Bubbles appear IN PLACE: the position tween is off (see options.animation),
  // so instead of flying new bubbles in from the axis floor and sliding the
  // whole field on every year step, the canvas fades from transparent to
  // visible whenever what it plots changes. Re-triggered off this signature.
  const chartRef = useRef<Chart<"bubble"> | null>(null);
  const fieldSig = [
    year,
    xMetric,
    yMetric,
    xLog,
    yLog,
    perEmp,
    fitAll,
    [...hiddenSegs].sort().join(","),
  ].join("|");
  useEffect(() => {
    const canvas = chartRef.current?.canvas;
    if (!canvas) return;
    canvas.style.transition = "none";
    canvas.style.opacity = "0";
    void canvas.offsetHeight; // reflow so the 0 lands before the transition
    canvas.style.transition = "opacity 300ms ease-out";
    canvas.style.opacity = "1";
  }, [fieldSig]);

  const rows = useMemo(
    () => dotsFor(model.rows, year, perEmp, xMetric, yMetric, xLog, yLog),
    [model.rows, year, perEmp, xMetric, yMetric, xLog, yLog],
  );

  // Every year the company has filed BEFORE the selected one, on these same
  // axes — the whole path, not one hop. Keyed by brand, the only identity a
  // bubble carries; a year a company is missing from simply drops out of its
  // path rather than breaking it, and a company with no history has no trail
  // rather than a line from nowhere.
  const trailPaths = useMemo(() => {
    const at: Record<string, { x: number; y: number }[]> = {};
    // Ascending, so each company's path reads oldest → newest and the line can
    // be drawn as one stroke ending at this year's bubble.
    for (const past of model.finYears.filter((fy) => fy < year).sort((a, b) => a - b))
      for (const dot of dotsFor(model.rows, past, perEmp, xMetric, yMetric, xLog, yLog))
        (at[dot.brand] ??= []).push({ x: dot.x, y: dot.y });
    return at;
  }, [model.rows, model.finYears, year, perEmp, xMetric, yMetric, xLog, yLog]);

  /**
   * The travel path: every earlier year in order, ending at this one. Under the
   * bubbles (beforeDatasetsDraw) so it never obscures one, and read off the
   * live element rather than the data, so during the year tween the line's head
   * stays glued to the moving bubble instead of snapping to its destination.
   */
  const trails = useMemo(
    () => ({
      id: "trails",
      beforeDatasetsDraw(chart: TrailChart, _args: unknown, opts: TrailOptions) {
        // State arrives through Chart.js's own plugin options, NOT a closure:
        // `plugins` is read once when the chart is constructed, so a captured
        // prevPos would freeze at the first year and an on/off flag would never
        // take effect. Options are re-read on every update, which also lets the
        // chart animate in place instead of being remounted.
        if (!opts?.on) return;
        const paths = opts.paths ?? {};
        const { ctx, chartArea: area } = chart;
        const xs = chart.scales.x;
        const ys = chart.scales.y;
        if (!xs || !ys || !area) return;
        ctx.save();
        // Clip: a company below the axis floor last year would otherwise draw
        // its line out across the labels.
        ctx.beginPath();
        ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
        ctx.clip();
        ctx.lineWidth = 1.25;
        chart.data.datasets.forEach((ds, i) => {
          const meta = chart.getDatasetMeta(i);
          if (meta.hidden) return;
          ctx.strokeStyle = ds.borderColor;
          ds.data.forEach((dot, j) => {
            const past = paths[dot.brand];
            const head = meta.data[j];
            if (!past?.length || !head) return;
            const pts = past
              .map((p) => ({ x: xs.getPixelForValue(p.x), y: ys.getPixelForValue(p.y) }))
              .concat([{ x: head.x, y: head.y }]);
            // Segment by segment rather than one stroke: each hop fades in
            // towards the present, so a path that doubles back still reads in
            // the right direction without arrowheads crowding a dense field.
            for (let k = 1; k < pts.length; k++) {
              ctx.globalAlpha = 0.15 + 0.3 * (k / (pts.length - 1));
              ctx.beginPath();
              ctx.moveTo(pts[k - 1].x, pts[k - 1].y);
              ctx.lineTo(pts[k].x, pts[k].y);
              ctx.stroke();
            }
            // A ring on the earliest year: where the company started.
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(pts[0].x, pts[0].y, 2.2, 0, Math.PI * 2);
            ctx.stroke();
          });
        });
        ctx.restore();
      },
    }),
    // Stable on purpose — everything variable now travels through options.
    [],
  );

  const segColor = (seg: string) =>
    SEG_COLORS[seg] ?? (cssVar("--color-muted") || "#888");

  /**
   * Which segment slot a company's bubble goes in — and so, whether it shows at
   * all. Two cases, and only two:
   *
   * Down to ONE segment, the question is "does this company do this work?", so
   * every company claiming it appears, whatever its main segment is. That is
   * the whole point of looking at one segment.
   *
   * With more than one visible, the slot is the company's main segment and
   * nothing else. Filing under "first visible segment it claims" — which is
   * what this did — meant hiding Events re-filed unrelated companies onto
   * whichever segment happened to sort first, so a Creative agency that also
   * does BTL changed colour and moved. Hiding one segment must remove that
   * segment's companies and disturb nothing else.
   */
  const slotOf = (dot: Dot, visible: string[]) =>
    visible.length === 1
      ? dot.segs.includes(visible[0])
        ? visible[0]
        : null
      : visible.includes(dot.main)
        ? dot.main
        : null;

  // One dataset per segment slot — legend stays fixed; hidden ones strike through.
  const datasets = useMemo(
    () => {
      const visible = model.segments.filter((s) => !hiddenSegs.has(s));
      return model.segments.map((s) => {
        const color = segColor(s);
        const hidden = hiddenSegs.has(s);
        return {
          label: segName(s),
          data: hidden ? [] : rows.filter((r) => slotOf(r, visible) === s),
          hidden,
          backgroundColor: `${color}73`,
          borderColor: color,
          borderWidth: 1.5,
          hoverBackgroundColor: `${color}cc`,
          hoverBorderWidth: 2,
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, model.segments, hiddenSegs, SEG_COLORS],
  );

  // Above the early return: hooks must run in the same order every render.
  // Deliberately NOT keyed on year or segment — that is the whole point.
  // "Is anything on screen?" — ask the datasets, which already know.
  const visibleRows = datasets.flatMap((d) => d.data);

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
  const skin = { ink, muted, grid };
  // Plain calls, not hooks: they sit below the early return, and a sweep of the
  // row set is cheap next to what Chart.js does with the result.
  const rangeOf = (key: MetricKey, logOn: boolean, pick: (d: Dot) => number) =>
    boundsFrom(
      fitAll
        ? model.rows.filter(eligible).map((d) => valueOf(d, key, perEmp))
        : visibleRows.map(pick),
      key,
      logOn,
    );
  const xBounds = rangeOf(xMetric, xLog, (d) => d.xRaw);
  const yBounds = rangeOf(yMetric, yLog, (d) => d.yRaw);
  const axisOptions = (Object.keys(METRICS) as MetricKey[]).map((k) => ({
    value: k,
    label: METRICS[k].label,
  }));

  return (
    <section className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h2 className="mb-1 text-[15px] font-semibold">
        Size vs profitability ({year}
        {segment ? ` · ${segName(segment)}` : ""}
        {perEmp ? " · per employee" : ""})
      </h2>
      {/* The Y controls sit where the Y title was, the X controls under the
          X axis — each axis is named by the thing that changes it, so there is
          no second label to fall out of step. Chart-wide controls keep to the
          right, away from either axis. */}
      <div className="mb-2 flex flex-wrap items-center justify-end gap-[7px]">
        <div className="flex flex-wrap gap-[7px]">
          <Seg
            label="Fit"
            value={fitAll ? "all" : "view"}
            onChange={(v) => setFitAll(v === "all")}
            btnClassName="px-2 py-1 text-[11.5px]"
            options={[
              { value: "all", label: "All years" },
              { value: "view", label: "This view" },
            ]}
          />
          <Seg
            label="Trails"
            value={showTrails ? "on" : "off"}
            onChange={(v) => setShowTrails(v === "on")}
            btnClassName="px-2 py-1 text-[11.5px]"
            options={[
              { value: "on", label: "Trails" },
              { value: "off", label: "None" },
            ]}
          />
        </div>
      </div>
      {/* The phone height is intentionally shorter via the mobile override;
          tablets and desktops retain enough vertical room for axes, legend,
          and the bubble field to remain readable. */}
      {/* Desktop heights are doubled: the bubble field is the whole point of
          this chart and 300px squeezed the margin axis flat. Phones keep 450px
          (and the ≤600px .chartbox.tall rule), where twice as tall would push
          the axes off screen. */}
      {/* The Y controls sit beside the plot on the axis they drive, reading as
          its title — the X pair does the same underneath. Above the chart they
          were a row of buttons with nothing to say which axis they belonged to.
          Below md they go back to a row: a 110px gutter on a phone would leave
          the bubble field too narrow to read. */}
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-3">
        <div className="flex flex-row flex-wrap gap-[7px] md:w-[104px] md:flex-none md:flex-col md:justify-center">
          <Seg
            label="Y axis"
            value={yMetric}
            onChange={(v) => setYMetric(v as MetricKey)}
            btnClassName="px-2 py-1 text-[11.5px]"
            className="md:flex-col"
            options={axisOptions}
          />
          <Seg
            label="Y scale"
            value={yLog ? "log" : "linear"}
            onChange={(v) => setYLog(v === "log")}
            btnClassName="px-2 py-1 text-[11.5px]"
            className="md:flex-col"
            options={SCALE_OPTIONS}
          />
        </div>
        <div className="chartbox tall relative h-[450px] min-w-0 flex-1 md:h-[600px] lg:h-[640px]">
          <Bubble
            // No `key`: remounting would rebuild the chart and every switch would
            // snap. The chart is kept alive so the fieldSig effect can fade the
            // canvas instead of the whole element flashing on a remount.
            ref={chartRef}
            plugins={[trails as never]}
            data={{ datasets }}
            options={
              {
                maintainAspectRatio: false,
                // No position tween. Flying every bubble in from the axis and
                // gliding the field on each year step read as confusing motion
                // in a dense scatter — so bubbles land in place and the canvas
                // fades in instead (fieldSig effect). Trails still show each
                // company's year-to-year path, drawn statically.
                animation: false,
                responsive: true,
                plugins: {
                  trails: { on: showTrails, paths: trailPaths },
                  legend: {
                    onClick: (_e: unknown, item: { datasetIndex?: number }) => {
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
                            // `hidden` is what Chart.js draws the strike-through
                            // from — there is no `strikeThrough` field on a legend
                            // item. Hard-coding it false is why a bottom-bar
                            // segment filter left every other name looking active.
                            hidden: off,
                            datasetIndex: i,
                            fontColor: off ? muted : ink,
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
                        const per = perEmp ? "/emp" : "";
                        // Reads the RAW values, so the tooltip is unaffected by
                        // whichever fold the axis happens to be drawing in.
                        return ` ${p.brand}: ${METRICS[xMetric].label}${METRICS[xMetric].money ? per : ""} ${METRICS[xMetric].fmt(p.xRaw)}, ${METRICS[yMetric].label}${METRICS[yMetric].money ? per : ""} ${METRICS[yMetric].fmt(p.yRaw)}, ${p.emp} empl.`;
                      },
                    },
                  },
                },
                scales: {
                  x: buildScale(xMetric, xLog, perEmp, xBounds, skin),
                  y: buildScale(yMetric, yLog, perEmp, yBounds, skin),
                },
              } as never
            }
          />
        </div>
      </div>
      {/* Under the plot, centred: this is the X axis title, and it is clickable. */}
      <div className="mt-1.5 flex flex-wrap justify-center gap-[7px]">
        <Seg
          label="X axis"
          value={xMetric}
          onChange={(v) => setXMetric(v as MetricKey)}
          btnClassName="px-2 py-1 text-[11.5px]"
          options={axisOptions}
        />
        <Seg
          label="X scale"
          value={xLog ? "log" : "linear"}
          onChange={(v) => setXLog(v === "log")}
          btnClassName="px-2 py-1 text-[11.5px]"
          options={SCALE_OPTIONS}
        />
      </div>
    </section>
  );
}
