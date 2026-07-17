"use client";

import { useMemo, useState } from "react";
import { fmtM } from "./format";
import { SEG_COLORS } from "./segments";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

const MY_BRAND = "Fabula";

type Dot = { x: number; y: number; r: number; brand: string; seg: string };

/**
 * Size vs profitability by year: every company is one bubble; dragging the
 * slider interpolates bubbles smoothly between adjacent years (legacy scrub).
 */
export function ScatterScrub({ model }: { model: MarketModel }) {
  const [{ market }] = useDashboardParams(model.last);
  const perEmp = market === "emp";
  const [t, setT] = useState(0);

  const perYear = useMemo(() => {
    const dataFor = (y: number): Record<string, Dot> => {
      const out: Record<string, Dot> = {};
      model.rows
        .filter(
          (d) =>
            d.year === y &&
            (d.estimatedIncome ?? 0) > 50_000 &&
            d.profit != null &&
            (d.employees ?? 0) > 0,
        )
        .forEach((d) => {
          out[d.brand] = {
            x: perEmp
              ? (d.estimatedIncome as number) / (d.employees as number)
              : (d.estimatedIncome as number),
            y: ((d.profit as number) / (d.estimatedIncome as number)) * 100,
            r: Math.max(3, Math.sqrt(d.employees as number) * 1.6),
            brand: d.brand,
            seg: d.activities[0] ?? "Other",
          };
        });
      return out;
    };
    return model.finYears.map((y) => ({ year: y, dots: dataFor(y) }));
  }, [model, perEmp]);

  if (perYear.length < 2) return null;

  // Continuous position t ∈ [0, n-1] between year frames.
  const pos = t * (perYear.length - 1);
  const i0 = Math.min(perYear.length - 2, Math.floor(pos));
  const frac = pos - i0;
  const a = perYear[i0].dots;
  const b = perYear[i0 + 1].dots;
  const yearLabel = frac < 0.5 ? perYear[i0].year : perYear[i0 + 1].year;

  const brands = new Set([...Object.keys(a), ...Object.keys(b)]);
  const lerp = (from: number, to: number) => from + (to - from) * frac;

  const W = 760;
  const H = 340;
  const PAD = { top: 12, right: 12, bottom: 30, left: 44 };
  const logMin = Math.log10(10_000);
  const logMax = Math.log10(40_000_000);
  const yMin = -40;
  const yMax = 60;
  const px = (v: number) =>
    PAD.left +
    ((Math.log10(Math.max(v, 10_000)) - logMin) / (logMax - logMin)) *
      (W - PAD.left - PAD.right);
  const py = (v: number) =>
    PAD.top +
    (1 - (Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) *
      (H - PAD.top - PAD.bottom);

  const dots = [...brands]
    .map((brand) => {
      const d0 = a[brand];
      const d1 = b[brand];
      const d = d0 && d1 ? d0 : (d0 ?? d1)!;
      return {
        brand,
        seg: d.seg,
        x: d0 && d1 ? lerp(d0.x, d1.x) : d.x,
        y: d0 && d1 ? lerp(d0.y, d1.y) : d.y,
        r: d0 && d1 ? lerp(d0.r, d1.r) : d.r,
        // Entering/leaving companies fade in/out with the scrub position.
        opacity: d0 && d1 ? 0.85 : d0 ? 0.85 * (1 - frac) : 0.85 * frac,
      };
    })
    // Fabula last so its gold bubble draws on top. Stable two-arg comparator —
    // a one-arg version hydration-mismatches (server/client order differs).
    .sort((a, b) => (a.brand === MY_BRAND ? 1 : 0) - (b.brand === MY_BRAND ? 1 : 0));

  return (
    <section className="border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h3 className="mb-1 text-[15px] font-semibold">Size vs profitability by year</h3>
      <p className="text-muted mb-1.5 text-[12px]">
        Each company = one bubble (revenue × margin, size = headcount); Fabula in gold.{" "}
        <b>Drag the slider</b> to watch every company glide year to year.
      </p>
      <div className="text-accent mb-1 text-[22px] font-extrabold">{yearLabel}</div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        {[0, -20, 20, 40].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={py(v)}
              y2={py(v)}
              stroke="var(--color-grid)"
            />
            <text
              x={PAD.left - 6}
              y={py(v) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-muted)"
            >
              {v}%
            </text>
          </g>
        ))}
        {[1e5, 1e6, 1e7].map((v) => (
          <text
            key={v}
            x={px(v)}
            y={H - 10}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-muted)"
          >
            €{fmtM(v)}
          </text>
        ))}
        {dots.map((d) => (
          <circle
            key={d.brand}
            cx={px(d.x)}
            cy={py(d.y)}
            r={d.r}
            fill={
              d.brand === MY_BRAND ? "var(--color-gold)" : (SEG_COLORS[d.seg] ?? "#888")
            }
            fillOpacity={
              d.brand === MY_BRAND ? Math.min(1, d.opacity + 0.15) : d.opacity * 0.7
            }
            stroke={d.brand === MY_BRAND ? "var(--color-ink)" : "none"}
            strokeWidth={d.brand === MY_BRAND ? 1.5 : 0}
          />
        ))}
      </svg>

      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={t}
        onChange={(e) => setT(Number(e.target.value))}
        aria-label="Year scrubber"
        className="accent-accent w-full"
      />
      <div className="text-muted flex justify-between text-[11px]">
        {perYear.map((f) => (
          <span key={f.year}>{f.year}</span>
        ))}
      </div>
    </section>
  );
}
