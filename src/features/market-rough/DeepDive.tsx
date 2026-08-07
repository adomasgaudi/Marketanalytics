"use client";

import { useState } from "react";
import { Pill, PillRow } from "@/components/ui/pills";
import { fmtEur, fmtEurFull, fmtInt } from "./format";
import { LineChart } from "./LineChart";
import { defaultBrand } from "./metrics";
import type { CompanyYear, MarketModel } from "./types";
import { useSourcedModel } from "./rebuilt-source";
import { useCompareColors } from "./useSegColors";
import { brandSegments } from "./segments";
import { useDashboardParams } from "./useDashboardParams";
import { useVisibleYears } from "./years";

const DD_METRICS: {
  key: string;
  label: string;
  title: string;
  f: (r: CompanyYear) => number | null;
  fmt: (v: number) => string;
}[] = [
  {
    key: "ddRev",
    label: "Revenue",
    title: "Revenue / sales over time",
    f: (r) => r.estimatedIncome,
    fmt: fmtEur,
  },
  {
    key: "ddTurnover",
    label: "Turnover",
    title: "Turnover over time",
    f: (r) => r.revenue,
    fmt: fmtEur,
  },
  {
    key: "ddProfit",
    label: "Net profit",
    title: "Net profit over time",
    f: (r) => r.profit,
    fmt: fmtEur,
  },
  {
    key: "ddEmp",
    label: "Headcount",
    title: "Headcount over time",
    f: (r) => r.employees,
    fmt: fmtInt,
  },
  {
    key: "ddWage",
    label: "Avg salary",
    title: "Average monthly salary over time",
    f: (r) => ((r.avgSalary ?? 0) > 500 ? r.avgSalary : null),
    fmt: fmtEurFull,
  },
  {
    key: "ddWages",
    label: "Wages",
    title: "Total wage costs over time",
    f: (r) => r.salaryCosts,
    fmt: fmtEur,
  },
];

/** Company deep-dive: one metric across every year for the selected company.
    Lives inside the all-time panel as "Compare financials" (legacy fold). */
export function DeepDive({
  model: legacyModel,
  title,
}: {
  model: MarketModel;
  title?: string;
}) {
  const model = useSourcedModel(legacyModel);
  const [{ companies, off }] = useDashboardParams();
  const visibleYears = useVisibleYears(model.years);
  const [metricKey, setMetricKey] = useState("ddRev");

  // Every company in the compare pool (minus the toggled-off ones) gets a
  // line — "Compare financials" was plotting only the first selection.
  const pool = companies.filter((b) => !off.includes(b));
  const brands = pool.length ? pool : [defaultBrand(model)];
  // Segment-meaningful colours, identical to the compare pills above.
  const colors = useCompareColors(brandSegments(model))(brands);
  const metric = DD_METRICS.find((m) => m.key === metricKey) ?? DD_METRICS[0];

  const series = brands
    .map((brand) => ({
      label: brand,
      color: brands.length === 1 ? "var(--color-accent)" : colors[brand],
      data: visibleYears
        .map((y) => ({
          x: y,
          y: metric.f(model.byBrand[brand]?.[y] ?? ({} as CompanyYear)),
        }))
        .filter((p): p is { x: number; y: number } => p.y != null),
    }))
    .filter((s) => s.data.length);

  return (
    <section id="deepdive" className="mb-7">
      <h2 className="mt-7 mb-3.5 text-[18px] font-bold">
        {title ?? "Company deep-dive"}
      </h2>
      <div className="card border-line bg-panel min-w-0 rounded-xl border p-[18px]">
        <PillRow label="Deep-dive metric" className="mb-2">
          {DD_METRICS.map((m) => (
            <Pill
              key={m.key}
              selected={metricKey === m.key}
              onClick={() => setMetricKey(m.key)}
            >
              {m.label}
            </Pill>
          ))}
        </PillRow>
        <h3 className="mb-2 text-[15px] font-semibold">
          {brands.length === 1 ? `${brands[0]} — ` : ""}
          {metric.title}
        </h3>
        {series.length ? (
          <LineChart series={series} fmt={metric.fmt} />
        ) : (
          <p className="text-muted p-6 text-center text-[13px]">
            No {metric.label.toLowerCase()} data for {brands.join(", ")}.
          </p>
        )}
      </div>
    </section>
  );
}
