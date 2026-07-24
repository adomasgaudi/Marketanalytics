"use client";

import { segName } from "./segments";
import {
  MARKET_MODES,
  type MarketMode,
  useDashboardParams,
} from "./useDashboardParams";
import { ViewWord } from "./ViewSync";

/**
 * What is on screen, split into three fixed lines: WHAT is being measured,
 * HOW it is aggregated, and WHEN. Fixed because a single sentence changed
 * length as the controls moved ("PR" -> "Average company across 9 segments"),
 * wrapped at some widths and not others, and the whole hero jumped a line
 * every time you stepped a segment.
 *
 * The scope line is also honest about the dataset: "All markets" claimed the
 * economy, when this is nine tracked service segments.
 */
const scopeLine = (segment: string, segments: number) =>
  segment ? segName(segment) : `All ${segments} segments`;

/** The aggregation, named the same way the bottom bar's control names it. */
const lensLine = (mode: MarketMode, segment: string) => {
  if (mode === "avg") return "average company";
  if (mode === "emp") return "per employee";
  return segment ? "whole segment" : "whole market";
};

/**
 * The lens word, clickable: it cycles whole -> average company -> per employee,
 * the same three the bottom bar offers. The year beside it was already a
 * toggle, so a reader who discovers one expects the other to work — and both
 * are the sentence describing the page, which is the natural place to change it.
 */
function LensWord({ mode, segment }: { mode: MarketMode; segment: string }) {
  const [, setParams] = useDashboardParams(0);
  const next = () =>
    setParams({
      market: MARKET_MODES[(MARKET_MODES.indexOf(mode) + 1) % MARKET_MODES.length],
    });
  return (
    <span
      role="button"
      tabIndex={0}
      title="Tap to cycle whole / average company / per employee"
      aria-label={`Aggregation: ${lensLine(mode, segment)}. Tap to change.`}
      onClick={next}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && next()}
      className="text-accent focus-visible:outline-accent cursor-pointer whitespace-nowrap underline decoration-dotted underline-offset-[5px] transition-colors duration-150 select-none hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {lensLine(mode, segment)}
    </span>
  );
}

export function HeroTitle({
  defaultYear,
  segments,
}: {
  defaultYear: number;
  /** How many service segments the dataset actually covers. */
  segments: number;
}) {
  const [{ segment, market, year }] = useDashboardParams(defaultYear);
  return (
    <h1 className="leading-[0.95] font-extrabold tracking-[-0.035em]">
      {/* Subject leads, year underneath. Two fixed lines either way, so the
          hero keeps its height however long the subject gets — that was the
          point of splitting them. The year line is still the per-year /
          all-years toggle. */}
      <span className="block text-[clamp(42px,9vw,72px)]">
        {scopeLine(segment, segments)}
      </span>
      <span className="text-muted mt-3 block text-[clamp(24px,4.5vw,40px)] leading-none">
        <LensWord mode={market} segment={segment} />,{" "}
        <ViewWord scope="mkt" yearLabel={`in ${year}`} />
      </span>
    </h1>
  );
}
