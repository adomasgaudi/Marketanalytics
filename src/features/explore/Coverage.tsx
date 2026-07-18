"use client";

import { useState } from "react";
import type { CompanyYear, MarketModel } from "../market-rough/types";

// Data-coverage matrix: one square per company×year, coloured by how many of the
// 7 core metrics (employees, avgSalary, salaryCosts, revenue, profit,
// nonSalaryCosts, estimatedIncome) that company-year record carries.
// Missing record = "No data".
const COV_FIELDS = [
  "employees",
  "avgSalary",
  "salaryCosts",
  "revenue",
  "profit",
  "nonSalaryCosts",
  "estimatedIncome",
] as const;

function covInfo(rec: CompanyYear | undefined) {
  if (!rec) return { cls: "cov-0", lbl: "No data", n: 0 };
  const n = COV_FIELDS.reduce((a, f) => a + (rec[f] != null ? 1 : 0), 0);
  if (n >= 7) return { cls: "cov-f", lbl: "Full — all 7 metrics", n };
  if (n >= 3) return { cls: "cov-h", lbl: `Partial — ${n}/7 metrics`, n };
  if (n >= 1) return { cls: "cov-p", lbl: `Headcount/pay only — ${n}/7 metrics`, n };
  return { cls: "cov-0", lbl: "No data", n: 0 };
}

// 15px legend/cell square, tinted per coverage class (legacy .csq / .cov-*).
function Csq({ cls }: { cls: string }) {
  const tint =
    cls === "cov-f"
      ? "bg-green"
      : cls === "cov-h"
        ? "bg-green opacity-50"
        : cls === "cov-p"
          ? "bg-amber"
          : "border-line border border-dashed bg-transparent opacity-70";
  return (
    <span
      className={`inline-block h-[15px] w-[15px] shrink-0 rounded-[3px] align-middle ${tint}`}
    />
  );
}

export function Coverage({ model }: { model: MarketModel }) {
  const [query, setQuery] = useState("");
  const { byBrand, brands, years } = model;

  // Headline stat over ALL companies (not the filter).
  let have = 0;
  const total = brands.length * years.length;
  brands.forEach((b) =>
    years.forEach((y) => {
      if (covInfo(byBrand[b]?.[y]).n > 0) have++;
    }),
  );

  const q = query.trim().toLowerCase();
  const shown = brands
    .slice()
    .sort((a, b) => a.localeCompare(b, "lt"))
    .filter((b) => !q || b.toLowerCase().includes(q));

  return (
    <details
      className="border-line bg-panel group mb-4 overflow-hidden rounded-[10px] border"
      open
    >
      <summary className="text-ink flex cursor-pointer list-none flex-wrap items-center gap-2 px-3.5 py-[11px] text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="text-muted inline-block transition-transform group-open:rotate-90">
          ▸
        </span>
        📊 Data coverage by year
        <span className="text-muted text-[12px] font-normal">
          · {have} of {total} company-years have data ({total - have} missing)
        </span>
      </summary>
      <div className="px-3.5 pt-0.5 pb-3.5">
        <div className="mt-1 mb-3 flex flex-wrap items-center gap-3.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter companies…"
            autoComplete="off"
            className="border-line bg-panel2 text-ink min-w-[170px] rounded-lg border px-3 py-1.5 text-[13px]"
          />
          <span className="text-muted flex flex-wrap items-center gap-3.5 text-[12px]">
            <span className="inline-flex items-center gap-[5px]">
              <Csq cls="cov-f" />
              Full
            </span>
            <span className="inline-flex items-center gap-[5px]">
              <Csq cls="cov-h" />
              Partial
            </span>
            <span className="inline-flex items-center gap-[5px]">
              <Csq cls="cov-p" />
              Headcount/pay only
            </span>
            <span className="inline-flex items-center gap-[5px]">
              <Csq cls="cov-0" />
              No data
            </span>
          </span>
        </div>
        <div className="border-line max-h-[88vh] overflow-auto rounded-lg border">
          <div
            className="grid min-w-[380px] text-[12px]"
            style={{
              gridTemplateColumns: `minmax(130px,1.5fr) repeat(${years.length},minmax(28px,1fr))`,
            }}
          >
            <div className="border-line bg-panel2 text-muted sticky top-0 left-0 z-[3] flex items-center border-b-2 px-1.5 py-[5px] text-[11px] font-semibold">
              Company
            </div>
            {years.map((y) => (
              <div
                key={y}
                className="border-line bg-panel2 text-muted sticky top-0 z-[2] flex items-center justify-center border-b-2 px-1.5 py-[5px] text-[11px] font-semibold"
              >
                {y}
              </div>
            ))}
            {shown.map((b) => (
              // Fragment per company row: sticky name cell + one square per year.
              <div key={b} className="contents">
                <div
                  className="border-line bg-panel text-ink sticky left-0 z-[1] flex items-center overflow-hidden border-b px-1.5 py-[5px] font-semibold text-ellipsis whitespace-nowrap"
                  title={b}
                >
                  {b}
                </div>
                {years.map((y) => {
                  const info = covInfo(byBrand[b]?.[y]);
                  return (
                    <div
                      key={y}
                      className="border-line flex items-center justify-center border-b px-1.5 py-[5px]"
                      title={`${b} · ${y} — ${info.lbl}`}
                    >
                      <Csq cls={info.cls} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
