"use client";

import {
  Chart,
  Legend,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { useMemo } from "react";
import { Bubble } from "react-chartjs-2";
import { fmtM } from "./format";
import { SEG_COLORS, segName } from "./segments";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

Chart.register(PointElement, LinearScale, LogarithmicScale, Tooltip, Legend);

/** The gold-highlighted "my company" — as in the legacy MY_COMPANIES. */
const MY_BRAND = "Fabula";

type Dot = {
  x: number;
  y: number;
  r: number;
  brand: string;
  emp: number;
  seg: string;
};

const cssVar = (name: string) =>
  typeof document === "undefined"
    ? ""
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Size vs profitability: one bubble per company, revenue × margin, r = headcount. */
export function ScatterChart({ model }: { model: MarketModel }) {
  const [{ year, market }] = useDashboardParams(model.last);
  const perEmp = market === "emp";

  const rows: Dot[] = useMemo(
    () =>
      model.rows
        .filter(
          (d) =>
            d.year === year &&
            (d.estimatedIncome ?? 0) > 50_000 &&
            d.profit != null &&
            (d.employees ?? 0) > 0,
        )
        .map((d) => ({
          x: perEmp
            ? (d.estimatedIncome as number) / (d.employees as number)
            : (d.estimatedIncome as number),
          y: ((d.profit as number) / (d.estimatedIncome as number)) * 100,
          r: Math.max(4, Math.sqrt(d.employees as number) * 2.2),
          brand: d.brand,
          emp: d.employees as number,
          seg: d.activities[0] ?? "Other",
        })),
    [model.rows, year, perEmp],
  );

  // Top-5 segments by whole-market revenue in the latest year, as the legacy.
  const topSegs = useMemo(() => {
    const sums: Record<string, number> = {};
    model.rows.forEach((d) => {
      if (d.year === model.last && d.estimatedIncome)
        d.activities.forEach((a) => (sums[a] = (sums[a] ?? 0) + d.estimatedIncome!));
    });
    return Object.entries(sums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s]) => s);
  }, [model]);

  if (!rows.length) {
    return (
      <section className="card border-line bg-panel mb-4 rounded-xl border p-[18px]">
        <h2 className="mb-1 text-[15px] font-semibold">Size vs profitability ({year})</h2>
        <p className="text-muted p-6 text-center text-[13px]">No data for {year}.</p>
      </section>
    );
  }

  const ink = cssVar("--color-ink");
  const grid = cssVar("--color-grid");

  const datasets = topSegs
    .concat(["Other"])
    .map((s) => ({
      label: segName(s),
      data: rows.filter(
        (r) =>
          r.brand !== MY_BRAND &&
          (s === "Other" ? !topSegs.includes(r.seg) : r.seg === s),
      ),
      backgroundColor: `${SEG_COLORS[s] ?? "#888"}99`,
      borderColor: SEG_COLORS[s] ?? "#888",
      borderWidth: 1,
    }))
    .concat([
      {
        label: "★ Fabula (you)",
        data: rows
          .filter((r) => r.brand === MY_BRAND)
          .map((r) => ({ ...r, r: Math.max(r.r, 9) })),
        backgroundColor: "rgba(244,197,66,.95)",
        borderColor: ink,
        borderWidth: 2,
      },
    ]);

  return (
    <section className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h2 className="mb-1 text-[15px] font-semibold">
        Size vs profitability ({year}
        {perEmp ? " · per employee" : ""})
      </h2>
      <div className="chartbox tall relative h-[520px]">
        <span className="text-muted absolute top-0 left-0 z-1 text-[10px] opacity-60">
          Chart.js
        </span>
        <Bubble
          data={{ datasets }}
          options={
            {
              maintainAspectRatio: false,
              animation: false,
              responsive: true,
              plugins: {
                legend: { labels: { color: ink } },
                tooltip: {
                  titleColor: ink,
                  bodyColor: ink,
                  backgroundColor: cssVar("--color-panel"),
                  borderColor: cssVar("--color-line"),
                  borderWidth: 1,
                  callbacks: {
                    label: (c: { raw: Dot }) => {
                      const p = c.raw;
                      return ` ${p.brand}: €${fmtM(p.x)} ${perEmp ? "rev/emp" : "rev"}, ${p.y.toFixed(1)}% margin, ${p.emp} empl.`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  type: "logarithmic" as const,
                  title: {
                    display: true,
                    text: perEmp ? "Revenue / employee (€, log)" : "Revenue (€, log)",
                    color: ink,
                  },
                  grid: { color: grid },
                  ticks: {
                    color: ink,
                    callback: (v: number) =>
                      [
                        1e4, 2e4, 3e4, 5e4, 1e5, 2e5, 3e5, 5e5, 1e6, 3e6, 1e7, 3e7,
                      ].includes(v)
                        ? `€${fmtM(v)}`
                        : "",
                  },
                },
                y: {
                  title: {
                    display: true,
                    text: "Net profit margin % (from revenue)",
                    color: ink,
                  },
                  grid: { color: grid },
                  suggestedMin: -30,
                  suggestedMax: 45,
                  ticks: { color: ink },
                },
              },
            } as never
          }
        />
      </div>
    </section>
  );
}
