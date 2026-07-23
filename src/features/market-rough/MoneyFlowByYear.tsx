"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { fmtPct } from "./format";

export type YearFlow = {
  year: number;
  turnover: number;
  revenue: number;
  profit: number;
};

/** Chart-label format, as the legacy SVG engine: 1.94M / 653.5k — no €. */
const chartFmt = (v: number) =>
  v >= 1e6
    ? `${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}M`
    : v >= 1e3
      ? `${(v / 1e3).toFixed(1)}k`
      : String(Math.round(v));

/** Axis-tick format: 4M / 3.5M / 500k / 0 — trailing zeros dropped. */
const axisFmt = (v: number) => {
  if (v === 0) return "0";
  if (Math.abs(v) >= 1e6) {
    const m = v / 1e6;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (Math.abs(v) >= 1e3) {
    const k = v / 1e3;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(Math.round(v));
};

type View = { vMin: number; vMax: number; iMin: number; iMax: number };

/**
 * Money-flow by year — the legacy drawFinSvg stacked-bar chart: one bar per
 * year (Net profit / rest-of-Revenue / rest-of-Turnover bottom→top), total +
 * YoY labels on top, the rest-of-revenue value inside the dark band, in-plot
 * legend, 20% zoom-out headroom, hover tooltip, ⤢ fit and pan/zoom gated by
 * the Dev graph-pan setting. Container-pixel sized with a ResizeObserver.
 */
export function MoneyFlowByYear({ rows, title }: { rows: YearFlow[]; title: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const [size, setSize] = useState({ W: 720, H: 300 });
  const [view, setView] = useState<View | null>(null);
  const [tt, setTt] = useState<{ x: number; y: number; html: string } | null>(null);
  const drag = useRef<{ x0: number; y0: number; v: View; moved: boolean } | null>(null);

  const R = rows.length;
  // Must cover EVERY plotted figure, not just turnover. It gates both the
  // fitted view and the zoom reset, and switching the data source changes
  // revenue and profit while leaving turnover identical — so a turnover-only
  // signature let the chart keep a view fitted to the other dataset.
  const sig = rows.map((r) => `${r.year}:${r.turnover}:${r.revenue}:${r.profit}`).join("|");

  // Legacy fitState: stacked headroom ×1.22 for the total labels, then
  // zoomOut 0.2 → ±10% margin on BOTH axes (so the 0-line floats above the
  // bottom and the x range gains side slots).
  const fullView = useMemo<View>(() => {
    const hi = Math.max(...rows.map((r) => r.turnover), 1) * 1.22;
    const xMax = Math.max(1, R - 1);
    const xs = xMax;
    const ys = hi;
    return {
      vMin: -ys * 0.1,
      vMax: hi + ys * 0.1,
      iMin: -xs * 0.1,
      iMax: xMax + xs * 0.1,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  const v = view ?? fullView;

  useEffect(() => setView(null), [sig]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () =>
      host.clientWidth > 0 && setSize({ W: host.clientWidth, H: host.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const { W, H } = size;
  const m = { t: 6, r: 12, b: 24, l: 44 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const vspan = v.vMax - v.vMin || 1;
  const ispan = v.iMax - v.iMin || 1;
  const y = (val: number) => m.t + ph - ((val - v.vMin) / vspan) * ph;
  const x = (i: number) => m.l + ((i - v.iMin) / ispan) * pw;
  // Legacy: slotPx = pw / span; barW = min(slot × 0.7, 64).
  const bandW = pw / ispan;
  const barW = Math.min(bandW * 0.7, 64);

  // Round 1/2/5×10ⁿ y ticks that move with the view (legacy niceTicks).
  const ticks = useMemo(() => {
    if (!(v.vMax > v.vMin)) return [v.vMin];
    const raw = (v.vMax - v.vMin) / 8;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const nrm = raw / mag;
    const step = (nrm < 1.5 ? 1 : nrm < 3 ? 2 : nrm < 7 ? 5 : 10) * mag;
    const out: number[] = [];
    for (
      let t = Math.ceil(v.vMin / step - 1e-9) * step;
      t <= v.vMax + step * 1e-9;
      t += step
    )
      out.push(Math.abs(t) < step * 1e-6 ? 0 : t);
    return out;
  }, [v]);

  const graphPanOn = () => {
    try {
      return localStorage.getItem("graphPan") === "on";
    } catch {
      return false;
    }
  };

  const zoomAbout = (cx: number, cy: number, kx: number, ky: number) => {
    const rect = hostRef.current!.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (cx - rect.left - m.l) / (pw || 1)));
    const fy = Math.max(0, Math.min(1, (cy - rect.top - m.t) / (ph || 1)));
    const focI = v.iMin + fx * ispan;
    const ni = ispan * kx;
    // y is inverted: top of plot = vMax.
    const focV = v.vMax - fy * vspan;
    const nv = Math.max(1e-6, vspan * ky);
    setView({
      iMin: focI - fx * ni,
      iMax: focI + (1 - fx) * ni,
      vMax: focV + fy * nv,
      vMin: focV + fy * nv - nv,
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const host = hostRef.current;
    if (!host || drag.current?.moved) return;
    const rect = host.getBoundingClientRect();
    const xv = e.clientX - rect.left;
    if (xv < m.l || xv > m.l + pw) return setTt(null);
    const i = Math.round(v.iMin + ((xv - m.l) / pw) * ispan);
    if (i < 0 || i >= R) return setTt(null);
    const r = rows[i];
    setTt({
      x: Math.max(2, xv + 8),
      y: e.clientY - rect.top + 8,
      html:
        `<b>${r.year}</b><br>` +
        `Turnover €${chartFmt(r.turnover)}<br>` +
        `Revenue €${chartFmt(r.revenue)}<br>` +
        `Net profit €${chartFmt(r.profit)}`,
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!graphPanOn()) return;
    drag.current = { x0: e.clientX, y0: e.clientY, v: { ...v }, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) > 3) d.moved = true;
    if (!d.moved) return;
    setTt(null);
    const di = ((e.clientX - d.x0) / (pw || 1)) * (d.v.iMax - d.v.iMin);
    const dv = ((e.clientY - d.y0) / (ph || 1)) * (d.v.vMax - d.v.vMin);
    setView({
      iMin: d.v.iMin - di,
      iMax: d.v.iMax - di,
      vMin: d.v.vMin + dv,
      vMax: d.v.vMax + dv,
    });
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent) => {
      if (!graphPanOn()) return;
      e.preventDefault();
      const k = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      zoomAbout(e.clientX, e.clientY, e.shiftKey ? 1 : k, e.altKey ? 1 : k);
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  });

  return (
    <section className="card border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h2 className="mb-1 text-[15px] font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-muted p-6 text-center text-[13px]">No data.</p>
      ) : (
        <div className="chartbox relative h-[340px]">
          <span className="bg-panel2 text-muted pointer-events-none absolute top-1 left-1 z-[7] rounded-[3px] px-1 py-0.5 text-[8px] font-semibold tracking-[.04em] opacity-70">
            SVG
          </span>
          <div
            ref={hostRef}
            className="absolute inset-0 touch-none select-none"
            onMouseMove={onMouseMove}
            onMouseLeave={() => setTt(null)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onDoubleClick={() => setView(null)}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${W} ${H}`}
              className="block overflow-visible"
            >
              <defs>
                <clipPath id={`${clipId}p`}>
                  <rect x={m.l} y={m.t} width={pw} height={ph} />
                </clipPath>
              </defs>
              {ticks.map((t) => {
                const ty = y(t);
                if (ty < m.t - 1 || ty > m.t + ph + 1) return null;
                return (
                  <g key={t}>
                    <line
                      x1={m.l}
                      x2={W - m.r}
                      y1={ty}
                      y2={ty}
                      stroke="var(--color-grid)"
                      strokeWidth="1"
                    />
                    <text
                      x={m.l - 6}
                      y={ty + 3}
                      textAnchor="end"
                      fontSize="10"
                      fill="var(--color-muted)"
                    >
                      {axisFmt(t)}
                    </text>
                  </g>
                );
              })}

              {/* Legend inside the plot, top-right, as the legacy engine. */}
              {[
                ["var(--color-green)", "Net profit"],
                ["var(--color-mf-rev)", "Revenue"],
                ["var(--color-mf-turn)", "Turnover"],
              ].map(([color, label], i) => (
                <g key={label} transform={`translate(${W - 260 + i * 85}, 10)`}>
                  <rect width="9" height="9" rx="2" fill={color} />
                  <text x="13" y="8" fontSize="10" fill="var(--color-ink)">
                    {label}
                  </text>
                </g>
              ))}

              <g clipPath={`url(#${clipId}p)`}>
                {rows.map((r, i) => {
                  const profit = Math.max(0, r.profit);
                  const revRest = Math.max(0, r.revenue - profit);
                  const turnRest = Math.max(0, r.turnover - r.revenue);
                  const cx = x(i);
                  if (cx < m.l - bandW || cx > m.l + pw + bandW) return null;
                  const x0 = cx - barW / 2;
                  const yProfitTop = y(profit);
                  const yRevTop = y(profit + revRest);
                  const yTurnTop = y(profit + revRest + turnRest);
                  const prev = i > 0 ? rows[i - 1].turnover : null;
                  const yoy = prev != null && prev > 0 ? r.turnover / prev - 1 : null;
                  return (
                    <g key={r.year}>
                      <rect
                        x={x0}
                        y={yProfitTop}
                        width={barW}
                        height={Math.max(0, y(0) - yProfitTop)}
                        fill="var(--color-green)"
                      />
                      <rect
                        x={x0}
                        y={yRevTop}
                        width={barW}
                        height={Math.max(0, yProfitTop - yRevTop)}
                        fill="var(--color-mf-rev)"
                      />
                      <rect
                        x={x0}
                        y={yTurnTop}
                        width={barW}
                        height={Math.max(0, yRevTop - yTurnTop)}
                        fill="var(--color-mf-turn)"
                      />
                      <text
                        x={cx}
                        y={yTurnTop - 5}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill="var(--color-ink)"
                      >
                        {chartFmt(r.turnover)}
                      </text>
                      {yoy != null && (
                        <text
                          x={cx}
                          y={yTurnTop - 18}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="600"
                          fill={yoy >= 0 ? "var(--color-green)" : "var(--color-red)"}
                        >
                          {fmtPct(yoy)}
                        </text>
                      )}
                      {/* Rest-of-revenue SEGMENT value inside the dark band (legacy). */}
                      {revRest > 0 && yProfitTop - yRevTop > 14 && (
                        <text
                          x={cx}
                          y={(yRevTop + yProfitTop) / 2 + 3}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="600"
                          fill="var(--color-ink)"
                        >
                          {chartFmt(revRest)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Year labels live OUTSIDE the plot clip (legacy category row). */}
              {rows.map((r, i) => {
                const cx = x(i);
                if (cx < m.l - 4 || cx > m.l + pw + 4) return null;
                return (
                  <text
                    key={r.year}
                    x={cx}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--color-muted)"
                  >
                    {r.year}
                  </text>
                );
              })}
            </svg>

            <button
              type="button"
              title="Fit — reset zoom & pan"
              onClick={(e) => {
                e.stopPropagation();
                setView(null);
              }}
              className="border-line bg-panel text-muted absolute top-1 right-1 z-[7] cursor-pointer rounded-[4px] border px-[5px] py-0.5 text-[12px] font-semibold opacity-60"
            >
              ⤢
            </button>

            {tt && (
              <div
                className="border-line bg-panel text-ink pointer-events-none absolute z-[6] rounded-[4px] border px-1.5 py-1 text-[11px] whitespace-nowrap"
                style={{ left: tt.x, top: tt.y }}
                dangerouslySetInnerHTML={{ __html: tt.html }}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
