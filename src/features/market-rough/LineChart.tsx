"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/** One line series. Band lines pass dash/opacity/noMarkers and empty label. */
export type LineSeries = {
  label: string;
  color: string;
  data: { x: number; y: number }[];
  width?: number;
  dash?: number[];
  opacity?: number;
  noMarkers?: boolean;
};

type View = { vMin: number; vMax: number; xMin: number; xMax: number };

/** Glide the fitted view (axis range) from the old metric's scale to the new
 *  one over 450ms, so gridlines and axis numbers move rather than snap. */
function useTweenedView(target: View, sig: string): View {
  const [disp, setDisp] = useState(target);
  const dispRef = useRef(target);
  dispRef.current = disp;
  const raf = useRef(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      setDisp(target);
      return;
    }
    const from = dispRef.current;
    const t0 = performance.now();
    const D = 450;
    const L = (a: number, b: number, e: number) => a + (b - a) * e;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / D);
      const e = 1 - (1 - k) ** 3;
      setDisp({
        xMin: L(from.xMin, target.xMin, e),
        xMax: L(from.xMax, target.xMax, e),
        vMin: L(from.vMin, target.vMin, e),
        vMax: L(from.vMax, target.vMax, e),
      });
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return disp;
}

/** Three-step metric switch: the new series land in place on the NEW scale
 *  immediately; the previous series linger as a "ghost" re-plotted on that same
 *  new scale (so bigger/smaller is directly comparable), then fade out. */
function useGhostSeries(next: LineSeries[], sig: string) {
  const [ghost, setGhost] = useState<{ series: LineSeries[]; key: string } | null>(null);
  const prev = useRef({ sig, series: next });
  useEffect(() => {
    if (prev.current.sig !== sig) {
      setGhost({ series: prev.current.series, key: sig });
      const t = setTimeout(() => setGhost(null), 1300);
      prev.current = { sig, series: next };
      return () => clearTimeout(t);
    }
    prev.current = { sig, series: next };
  }, [sig, next]);
  return ghost;
}

/**
 * Line chart on the legacy drawFinSvg engine pattern: container-pixel sizing,
 * CHART_PAD fit (0.5-slot x margin, 5% y headroom, 5%/10% zoom-out, floor at
 * 0), moving 1/2/5 ticks, top-centre overlay legend, hover tooltip, ⤢ fit,
 * and pan/zoom behind the Dev graph-pan setting.
 */
