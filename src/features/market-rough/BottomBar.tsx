"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Seg } from "@/components/ui/seg";
import { cn } from "@/lib/cn";
import { IconAverage, IconBuilding, IconMarket, IconPerson, IconSegments } from "./Icons";
import { segName } from "./segments";
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

/** Hover copy: what the icon *does*, one line, plainer than the short label
 *  that names it. Shown in a styled popup instead of the native tooltip. */
const MARKET_HINTS: Record<MarketMode, string> = {
  avg: "Divide the market by the number of companies in it",
  emp: "Divide the market by the total headcount",
  whole: "Sum every company — the market at full size",
};

const BASIS_HINTS: Record<Basis, string> = {
  total: "Company figures as reported, at full size",
  emp: "Company figures divided by its headcount",
};

/** Basis/market controls are icon-only in the bar; the words live on the data
 *  headings above. Tooltip + aria-label carry the meaning. */
const BASIS_ICONS: Record<Basis, ReactNode> = {
  total: <IconBuilding size={18} />,
  emp: <IconPerson size={18} />,
};
const MARKET_ICONS: Record<MarketMode, ReactNode> = {
  avg: <IconAverage size={18} />,
  emp: <IconPerson size={18} />,
  whole: <IconMarket size={18} />,
};

/** Carousel-dot treatment: only the selected year spells itself out, the rest
 *  shrink to a 2-digit tick. Full label lives in title/aria-label. */
function yearLabel(year: number, selected: number) {
  return year === selected ? String(year) : `'${String(year).slice(2)}`;
}

/** Instagram-carousel drag: press and pull the year track sideways with a
 *  mouse (touch already pans natively via overflow-x-auto). `moved` lets the
 *  year buttons ignore the click that ends a drag. */
function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  return {
    moved: () => drag.current.moved,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        drag.current = {
          down: true,
          startX: e.clientX,
          startLeft: ref.current.scrollLeft,
          moved: false,
        };
      },
      onPointerMove: (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d.down || !ref.current) return;
        const dx = e.clientX - d.startX;
        if (Math.abs(dx) > 4) d.moved = true;
        ref.current.scrollLeft = d.startLeft - dx;
      },
      onPointerUp: () => {
        drag.current.down = false;
      },
      onPointerLeave: () => {
        drag.current.down = false;
      },
    },
  };
}

/** Wheel over the year track / segment select steps through the options
 *  instead of scrolling the page. Trackpads fire many small deltas per flick,
 *  so accumulate and only step once a threshold is crossed. Attached via
 *  addEventListener because React's onWheel is passive — it can't
 *  preventDefault, which is what stops the page scrolling underneath. */
function useWheelStep(
  ref: React.RefObject<HTMLElement | null>,
  step: (dir: 1 | -1) => void,
) {
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Shift+wheel and horizontal trackpad swipes read as deltaX.
      acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      while (Math.abs(acc) >= 30) {
        stepRef.current(acc > 0 ? 1 : -1);
        acc -= acc > 0 ? 30 : -30;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);
}

