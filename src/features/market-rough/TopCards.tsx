"use client";

import type { MarketModel } from "./types";
import { segName } from "./segments";
import { useDashboardParams } from "./useDashboardParams";

/**
 * Where the figures come from since the data2 rebuild. Four channels, not
 * three names: two of these ARE Registrų centras, and which channel a figure
 * arrived through is the thing that explains why one has FY2025 and the other
 * does not — the portal mirror trails the registry's own dump by months.
 *
 * The original spreadsheet is deliberately absent — since the rebuild it is
 * only a comparison behind the nav's data toggle. So is rekvizitai.lt: it
 * resells these same filings and, once the registry's own dump was wired in,
 * contributed no figure the other channels did not already have.
 */
const SOURCES = [
  {
    label: "Registrų centras",
    cube: "bg-green",
    title: "Annual filings — turnover, profit before and after tax. Taken from the registry's own daily dump, which carries FY2025.",
  },
  {
    label: "Sodra",
    cube: "bg-amber",
    title: "Monthly insured headcount and gross pay, per company. The payroll is summed month by month from these.",
  },
  {
    label: "data.gov.lt",
    cube: "bg-accent",
    title: "The open-data mirror of Registrų centras, plus VMI's paid-tax record. Months behind the registry's own feed.",
  },
] as const;

/** The two cards under the hero: tracked-company count and the data sources. */
export function TopCards({ model }: { model: MarketModel }) {
  // Same segment scope the bottom bar applies to every figure below: with one
  // segment picked the headline counts only the companies inside it.
  const [{ segment }] = useDashboardParams(0);
  const count = segment
    ? new Set(
        model.rows
          .filter((row) => row.activities.includes(segment))
          .map((row) => row.brand),
      ).size
    : model.brands.length;

  return (
    // Borderless stat band rather than two boxes — the count carries the drama,
    // the sources sit under it as quiet chips.
    <div className="mt-7 mb-20 flex flex-wrap items-end gap-x-10 gap-y-5 md:mb-28">
      <div>
        <div className="text-muted text-[11px] font-semibold tracking-[.18em] uppercase">
          Companies tracked
        </div>
        <div className="mt-1 flex items-baseline gap-2.5">
          <span className="text-[clamp(40px,7vw,58px)] leading-[0.9] font-extrabold tracking-[-0.04em] tabular-nums">
            {count}
          </span>
          <span className="text-muted text-[13px]">
            {segment
              ? `in ${segName(segment)}`
              : `across ${model.segments.length} service segments`}
          </span>
        </div>
      </div>
      <div className="pb-1.5">
        <div className="text-muted mb-2 text-[11px] font-semibold tracking-[.18em] uppercase">
          Data sources
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((source) => (
            <span
              key={source.label}
              title={source.title}
              className="border-line bg-panel flex cursor-help items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-[12.5px] font-medium"
            >
              <span
                className={`inline-block h-2 w-2 flex-none rounded-full ${source.cube}`}
              />
              {source.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
