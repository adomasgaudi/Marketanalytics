"use client";

import { useEffect, useRef } from "react";
import { Seg } from "@/components/ui/seg";
import { cn } from "@/lib/cn";
import type { MarketModel } from "./types";
import { useViewMode } from "./ViewSync";
import {
  BASES,
  type Basis,
  MARKET_MODES,
  type MarketMode,
  useDashboardParams,
} from "./useDashboardParams";

const MARKET_LABELS: Record<MarketMode, string> = {
  avg: "Average / company",
  emp: "Per employee",
  whole: "Whole market",
};

const BASIS_LABELS: Record<Basis, string> = {
  total: "Full company",
  emp: "Per employee",
};

/**
 * Legacy .bottom-bar: the year row + basis toggle pinned to the viewport
 * bottom, always reachable while scrolling. One per page view.
 */
export function BottomBar({
  model,
  mode,
}: {
  model: MarketModel;
  /** "market" = avg/emp/whole toggle (Markets page); "company" = full/per-emp. */
  mode: "market" | "company";
}) {
  const [{ year, market, basis }, setParams] = useDashboardParams(model.last);
  // Legacy: the year row only makes sense per-year — all-years mode hides it.
  const [view] = useViewMode(mode === "market" ? "mkt" : "co");

  // Legacy syncBottomBarH: measure the bar (it can wrap to 2 rows on narrow
  // screens) and publish --bb-h, which .wrap uses as its bottom padding so
  // the footer is never hidden behind the fixed bar.
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const sync = () => root.style.setProperty("--bb-h", `${bar.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--bb-h");
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="border-line bg-panel fixed right-0 bottom-0 left-0 z-[400] border-t px-[max(24px,calc((100%-840px)/2))] py-[7px] shadow-[0_-1px_6px_rgba(0,0,0,.14)]"
    >
      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
        <div
          className={cn(
            "flex min-w-0 flex-1 basis-[200px] [scrollbar-width:none] gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden",
            view === "all" && "hidden",
          )}
        >
          {model.finYears.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setParams({ year: option })}
              className={cn(
                "border-line flex-none cursor-pointer rounded-md border px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                option === year
                  ? "border-accent bg-accent text-white"
                  : "bg-panel2 text-muted hover:text-ink",
              )}
            >
              {option}
            </button>
          ))}
        </div>

        {mode === "market" ? (
          <Seg
            label="Market basis"
            options={MARKET_MODES.map((m) => ({ value: m, label: MARKET_LABELS[m] }))}
            value={market}
            onChange={(m) => setParams({ market: m })}
            className="flex-none"
          />
        ) : (
          <Seg
            label="Company basis"
            options={BASES.map((b) => ({ value: b, label: BASIS_LABELS[b] }))}
            value={basis}
            onChange={(b) => setParams({ basis: b })}
            className="flex-none"
          />
        )}
      </div>
    </div>
  );
}
