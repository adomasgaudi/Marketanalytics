"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type BarRow = {
  label: string;
  value: number;
  color: string;
  /** Group-title row: bigger muted label, no bar (legacy {heading}). */
  heading?: string;
  /** Empty gap row between metric groups (legacy {spacer}). */
  spacer?: boolean;
  /** Overrides the end-of-bar label, so a bar can be scaled on one unit
   *  (percentile) but read out in another (€, %, headcount). Ticks keep `fmt`. */
  valueText?: string;
};

type View = { vMin: number; vMax: number; iMin: number; iMax: number };

/**
 * Faithful port of the legacy drawBarsSvg engine:
 * - sized to the CONTAINER's real pixels (no viewBox scaling — text stays true)
 * - names INSIDE the plot at each bar's start (shadowed), values after the end
 * - 1/2/5×10ⁿ tick gridlines that pan/zoom with the view
 * - hover tooltip, ⤢ fit button, double-click reset, ResizeObserver re-render
 * - wheel zoom + drag pan, gated by the Dev "Graph pan" setting (as legacy)
 */
export function BarsSvg({
  rows,
  fmt,
  xTitle,
  tip,
}: {
  rows: BarRow[];
  fmt: (v: number) => string;
  xTitle?: string;
  tip?: (row: BarRow, index: number) => string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const [size, setSize] = useState({ W: 360, H: 240 });
  const [view, setView] = useState<View | null>(null);
  const [tt, setTt] = useState<{ x: number; y: number; html: string } | null>(null);
  const drag = useRef<{ x0: number; y0: number; v: View; moved: boolean } | null>(null);

  const R = rows.length;

  // Full-data view (legacy fullView): refit whenever the data signature changes.
  const sig = rows.map((r) => `${r.heading ?? r.label}:${r.value}`).join("|");
  const fullView = useMemo<View>(() => {
    let lo = 0;
    let hi = 0;
    rows.forEach((r) => {
      if (r.value < lo) lo = r.value;
      if (r.value > hi) hi = r.value;
    });
    if (lo === hi) hi = lo + 1;
    return { vMin: lo, vMax: hi, iMin: -0.5, iMax: Math.max(0.5, R - 0.5) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  const v = view ?? fullView;

  // Refit on data change — adjust-during-render, not an effect.
  const [prevSig, setPrevSig] = useState(sig);
  if (prevSig !== sig) {
    setPrevSig(sig);
    setView(null);
  }

  // Container-pixel sizing, re-rendered on resize (legacy ResizeObserver).
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
  const m = { t: 6, r: 42, b: 24, l: 10 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const vspan = v.vMax - v.vMin || 1;
  const ispan = v.iMax - v.iMin || 1;
  const xAt = (val: number) => m.l + ((val - v.vMin) / vspan) * pw;
  const base = xAt(0);
  const rowY = (i: number) => m.t + ((i - v.iMin) / ispan) * ph;
  const bandH = ph / ispan;
  const barH = Math.max(2, Math.min(22, bandH * 0.62));

  // Round 1/2/5×10ⁿ ticks so numbers MOVE on pan/zoom (legacy niceTicks, PB-1).
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
    const host = hostRef.current!;
    const r = host.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (cx - r.left - m.l) / (pw || 1)));
    const fy = Math.max(0, Math.min(1, (cy - r.top - m.t) / (ph || 1)));
    const focV = v.vMin + fx * vspan;
    const nv = Math.max(1e-6, vspan * kx);
    const focI = v.iMin + fy * ispan;
    const ni = ispan * ky;
    setView({
      vMin: focV - fx * nv,
      vMax: focV + (1 - fx) * nv,
      iMin: focI - fy * ni,
      iMax: focI + (1 - fy) * ni,
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const host = hostRef.current;
    if (!host) return;
    if (drag.current?.moved) return;
    const rect = host.getBoundingClientRect();
    const yv = e.clientY - rect.top;
    if (yv < m.t || yv > m.t + ph) return setTt(null);
    const i = Math.round(v.iMin + ((yv - m.t) / ph) * ispan);
    if (i < 0 || i >= R) return setTt(null);
    const row = rows[i];
    if (row.heading || row.spacer) return setTt(null);
    setTt({
      x: Math.max(2, e.clientX - rect.left + 8),
      y: e.clientY - rect.top + 8,
      html: tip ? tip(row, i) : `<b>${row.label}</b>: ${fmt(row.value)}`,
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
    const dv = ((e.clientX - d.x0) / (pw || 1)) * (d.v.vMax - d.v.vMin);
    const di = ((e.clientY - d.y0) / (ph || 1)) * (d.v.iMax - d.v.iMin);
    setView({
      vMin: d.v.vMin - dv,
      vMax: d.v.vMax - dv,
      iMin: d.v.iMin - di,
      iMax: d.v.iMax - di,
    });
  };
  const onPointerUp = () => (drag.current = null);

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
    <div
      ref={hostRef}
      className="absolute inset-0 touch-none select-none"
      onMouseMove={onMouseMove}
      onMouseLeave={() => setTt(null)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => setView(null)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="block overflow-visible"
      >
        <defs>
          <filter id={`${clipId}sh`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="0.5"
              stdDeviation="1"
              floodColor="#000"
              floodOpacity="0.5"
            />
          </filter>
          <clipPath id={`${clipId}p`}>
            <rect x={m.l} y={m.t} width={pw} height={ph} />
          </clipPath>
        </defs>
        {ticks.map((t) => {
          const x = xAt(t);
          if (x < m.l - 1 || x > W - m.r + 1) return null;
          return (
            <g key={t}>
              <line
                x1={x}
                y1={m.t}
                x2={x}
                y2={m.t + ph}
                stroke="var(--color-grid)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={H - 12}
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-muted)"
              >
                {fmt(t)}
              </text>
            </g>
          );
        })}
        {xTitle && (
          <text
            x={m.l + pw / 2}
            y={H - 1}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-muted)"
          >
            {xTitle}
          </text>
        )}
        <g clipPath={`url(#${clipId}p)`}>
          {rows.map((r, i) => {
            const cy = rowY(i);
            if (cy < m.t - bandH || cy > m.t + ph + bandH) return null;
            if (r.spacer) return null;
            if (r.heading)
              return (
                <text
                  key={`h${i}`}
                  x={m.l + 2}
                  y={cy + 4}
                  fontSize="12.5"
                  fontWeight="700"
                  letterSpacing=".02em"
                  fill="var(--color-muted)"
                >
                  {r.heading}
                </text>
              );
            const x1 = xAt(r.value);
            const bx = Math.min(base, x1);
            const bw = Math.max(0, Math.abs(x1 - base));
            const nameX = (x1 >= base ? base : x1) + 4;
            const nameW = r.label.length * 5.8;
            const lx = x1 >= base ? Math.max(x1 + 4, nameX + nameW + 6) : x1 - 4;
            return (
              <g key={`${r.label}${i}`}>
                <rect
                  x={bx}
                  y={cy - barH / 2}
                  width={bw}
                  height={barH}
                  rx="2"
                  fill={r.color}
                />
                <text
                  x={nameX}
                  y={cy + 3}
                  fontSize="10"
                  fontWeight="600"
                  fill="var(--color-ink)"
                  filter={`url(#${clipId}sh)`}
                >
                  {r.label}
                </text>
                <text
                  x={lx}
                  y={cy + 3}
                  fontSize="9"
                  textAnchor={x1 >= base ? "start" : "end"}
                  fill="var(--color-muted)"
                >
                  {r.valueText ?? fmt(r.value)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ⤢ fit — reset zoom & pan (legacy fitBtn). */}
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
  );
}
