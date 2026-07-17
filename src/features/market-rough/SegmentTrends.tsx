"use client";

import { useState } from "react";
import { Seg } from "@/components/ui/seg";
import { fmtEur, fmtInt } from "./format";
import { LineChart, type LineSeries } from "./LineChart";
import {
  SEG_COLORS,
  SEG_METRICS,
  segDesc,
  type SegBasis,
  type SegMetricKey,
  segMetricPct,
  segMetricVal,
  segName,
} from "./segments";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

const TREND_METRICS: SegMetricKey[] = [
  "revenue",
  "turnover",
  "profit",
  "employees",
  "wages",
  "avgSalary",
];

/** Financial metrics by segment: one line per selected segment across the years. */
export function SegmentTrends({ model }: { model: MarketModel }) {
  const [{ market }] = useDashboardParams(model.last);
  const [metric, setMetric] = useState<SegMetricKey>("revenue");
  // Legacy default: just the first segment selected.
  const [segs, setSegs] = useState<Set<string>>(
    () => new Set(model.segments.slice(0, 1)),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const basis: SegBasis =
    market === "avg" ? "company" : market === "emp" ? "emp" : "total";
  const fmt = metric === "employees" ? fmtInt : fmtEur;

  // Legacy renderRevSegAll: series ordered by their latest-year value, and
  // 5/95 + 25/75 percentile bands for avgSalary when ≤2 segments are picked.
  const ranked = model.segments
    .filter((s) => segs.has(s))
    .map((s) => ({ s, v: segMetricVal(model.rows, s, metric, basis, model.last) ?? 0 }))
    .sort((a, b) => b.v - a.v)
    .map((o) => o.s);
  const showBands = metric === "avgSalary" && ranked.length <= 2;

  const series: LineSeries[] = [];
  ranked.forEach((s) => {
    const col = SEG_COLORS[s] ?? "var(--color-muted)";
    if (showBands) {
      const bandLine = (p: number, dash: number[], opacity: number): LineSeries => ({
        label: "",
        color: col,
        dash,
        width: 1,
        opacity,
        noMarkers: true,
        data: model.finYears
          .map((y) => ({ x: y, y: segMetricPct(model.rows, s, metric, y, p) }))
          .filter((pt): pt is { x: number; y: number } => pt.y != null),
      });
      [
        bandLine(0.95, [2, 3], 0.4),
        bandLine(0.75, [5, 4], 0.6),
        bandLine(0.25, [5, 4], 0.6),
        bandLine(0.05, [2, 3], 0.4),
      ].forEach((se) => {
        if (se.data.length) series.push(se);
      });
    }
    const med: LineSeries = {
      label: segName(s),
      color: col,
      width: 2,
      data: model.finYears
        .map((y) => ({ x: y, y: segMetricVal(model.rows, s, metric, basis, y) }))
        .filter((p): p is { x: number; y: number } => p.y != null),
    };
    if (med.data.length) series.push(med);
  });

  const yUnit = metric === "avgSalary" ? "€/mo" : metric === "employees" ? "people" : "€";

  return (
    <div className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h3 className="mb-2 text-[15px] font-semibold">Financial metrics by segment</h3>

      {/* Legacy segment picker: a select-style dropdown + removable chips + Clear all. */}
      <div className="relative mb-2">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
          className="border-line bg-panel2 text-ink flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-[13px] font-semibold"
        >
          <span>{segs.size ? [...segs].map(segName).join(", ") : "Add segment"}</span>
          <span className="text-muted text-[10px]">▼</span>
        </button>
        {pickerOpen && (
          <div
            role="listbox"
            aria-multiselectable="true"
            className="border-line bg-panel absolute top-[calc(100%+4px)] right-0 left-0 z-20 max-h-[240px] overflow-y-auto rounded-lg border p-1.5 shadow-[0_4px_20px_rgba(0,0,0,.4)]"
          >
            {model.segments.map((s) => (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={segs.has(s)}
                onClick={() =>
                  setSegs((old) => {
                    const next = new Set(old);
                    if (next.has(s)) next.delete(s);
                    else next.add(s);
                    return next;
                  })
                }
                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[13px] ${
                  segs.has(s) ? "text-accent font-semibold" : "text-ink"
                } hover:bg-panel2`}
              >
                <span className="w-3">{segs.has(s) ? "✓" : ""}</span>
                {segName(s)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSegs(new Set())}
          className="border-line bg-panel2 text-muted hover:text-ink cursor-pointer rounded-md border px-2.5 py-1 text-[12px] font-semibold italic"
        >
          Clear all
        </button>
        {[...segs].map((s) => (
          <span
            key={s}
            className="border-accent/40 bg-accent/10 text-accent flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-semibold"
          >
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ background: SEG_COLORS[s] ?? "var(--color-muted)" }}
            />
            {segName(s)}
            <button
              type="button"
              aria-label={`Remove ${segName(s)}`}
              onClick={() =>
                setSegs((old) => {
                  const next = new Set(old);
                  next.delete(s);
                  return next;
                })
              }
              className="text-muted hover:text-ink cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="mb-3">
        <Seg
          label="Financial metric"
          value={metric}
          onChange={setMetric}
          btnClassName="px-[11px]"
          options={TREND_METRICS.map((m) => ({ value: m, label: SEG_METRICS[m].label }))}
        />
      </div>

      {series.length ? (
        <>
          <LineChart series={series} fmt={fmt} yTitle={yUnit} />
          <p className="text-muted mt-2 text-[12px]">
            {segDesc(metric, basis)}
            {showBands
              ? " Dashed = 25th/75th, dotted = 5th/95th percentile per segment."
              : ""}{" "}
            Shown {model.finYears[0]}→
            {String(model.finYears[model.finYears.length - 1]).slice(2)}.
          </p>
        </>
      ) : (
        <>
          <p className="text-muted p-6 text-center text-[13px]">
            Select a segment above to compare trends over time.
          </p>
          <p className="text-muted mt-2 text-[12px]">
            Pick one or more segments from the dropdown to compare over time.
          </p>
        </>
      )}
    </div>
  );
}
