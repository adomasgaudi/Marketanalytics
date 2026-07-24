"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The money-flow bar and its two span-brackets, as ONE SVG.
 *
 * Why SVG and not divs, which is what this was: a bracket that lines up with a
 * band, and a leader line that starts where that bracket ends, need a shared
 * coordinate space. Flexbox has none — it distributes leftover room — so every
 * alignment had to be re-derived per column and only ever agreed approximately.
 * Worse, a div stack cannot draw a 1% slice: it needs a min-height floor, and
 * that floor is a LIE about the data. Here a slice is exactly its share of the
 * height, and a slice too thin to see is honestly too thin to see.
 *
 * Everything is drawn in measured pixels rather than a scaled viewBox, so
 * strokes stay 1px and corners stay round at any height.
 */
export type BarSlice = { cls: string; value: number };

const BAR_W = 26;
const GAP = 7;
const BRACKET_W = 6;
const TOTAL_W = BAR_W + GAP + BRACKET_W + 5 + BRACKET_W;

export function MoneyFlowBar({
  revenue,
  pass,
  radius = 6,
}: {
  /** Bottom-up: the revenue band's slices, in draw order. */
  revenue: BarSlice[];
  /** Pass-through above the band. 0 hides it and the outer bracket spans all. */
  pass: number;
  radius?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(120);

  // The bar stretches to whatever the legend beside it needs, so the height is
  // measured rather than fixed — same approach as the other SVG charts here.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const next = Math.max(60, Math.round(entry.contentRect.height));
      setH((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const revTotal = revenue.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const total = revTotal + Math.max(0, pass);
  if (total <= 0) return <div ref={hostRef} style={{ width: TOTAL_W }} />;

  const px = (v: number) => (v / total) * h;
  const revH = px(revTotal);
  const bandTop = h - revH;

  // Cumulative from the bottom, so every boundary is exact and neighbouring
  // slices meet with no rounding gap. Folded rather than mutated: a running
  // variable across a render is exactly what the compiler forbids.
  const rects = revenue.reduce<{ key: number; y: number; height: number; cls: string }[]>(
    (acc, slice, i) => {
      const height = px(Math.max(0, slice.value));
      const y = (acc[acc.length - 1]?.y ?? h) - height;
      acc.push({ key: i, y, height, cls: slice.cls });
      return acc;
    },
    [],
  );

  const bx = BAR_W + GAP; // gold bracket rule
  const bx2 = bx + BRACKET_W + 5; // blue bracket rule, 5px further out

  return (
    <div ref={hostRef} className="flex-none self-stretch" style={{ width: TOTAL_W }}>
      <svg width={TOTAL_W} height={h} className="block">
        <defs>
          <clipPath id="mf-bar-clip">
            <rect x={0.5} y={0.5} width={BAR_W - 1} height={h - 1} rx={radius} />
          </clipPath>
        </defs>

        {/* Slices first, clipped to the bar's rounded outline. */}
        <g clipPath="url(#mf-bar-clip)">
          {pass > 0 && (
            <rect x={0} y={0} width={BAR_W} height={bandTop} className="fill-mf-turn" />
          )}
          {rects.map((r) => (
            <rect
              key={r.key}
              x={0}
              y={r.y}
              width={BAR_W}
              height={r.height}
              className={r.cls}
            />
          ))}
        </g>

        {/* The bar's own outline, drawn over the slices so it stays crisp. */}
        <rect
          x={0.5}
          y={0.5}
          width={BAR_W - 1}
          height={h - 1}
          rx={radius}
          fill="none"
          strokeWidth={1}
          className="stroke-mf-turn-line"
        />
        {/* Where revenue starts. */}
        {pass > 0 && revTotal > 0 && (
          <line
            x1={0}
            x2={BAR_W}
            y1={bandTop}
            y2={bandTop}
            strokeWidth={2}
            className="stroke-gold"
          />
        )}

        {/* Brackets: rule on the right, arms reaching left, so each opens
            toward the bar it measures. Half-pixel offsets keep them hairline. */}
        {revTotal > 0 && (
          <Bracket x={bx} top={bandTop} bottom={h} className="stroke-gold" />
        )}
        <Bracket x={bx2} top={0} bottom={h} className="stroke-mf-turn-line" />
      </svg>
    </div>
  );
}

/** A "]" — vertical rule with two arms reaching back toward the bar. */
function Bracket({
  x,
  top,
  bottom,
  className,
}: {
  x: number;
  top: number;
  bottom: number;
  className: string;
}) {
  const rx = Math.round(x + BRACKET_W) - 0.5;
  const t = Math.round(top) + 1;
  const b = Math.round(bottom) - 1;
  return (
    <path
      d={`M ${rx - BRACKET_W} ${t} H ${rx} V ${b} H ${rx - BRACKET_W}`}
      fill="none"
      strokeWidth={2}
      className={className}
    />
  );
}