/** Move `current` by `dir` inside `list`, clamped at both ends. */
function stepIn<T>(list: readonly T[], current: T, dir: 1 | -1): T {
  const i = list.indexOf(current);
  if (i < 0) return current;
  return list[Math.min(list.length - 1, Math.max(0, i + dir))] ?? current;
}

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
  const [{ year, market, basis, segment }, setParams] = useDashboardParams(model.last);
  const [view] = useViewMode(mode === "market" ? "mkt" : "co");

  // Legacy syncBottomBarH: measure the bar (it can wrap to 2 rows on narrow
  // screens) and publish --bb-h, which .wrap uses as its bottom padding so
  // the footer is never hidden behind the fixed bar.
  const barRef = useRef<HTMLDivElement>(null);
  // The basis/market control is icon-only, so confirm each pick in words for a
  // moment after it's made — otherwise the icons are a guessing game.
  const [flash, setFlash] = useState<string | null>(null);
  // Hover/focus explanation for the icon under the pointer. Takes the same
  // popup slot as the flash, and wins while the pointer is on a button.
  const [hint, setHint] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFlash = (label: string) => {
    setFlash(label);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1600);
  };
  useEffect(
    () => () => void (flashTimer.current && clearTimeout(flashTimer.current)),
    [],
  );
  // The year track is capped at a third of the bar and scrolls, so the active
  // year can sit off-screen. Centre it in the track whenever it changes —
  // scrolling the track directly rather than via scrollIntoView, which would
  // also scroll the page ancestors.
  const trackRef = useRef<HTMLDivElement>(null);
  const activeYearRef = useRef<HTMLButtonElement>(null);
  const dragScroll = useDragScroll(trackRef);
  // Wheel anywhere over the track picks the next/previous year; the centring
  // effect below then pulls it into view, so the track scrolls as a side effect.
  useWheelStep(trackRef, (dir) => setParams({ year: stepIn(model.finYears, year, dir) }));
  // Same gesture on the segment select. "" is the All-segments entry, so it
  // has to be part of the list the wheel walks.
  const segmentRef = useRef<HTMLSelectElement>(null);
  useWheelStep(segmentRef, (dir) =>
    setParams({ segment: stepIn(["", ...model.segments], segment ?? "", dir) || null }),
  );
  useEffect(() => {
    const track = trackRef.current;
    const pill = activeYearRef.current;
    if (!track || !pill) return;
    track.scrollTo({
      left: pill.offsetLeft - track.clientWidth / 2 + pill.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [year, view]);

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
      // Padding matches TopNav: folds in the content wrap's px-6 (840+48=792)
      // so the year pills line up with the page content's left edge.
      className="border-line bg-panel fixed right-0 bottom-0 left-0 z-[400] border-t px-[max(24px,calc((100%-792px)/2))] pt-2 pb-4 shadow-[0_-1px_6px_rgba(0,0,0,.14)] md:pt-2.5 md:pb-4"
    >
      {/* One line: abbreviated year ticks + icon-only basis leave room for the
          segment select, so nothing wraps to a second row. On desktop there is
          spare width, so the three groups spread across the bar. */}
      <div className="flex flex-nowrap items-center gap-x-2 sm:gap-x-4 md:gap-x-8">
        {/* The year row only makes sense per-year — all-years mode hides it.
            Elastic rather than a fixed fraction: the segment select and basis
            toggle are flex-none, so they claim their natural width first and
            the track takes whatever is left. That gives it noticeably more room
            on desktop, and on the company view (no segment select) most of the
            bar — while still never pushing them off the line. */}
        {/* `relative`, not a flex column: the bubbles are taken out of flow
            (below) so this box is exactly as tall as the year track. Otherwise
            the row's items-center would centre track+bubbles as a unit and the
            pills would sit higher than the segment select and basis icons. */}
        <div className={cn("relative min-w-0 flex-1", view === "all" && "hidden")}>
          <div
            ref={trackRef}
            {...dragScroll.handlers}
            // Ticks stay grouped at the left — spreading them across the free
            // width read as arbitrary. They just get roomier, not spaced apart.
            className="flex w-full min-w-0 [scrollbar-width:none] items-center gap-1 overflow-x-auto overscroll-x-contain select-none sm:gap-1.5 [&::-webkit-scrollbar]:hidden"
          >
            {model.finYears.map((option) => (
              <button
                key={option}
                type="button"
                // Abbreviated ticks still announce the full year.
                title={String(option)}
                aria-label={String(option)}
                ref={option === year ? activeYearRef : undefined}
                // A drag that ends over a pill must not also select that year.
                onClick={() => {
                  if (!dragScroll.moved()) setParams({ year: option });
                }}
                // bb-pill + data-on are styling hooks for the refined skin; they
                // have no effect while the skin is set to classic.
                data-on={option === year}
                // Carousel falloff: the selected year is full size, the
                // surrounding ticks shrink and fade back.
                className={cn(
                  "bb-pill border-line flex-none cursor-pointer rounded border font-semibold whitespace-nowrap transition-all",
                  option === year
                    ? "border-accent bg-accent px-2.5 py-0 text-[12px] leading-[22px] text-white md:px-3 md:text-[13px] md:leading-[28px]"
                    : "bg-panel2 text-muted hover:text-ink px-2 py-0 text-[10px] leading-[17px] opacity-70 hover:opacity-100 md:px-2.5 md:text-[11px] md:leading-[23px]",
                )}
              >
                {/* Abbreviated ticks only where width is scarce; from md the
                    bar has room for the full four digits. */}
                <span className="md:hidden">{yearLabel(option, year)}</span>
                <span className="hidden md:inline">{option}</span>
              </button>
            ))}
          </div>

          {/* Carousel bubbles: one dot per year so the count and the current
              position stay readable even when the track is scrolled. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-[calc(100%+3px)] flex items-center justify-center gap-[3px]"
          >
            {model.finYears.map((option) => (
              <span
                key={option}
                className={cn(
                  "h-[3px] rounded-full transition-all",
                  option === year ? "bg-accent w-2" : "bg-muted w-[3px] opacity-40",
                )}
              />
            ))}
          </div>
        </div>

        {/* Segment scope for the cash-flow panel. A <select> rather than a Seg:
            9 segments as joined buttons would be ~900px wide. */}
        {mode === "market" && (
          <div className="segment-select-wrap">
            <span className="segment-select-icon" aria-hidden>
              <IconSegments size={20} />
            </span>
            <select
              ref={segmentRef}
              aria-label="Segment scope"
              value={segment}
              onChange={(e) => {
                const next = e.target.value;
                setParams({ segment: next || null });
                showFlash(`Segment: ${next ? segName(next) : "All segments"}`);
              }}
              className="segment-select border-line bg-panel2 text-muted hover:text-ink max-w-[104px] flex-none cursor-pointer rounded border px-1.5 py-0.5 text-[11px] leading-5 font-semibold md:max-w-[180px] md:px-2.5 md:py-1 md:text-[12px] md:leading-6"
            >
              <option value="">All segments</option>
              {model.segments.map((s) => (
                <option key={s} value={s}>
                  {segName(s)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* The basis control can't shrink (nowrap labels, ~340px wide), so on a
            phone it used to stretch the flex line and push the year track off
            screen. Its own scroll box keeps the overflow local. */}
        <div className="relative max-w-full min-w-0 shrink [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {mode === "market" ? (
            <Seg
              label="Market basis"
              options={MARKET_MODES.map((m) => ({
                value: m,
                // Icon while width is scarce, full name once there's room.
                label: (
                  <>
                    <span className="md:hidden">{MARKET_ICONS[m]}</span>
                    <span className="hidden md:inline">{MARKET_LABELS[m]}</span>
                  </>
                ),
                title: MARKET_LABELS[m],
              }))}
              value={market}
              onChange={(m) => {
                setParams({ market: m });
                showFlash(`Now showing: ${MARKET_LABELS[m]}`);
              }}
              onHoverChange={(m) => setHint(m && MARKET_HINTS[m])}
              className="flex-none"
              btnClassName="px-3 py-2 text-[14px] leading-5 md:px-3.5 md:py-1 md:text-[12.5px] md:leading-[28px]"
            />
          ) : (
            <Seg
              label="Company basis"
              options={BASES.map((b) => ({
                value: b,
                label: (
                  <>
                    <span className="md:hidden">{BASIS_ICONS[b]}</span>
                    <span className="hidden md:inline">{BASIS_LABELS[b]}</span>
                  </>
                ),
                title: BASIS_LABELS[b],
              }))}
              value={basis}
              onChange={(b) => {
                setParams({ basis: b });
                showFlash(`Now showing: ${BASIS_LABELS[b]}`);
              }}
              onHoverChange={(b) => setHint(b && BASIS_HINTS[b])}
              className="flex-none"
              btnClassName="px-3 py-2 text-[14px] leading-5 md:px-3.5 md:py-1 md:text-[12.5px] md:leading-[28px]"
            />
          )}
        </div>
      </div>
      {/* Kept outside the horizontally scrolling control wrapper so it cannot
          be clipped on narrow phones. */}
      {(hint ?? flash) && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "border-line bg-panel pointer-events-none absolute right-3 bottom-[calc(100%+8px)] z-[420] max-w-[240px] rounded-md border px-2.5 py-1.5 text-[12px] shadow-[0_4px_16px_rgba(0,0,0,.22)]",
            hint ? "text-muted font-medium" : "text-ink font-semibold whitespace-nowrap",
          )}
        >
          {hint ?? flash}
        </div>
      )}
    </div>
  );
}
