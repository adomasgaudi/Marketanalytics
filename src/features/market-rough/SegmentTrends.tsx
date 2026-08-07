"use client";

import { useEffect, useRef, useState } from "react";
import { Seg } from "@/components/ui/seg";
import { fmtEur, fmtInt } from "./format";
import { LineChart, type LineSeries } from "./LineChart";
import {
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
import { useSegLineColors } from "./useSegColors";
import { useVisibleYears } from "./years";

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
  const [{ market, segment }] = useDashboardParams();
  const visibleYears = useVisibleYears(model.finYears);
  const [metric, setMetric] = useState<SegMetricKey>("revenue");
  // Legacy default: just the first segment selected.
  const [segs, setSegs] = useState<Set<string>>(
    () => new Set(model.segments.slice(0, 1)),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  // Scrolling the bottom-bar segment picker scopes this chart too: a chosen
  // segment shows just that line, "All segments" restores every segment. Keyed
  // on the scope only, so manual multi-select below still holds between changes.
  useEffect(() => {
    setSegs(segment ? new Set([segment]) : new Set(model.segments));
  }, [segment, model.segments]);

  // A dropdown that only closes by re-clicking its own button is a trap — it
  // covers the chart it filters. Bound on pointerdown, not click, so the list
  // is gone before the click lands on whatever is underneath. The button itself
  // is inside the ref, so its own toggle still works rather than firing twice.
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    const onOutside = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [pickerOpen]);

  const basis: SegBasis =
    market === "avg" ? "company" : market === "emp" ? "emp" : "total";
  const fmt = metric === "employees" ? fmtInt : fmtEur;
  const SEG_COLORS = useSegLineColors();

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
        data: visibleYears
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
      data: visibleYears
        .map((y) => ({ x: y, y: segMetricVal(model.rows, s, metric, basis, y) }))
        .filter((p): p is { x: number; y: number } => p.y != null),
    };
    if (med.data.length) series.push(med);
  });

  const yUnit = metric === "avgSalary" ? "€/mo" : metric === "employees" ? "people" : "€";

  return (
    <div className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h3 className="mb-2 text-[15px] font-semibold">Financial metrics by segment</h3>

      {/* Picker, chips and metric on ONE wrapping row — three stacked full-width
          rows of controls pushed the chart they configure off the screen. The
          dropdown sizes to its content instead of the card, and the panel it
          opens keeps a usable width of its own. */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((v) => !v)}
            className="border-line bg-panel2 text-ink flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-semibold"
          >
            <span className="max-w-[220px] truncate">
              {segs.size ? [...segs].map(segName).join(", ") : "Add segment"}
            </span>
            <span className="text-muted text-[10px]">▼</span>
          </button>
          {pickerOpen && (
            <div
              role="listbox"
              aria-multiselectable="true"
              className="border-line bg-panel absolute top-[calc(100%+4px)] left-0 z-20 max-h-[240px] w-[240px] overflow-y-auto rounded-lg border p-1.5 shadow-[0_4px_20px_rgba(0,0,0,.4)]"
            >
              {/* Select all / Clear all live IN the list, not beside the button:
                  they act on the same set the options below toggle, so they
                  belong where that set is edited. */}
              <div className="border-line mb-1 flex gap-1 border-b pb-1.5">
                <button
                  type="button"
                  onClick={() => setSegs(new Set(model.segments))}
                  className="text-muted hover:text-ink hover:bg-panel2 flex-1 cursor-pointer rounded-md px-2 py-1 text-[12px] font-semibold"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSegs(new Set())}
                  className="text-muted hover:text-ink hover:bg-panel2 flex-1 cursor-pointer rounded-md px-2 py-1 text-[12px] font-semibold"
                >
                  Clear all
                </button>
              </div>
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
        {[...segs].map((s) => (
          /* Each chip wears its own line's colour, not one shared accent: the
             chip is how you find that line in the chart, and nine identical
             gold chips made the reader match by name instead of by sight. */
          <span
            key={s}
            className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-semibold"
            style={{
              color: SEG_COLORS[s] ?? "var(--color-muted)",
              borderColor: `color-mix(in srgb, ${SEG_COLORS[s] ?? "#888"} 45%, transparent)`,
              background: `color-mix(in srgb, ${SEG_COLORS[s] ?? "#888"} 12%, transparent)`,
            }}
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
            Shown {visibleYears[0]}→
            {String(visibleYears[visibleYears.length - 1]).slice(2)}.
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
