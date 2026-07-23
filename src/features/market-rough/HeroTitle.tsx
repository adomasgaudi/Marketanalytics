"use client";

import { segName } from "./segments";
import { type MarketMode, useDashboardParams } from "./useDashboardParams";
import { ViewWord } from "./ViewSync";

/**
 * The Markets hero, written as a sentence describing exactly what the bottom
 * bar has on screen — segment, aggregation and period:
 *
 *   All markets in 2025
 *   PR market in 2022
 *   BTL average agency in 2025
 *   Market per employee, all years
 *
 * It used to name only the segment, so two very different pages — €372M of
 * whole market and €2.8M of average agency — carried the same heading. Anyone
 * screenshotting one has to be able to tell which they are looking at.
 */
const subject = (mode: MarketMode, segment: string) => {
  const seg = segment ? segName(segment) : "";
  if (mode === "avg") return seg ? `${seg} average agency` : "Average agency";
  if (mode === "emp") return seg ? `${seg} per employee` : "Market per employee";
  return seg ? `${seg} market` : "All markets";
};

export function HeroTitle({ defaultYear }: { defaultYear: number }) {
  const [{ segment, market, year }] = useDashboardParams(defaultYear);
  return (
    <h1 className="text-[clamp(42px,9vw,72px)] leading-[0.95] font-extrabold tracking-[-0.035em]">
      {subject(market, segment)}{" "}
      {/* Still the per-year / all-years toggle — it just names the year it is
          showing rather than the abstract "per year". */}
      <ViewWord scope="mkt" yearLabel={`in ${year}`} />
    </h1>
  );
}
