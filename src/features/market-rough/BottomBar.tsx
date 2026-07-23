"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Seg } from "@/components/ui/seg";
import { cn } from "@/lib/cn";
import { IconAverage, IconBuilding, IconMarket, IconPerson, IconSegments } from "./Icons";
import { segName } from "./segments";
import type { MarketModel } from "./types";
import { useSegColors } from "./useSegColors";
import { useViewMode } from "./ViewSync";
import {
  BASES,
  type Basis,
  MARKET_MODES,
  type MarketMode,
  useDashboardParams,
} from "./useDashboardParams";

/**
 * The three labels read as one series — "/ company", "/ employee", "whole X" —
 * so the control shows at a glance that the first two DIVIDE the third. The
 * whole-market label carries the active segment, because "whole market" while
 * scoped to PR is a lie about what is being summed.
 */
const MARKET_LABELS: Record<MarketMode, string> = {
  whole: "Whole",
  avg: "/ company",
  emp: "/ employee",
};

/** Second line, shown only under "Whole": which market is being summed. */
const wholeSubLabel = (segment: string) => (segment ? segName(segment) : "market");

/** Compact mobile identity for the active segment button. */
const segmentCode = (segment: string) => {
  if (!segment) return "ALL";
  const words = segName(segment).match(/[\p{L}\d]+/gu) ?? [];
  return words.length > 1
    ? words
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
    : (words[0]?.slice(0, 2).toUpperCase() ?? "--");
};

const BASIS_LABELS: Record<Basis, string> = {
  total: "Full company",
  emp: "Per employee",
};

/** Hover copy: what the icon *does*, one line, plainer than the short label
 *  that names it. Shown in a styled popup instead of the native tooltip. */
