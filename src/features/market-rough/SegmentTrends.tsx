"use client";

import { useState } from "react";
import { Pill, PillRow } from "@/components/ui/pills";
import { fmtEur, fmtInt } from "./format";
import { LineChart } from "./LineChart";
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
  const [segs, setSegs] = useState<Set<string>>(
    () => new Set(model.segments.slice(0, 3)),
  );

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

      <PillRow label="Segments" className="mb-2">
        {model.segments.map((s) => (
          <Pill
            key={s}
            selected={segs.has(s)}
            onClick={() =>
              setSegs((old) => {
                const next = new Set(old);
                if (next.has(s)) next.delete(s);
                else next.add(s);
                return next;
              })
            }
          >
            {segName(s)}
          </Pill>
        ))}
      </PillRow>

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
            {segDesc(metric, basis)} Basis: {basisWord(basis)}.
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