export function LineChart({
  series: seriesIn,
  fmt,
  yTitle,
}: {
  series: LineSeries[];
  fmt: (v: number) => string;
  yTitle?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const [size, setSize] = useState({ W: 720, H: 300 });
  const [view, setView] = useState<View | null>(null);
  const [tt, setTt] = useState<{ x: number; y: number; html: string } | null>(null);
  const drag = useRef<{ x0: number; y0: number; v: View; moved: boolean } | null>(null);

  const series = seriesIn;

  const pts = series.flatMap((s) => s.data);
  const xs = useMemo(
    () => [...new Set(pts.map((p) => p.x))].sort((a, b) => a - b),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series],
  );
  const sig = series
    .map((s) => `${s.label}:${s.data.map((p) => p.y.toFixed(1)).join(",")}`)
    .join("|");
  const ghost = useGhostSeries(series, sig);

  // Legacy CHART_PAD fit: x ±0.5 slot then 5% zoom-out; y extent floored at 0,
  // +5% headroom, then 10% zoom-out.
  const fullView = useMemo<View>(() => {
    if (!pts.length) return { xMin: 0, xMax: 1, vMin: 0, vMax: 1 };
    let lo = Math.min(...pts.map((p) => p.y));
    let hi = Math.max(...pts.map((p) => p.y));
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    if (lo > 0) lo = 0;
    hi += (hi - lo) * 0.05;
    const ys = hi - lo;
    let xMin = xs[0] - 0.5;
    let xMax = xs[xs.length - 1] + 0.5;
    const xsp = xMax - xMin;
    xMin -= (xsp * 0.05) / 2;
    xMax += (xsp * 0.05) / 2;
    return { xMin, xMax, vMin: lo - (ys * 0.1) / 2, vMax: hi + (ys * 0.1) / 2 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  const tweenedFull = useTweenedView(fullView, sig);
  const v = view ?? tweenedFull;

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
  const m = { t: 16, r: 16, b: 24, l: 52 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const vspan = v.vMax - v.vMin || 1;
  const xspan = v.xMax - v.xMin || 1;
  const px = (x: number) => m.l + ((x - v.xMin) / xspan) * pw;
  const py = (y: number) => m.t + ph - ((y - v.vMin) / vspan) * ph;

  const ticks = useMemo(() => {
    if (!(v.vMax > v.vMin)) return [v.vMin];
    const raw = (v.vMax - v.vMin) / 8;
    const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
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

  const labeled = seriesIn.filter((s) => s.label);

  const onMouseMove = (e: React.MouseEvent) => {
    const host = hostRef.current;
    if (!host || drag.current?.moved) return;
    const rect = host.getBoundingClientRect();
    const xv = e.clientX - rect.left;
    if (xv < m.l || xv > m.l + pw) return setTt(null);
    const xVal = Math.round(v.xMin + ((xv - m.l) / pw) * xspan);
    if (!xs.includes(xVal)) return setTt(null);
    const lines = labeled
      .map((s) => {
        const p = s.data.find((d) => d.x === xVal);
        return p
          ? `<span style="color:${s.color}">●</span> ${s.label}: ${fmt(p.y)}`
          : null;
      })
      .filter(Boolean);
    if (!lines.length) return setTt(null);
    setTt({
      x: Math.max(2, xv + 8),
      y: e.clientY - rect.top + 8,
      html: `<b>${xVal}</b><br>${lines.join("<br>")}`,
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
    const dx = ((e.clientX - d.x0) / (pw || 1)) * (d.v.xMax - d.v.xMin);
    const dv = ((e.clientY - d.y0) / (ph || 1)) * (d.v.vMax - d.v.vMin);
    setView({
      xMin: d.v.xMin - dx,
      xMax: d.v.xMax - dx,
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
      const rect = host.getBoundingClientRect();
      const k = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const kx = e.shiftKey ? 1 : k;
      const ky = e.altKey ? 1 : k;
      const fx = Math.max(0, Math.min(1, (e.clientX - rect.left - m.l) / (pw || 1)));
      const fy = Math.max(0, Math.min(1, (e.clientY - rect.top - m.t) / (ph || 1)));
      const focX = v.xMin + fx * xspan;
      const nx = xspan * kx;
      const focV = v.vMax - fy * vspan;
      const nv = Math.max(1e-9, vspan * ky);
      setView({
        xMin: focX - fx * nx,
        xMax: focX + (1 - fx) * nx,
        vMax: focV + fy * nv,
        vMin: focV + fy * nv - nv,
      });
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  });

  if (!pts.length)
    return <p className="text-muted p-6 text-center text-[13px]">No data.</p>;

  return (
    <div className="chartbox relative h-[340px]">
      <span className="bg-panel2 text-muted pointer-events-none absolute top-1 left-1 z-[7] rounded-[3px] px-1 py-0.5 text-[8px] font-semibold tracking-[.04em] opacity-70">
        SVG
      </span>

      {/* Top-centre overlay legend (legacy .svg-legend). */}
      {labeled.length > 1 && (
        <div className="text-ink pointer-events-none absolute top-0.5 right-9 left-9 z-[6] flex flex-wrap justify-center gap-x-2.5 text-[9.5px] leading-[1.3]">
          {labeled.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span
                className="inline-block h-[3px] w-[16px] rounded"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}

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
            const ty = py(t);
            if (ty < m.t - 1 || ty > m.t + ph + 1) return null;
            return (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={ty} y2={ty} stroke="var(--color-grid)" />
                <text
                  x={m.l - 6}
                  y={ty + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--color-muted)"
                >
                  {fmt(t)}
                </text>
              </g>
            );
          })}
          {yTitle && (
            <text
              x={12}
              y={m.t + ph / 2}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-muted)"
              transform={`rotate(-90 12 ${m.t + ph / 2})`}
            >
              {yTitle}
            </text>
          )}
          {xs.map((xv) => {
            const cx = px(xv);
            if (cx < m.l - 4 || cx > m.l + pw + 4) return null;
            return (
              <g key={xv}>
                <line x1={cx} x2={cx} y1={m.t} y2={m.t + ph} stroke="var(--color-grid)" />
                <text
                  x={cx}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-muted)"
                >
                  {xv}
                </text>
              </g>
            );
          })}
          <g clipPath={`url(#${clipId}p)`}>
            {/* Ghost: previous metric's lines re-plotted on the new scale, held
                visible then faded, so the size change reads directly. */}
            {ghost && (
              <g key={ghost.key} style={{ animation: "lcGhost 1.3s forwards" }}>
                <style>{`@keyframes lcGhost{0%,45%{opacity:.4}100%{opacity:0}}`}</style>
                {ghost.series.map((s, si) => (
                  <polyline
                    key={`g-${s.label}-${si}`}
                    points={s.data.map((p) => `${px(p.x)},${py(p.y)}`).join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width ?? 2}
                    strokeDasharray="4,4"
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            )}
            {series.map((s, si) => (
              <g key={`${s.label}-${si}`} opacity={s.opacity ?? 0.9}>
                <polyline
                  points={s.data.map((p) => `${px(p.x)},${py(p.y)}`).join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.width ?? 2}
                  strokeDasharray={s.dash?.join(",")}
                  strokeLinejoin="round"
                />
                {!s.noMarkers &&
                  s.data.map((p) => (
                    <circle key={p.x} cx={px(p.x)} cy={py(p.y)} r="3" fill={s.color} />
                  ))}
              </g>
            ))}
          </g>
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
  );
}
