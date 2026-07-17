"use client";

import { useState } from "react";
import { Pill, PillRow } from "@/components/ui/pills";
import { fmtEur, fmtInt } from "./format";
import { LineChart } from "./LineChart";
import {
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

  const series = model.segments
    .filter((s) => segs.has(s))
    .map((s) => ({
      label: segName(s),
      color: SEG_COLORS[s] ?? "var(--color-muted)",
      data: model.finYears
        .map((y) => ({ x: y, y: segMetricVal(model.rows, s, metric, basis, y) }))
        .filter((p): p is { x: number; y: number } => p.y != null),
    }))
    .filter((s) => s.data.length);

  return (
    <div className="border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
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

      <PillRow label="Financial metric" className="mb-3">
        {TREND_METRICS.map((m) => (
          <Pill key={m} selected={metric === m} onClick={() => setMetric(m)}>
            {SEG_METRICS[m].label}
          </Pill>
        ))}
      </PillRow>

      {series.length ? (
        <>
          <LineChart series={series} fmt={fmt} />
          <p className="text-muted mt-2 text-[12px]">
            {segDesc(metric, basis)} Shown {model.finYears[0]}→
            {String(model.finYears[model.finYears.length - 1]).slice(2)}.
          </p>
        </>
      ) : (
        <p className="text-muted p-6 text-center text-[13px]">
          Select a segment above to compare trends over time.
        </p>
      )}
    </div>
  );
}