const marketHints = (segment: string): Record<MarketMode, string> => {
  const what = segment ? `${segName(segment)} segment` : "market";
  return {
    avg: `Divide the ${what} by the number of companies in it`,
    emp: `Divide the ${what} by its total headcount`,
    whole: `Sum every company — the ${what} at full size`,
  };
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

/**
 * Arrow keys anywhere on the page drive the bottom bar: ←/→ steps the year,
 * ↑/↓ steps the segment. Bound to the window rather than the bar because the
 * bar is a fixed overlay nobody focuses — the point is to scrub the dashboard
 * while reading the charts. Typing fields and modifier chords are left alone,
 * as are the browser's own shortcuts.
 */
function useArrowKeys(step: (key: string) => void) {
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(el?.tagName ?? "")
      )
        return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      // Only now claim the key — ↑/↓ would otherwise stop scrolling the page.
      e.preventDefault();
      stepRef.current(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * How much of each control's name to spell out, from the room the bar has.
 * Three tiers with two breakpoints, matching what the user asked for:
 *   icon  — glyph / segment code only (phones with the year track present)
 *   short — one-line names ("Whole", "/ company", "Full company")
 *   full  — the two-line market labels that carry the segment sub-line
 * Per-year keeps the old viewport cutoff (icon <768, full ≥768) so that view
 * is untouched; all-years — where the year track is hidden and the whole bar
 * is free — is the one that grows its labels to fill the space it now has.
 */
type Density = "icon" | "short" | "full";
function barDensity(width: number, allYears: boolean): Density {
  if (!allYears) return width >= 768 ? "full" : "icon";
  if (width >= 560) return "full";
  if (width >= 380) return "short";
  return "icon";
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
  // Same live palette the doughnut uses (theme × harmony/spectral), so the
  // picker's colours ARE the slice colours — the trigger and each option read
  // as the segment they select. "All segments" has no single hue, so it stays
  // neutral.
  const SEG_COLORS = useSegColors();
  // Hints follow the segment scope; the LABELS are fixed-width so switching
  // segment can never resize the control.
  const MARKET_HINTS = marketHints(segment);

  // Which years the CURRENT scope actually has figures for. The track always
  // renders every year either way — a year that vanishes takes the ticks
  // either side of it with it, and the whole bar jumps under the cursor. An
  // unavailable year stays exactly where it was, greyed and inert.
  const yearsWithData = new Set(
    model.rows
      .filter((row) => !segment || row.activities.includes(segment))
      .filter((row) => row.revenue != null || row.estimatedIncome != null)
      .map((row) => row.year),
  );
  const [view] = useViewMode(mode === "market" ? "mkt" : "co");

  // Legacy syncBottomBarH: measure the bar (it can wrap to 2 rows on narrow
  // screens) and publish --bb-h, which .wrap uses as its bottom padding so
  // the footer is never hidden behind the fixed bar.
  const barRef = useRef<HTMLDivElement>(null);
  // Width drives how full the control labels get (see barDensity). Measured, not
  // guessed from the viewport, so the all-years view — which frees the whole bar
  // by hiding the year track — actually uses the room it gains.
  const [barW, setBarW] = useState(0);
  const density = barDensity(barW, view === "all");
  // Roomier tap target while the buttons are icon-only; tighter once they carry
  // words, so a full row of names still fits the line.
  const segBtnClass =
    density === "icon"
      ? "px-3 py-2 text-[14px] leading-5"
      : "px-3.5 py-1 text-[12.5px] leading-[28px]";
  // The basis/market control is icon-only, so confirm each pick in words for a
  // moment after it's made — otherwise the icons are a guessing game.
  const [flash, setFlash] = useState<string | null>(null);
  const [segmentOpen, setSegmentOpen] = useState(false);
  // Hover/focus explanation for the icon under the pointer. Takes the same
  // popup slot as the flash, and wins while the pointer is on a button.
  const [hint, setHint] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentDrag = useRef({ active: false, startX: 0, moved: false });
  const showFlash = (label: string) => {
    setFlash(label);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1600);
  };
  const selectSegment = (next: string) => {
    setParams({ segment: next || null });
    setSegmentOpen(false);
    showFlash(`Segment: ${next ? segName(next) : "All segments"}`);
  };
  const dragSegment = {
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      segmentDrag.current = { active: true, startX: event.clientX, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (Math.abs(event.clientX - segmentDrag.current.startX) > 24)
        segmentDrag.current.moved = true;
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = segmentDrag.current;
      drag.active = false;
      if (!drag.moved) return;
      selectSegment(
        stepIn(
          ["", ...model.segments],
          segment ?? "",
          event.clientX < drag.startX ? 1 : -1,
        ),
      );
    },
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
  const touchYearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragScroll = useDragScroll(trackRef);
  // Touch scrolling is a carousel gesture: once it settles, select the enabled
  // pill nearest the track's centre. Desktop keeps its drag/click behaviour.
  const settleTouchYear = () => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    if (touchYearTimer.current) clearTimeout(touchYearTimer.current);
    touchYearTimer.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      const centre = track.getBoundingClientRect().left + track.clientWidth / 2;
      const nearest = [...track.querySelectorAll<HTMLButtonElement>("[data-year]")]
        .filter((button) => !button.disabled)
        .sort(
          (a, b) =>
            Math.abs(a.getBoundingClientRect().left + a.offsetWidth / 2 - centre) -
            Math.abs(b.getBoundingClientRect().left + b.offsetWidth / 2 - centre),
        )[0];
      const next = Number(nearest?.dataset.year);
      if (Number.isFinite(next) && next !== year) setParams({ year: next });
    }, 120);
  };
  // Wheel anywhere over the track picks the next/previous year; the centring
  // effect below then pulls it into view, so the track scrolls as a side effect.
  useWheelStep(trackRef, (dir) => setParams({ year: stepIn(model.finYears, year, dir) }));
  // Same gesture on the segment picker. "" is the All-segments entry, so it
  // has to be part of the list the wheel walks.
  const segmentRef = useRef<HTMLDivElement>(null);
  useWheelStep(segmentRef, (dir) =>
    selectSegment(stepIn(["", ...model.segments], segment ?? "", dir)),
  );
  // Keyboard mirror of the two wheel gestures. ←/→ only while the year track is
  // actually on screen (the all-years view hides it), ↑/↓ only on the Markets
  // page, which is the one that carries a segment picker.
  useArrowKeys((key) => {
    if (key === "ArrowLeft" || key === "ArrowRight") {
      if (view === "all") return;
      setParams({ year: stepIn(model.finYears, year, key === "ArrowRight" ? 1 : -1) });
    } else if (mode === "market") {
      selectSegment(
        stepIn(["", ...model.segments], segment ?? "", key === "ArrowDown" ? 1 : -1),
      );
    }
  });

  useEffect(() => {
    const track = trackRef.current;
    const pill = activeYearRef.current;
    if (!track || !pill) return;
    track.scrollTo({
      left: pill.offsetLeft - track.clientWidth / 2 + pill.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [year, view]);

  useEffect(
    () => () => void (touchYearTimer.current && clearTimeout(touchYearTimer.current)),
    [],
  );

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const sync = () => {
      root.style.setProperty("--bb-h", `${bar.offsetHeight}px`);
      setBarW(bar.clientWidth);
    };
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
            onScroll={settleTouchYear}
            // Ticks stay grouped at the left — spreading them across the free
            // width read as arbitrary. They just get roomier, not spaced apart.
            className="flex w-full min-w-0 snap-x snap-mandatory [scrollbar-width:none] items-center gap-1 overflow-x-auto overscroll-x-contain select-none sm:gap-1.5 [&::-webkit-scrollbar]:hidden"
          >
            {model.finYears.map((option) => (
              <button
                key={option}
                type="button"
                // Abbreviated ticks still announce the full year.
                title={
                  yearsWithData.has(option)
                    ? String(option)
                    : `${option} — no ${segment ? segName(segment) + " " : ""}figures filed`
                }
                aria-label={String(option)}
                data-year={option}
                ref={option === year ? activeYearRef : undefined}
                disabled={!yearsWithData.has(option) && option !== year}
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
                  "bb-pill border-line flex-none cursor-pointer snap-center rounded border font-semibold whitespace-nowrap transition-all",
                  option === year
                    ? "border-accent bg-accent px-2.5 py-0 text-[12px] leading-[22px] text-white md:px-3 md:text-[13px] md:leading-[28px]"
                    : yearsWithData.has(option)
                      ? "bg-panel2 text-muted hover:text-ink px-2 py-0 text-[10px] leading-[17px] opacity-70 hover:opacity-100 md:px-2.5 md:text-[11px] md:leading-[23px]"
                      : // No figures in this scope: same box, same place, just
                        // visibly not a thing you can pick.
                        "bg-panel2 text-muted px-2 py-0 text-[10px] leading-[17px] opacity-30 md:px-2.5 md:text-[11px] md:leading-[23px]",
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
          <div
            ref={segmentRef}
            className="segment-picker"
            data-density={density === "icon" ? "compact" : "expanded"}
          >
            <button
              type="button"
              aria-label="Segment scope"
              aria-expanded={segmentOpen}
              aria-haspopup="listbox"
              className="segment-picker-trigger"
              // Active segment paints the whole trigger — border, icon (it
              // draws in currentColor) and label. Inline so it also wins over
              // the CSS hover/expanded accent while a segment is scoped.
              style={
                segment && SEG_COLORS[segment]
                  ? { borderColor: SEG_COLORS[segment], color: SEG_COLORS[segment] }
                  : undefined
              }
              {...dragSegment}
              onClick={() => {
                if (!segmentDrag.current.moved) setSegmentOpen((open) => !open);
              }}
            >
              {density === "icon" ? (
                <span className="font-bold tracking-[.08em]">{segmentCode(segment)}</span>
              ) : (
                <IconSegments size={20} />
              )}
              <span className="segment-picker-label">
                {segment ? segName(segment) : "All segments"}
              </span>
            </button>
            {segmentOpen && (
              <div
                className="segment-picker-menu"
                role="listbox"
                aria-label="Segment scope"
              >
                {["", ...model.segments].map((option) => {
                  const color = option ? SEG_COLORS[option] : null;
                  return (
                    <button
                      key={option || "all"}
                      type="button"
                      role="option"
                      aria-selected={(segment ?? "") === option}
                      className="segment-picker-option"
                      data-on={(segment ?? "") === option}
                      // Text takes the segment's hue; the leading dot repeats it
                      // as a swatch so the row matches its slice at a glance.
                      style={color ? { color } : undefined}
                      onClick={() => selectSegment(option)}
                    >
                      <span
                        className="segment-picker-dot"
                        style={{ background: color ?? "var(--color-line)" }}
                      />
                      {option ? segName(option) : "All segments"}
                    </button>
                  );
                })}
              </div>
            )}
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
                // Icon while width is scarce, a one-line name when there's some
                // room, the two-line label with its segment sub-line once full.
                label:
                  density === "icon" ? (
                    MARKET_ICONS[m]
                  ) : density === "short" ? (
                    <span className="whitespace-nowrap">{MARKET_LABELS[m]}</span>
                  ) : (
                    // Fixed width: the segment name lives on a second line, so
                    // a scope change from "market" to "Digital media" cannot
                    // stretch the button and shuffle the whole bar.
                    <span className="inline-flex w-[72px] flex-col leading-[1.15]">
                      <span>{MARKET_LABELS[m]}</span>
                      <span
                        className={cn(
                          "truncate text-[10px] font-bold",
                          m === market ? "text-white/70" : "text-muted",
                        )}
                      >
                        {m === "whole" ? wholeSubLabel(segment) : " "}
                      </span>
                    </span>
                  ),
                title:
                  m === "whole" ? `Whole ${wholeSubLabel(segment)}` : MARKET_LABELS[m],
              }))}
              value={market}
              onChange={(m) => {
                setParams({ market: m });
                showFlash(`Now showing: ${MARKET_LABELS[m]}`);
              }}
              onHoverChange={(m) => setHint(m && MARKET_HINTS[m])}
              className="flex-none"
              btnClassName={segBtnClass}
            />
          ) : (
            <Seg
              label="Company basis"
              options={BASES.map((b) => ({
                value: b,
                // No segment sub-line here, so this control has just two tiers:
                // icon when width is scarce, the full word once there's room.
                label:
                  density === "icon" ? (
                    BASIS_ICONS[b]
                  ) : (
                    <span className="whitespace-nowrap">{BASIS_LABELS[b]}</span>
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
              btnClassName={segBtnClass}
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
            // Centred, not right-pinned: the bottom-right corner belongs to
            // the dev-tools widget, and the hint was landing under it.
            "border-line bg-panel pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[420] max-w-[min(320px,calc(100vw-24px))] -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-center text-[12px] shadow-[0_4px_16px_rgba(0,0,0,.22)]",
            hint ? "text-muted font-medium" : "text-ink font-semibold whitespace-nowrap",
          )}
        >
          {hint ?? flash}
        </div>
      )}
    </div>
  );
}
