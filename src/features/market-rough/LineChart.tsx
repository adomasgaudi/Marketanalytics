"use client";

/** One line series across years. */
export type LineSeries = {
  label: string;
  color: string;
  data: { x: number; y: number }[];
};

/** Minimal SVG multi-series line chart in the legacy deep-dive style. */
export function LineChart({
  series,
  fmt,
  height = 280,
}: {
  series: LineSeries[];
  fmt: (v: number) => string;
  height?: number;
}) {
  const W = 760;
  const H = height;
  const PAD = { top: 16, right: 16, bottom: 24, left: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const pts = series.flatMap((s) => s.data);
  if (!pts.length)
    return <p className="text-muted p-6 text-center text-[13px]">No data.</p>;

  const xs = [...new Set(pts.map((p) => p.x))].sort((a, b) => a - b);
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const minY = Math.min(0, ...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y)) * 1.05 || 1;

  const x = (v: number) =>
    PAD.left + (maxX === minX ? plotW / 2 : ((v - minX) / (maxX - minX)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - minY) / (maxY - minY)) * plotH;

  const step = niceStep((maxY - minY) / 4);
  const gridVals: number[] = [];
  for (let v = Math.ceil(minY / step) * step; v <= maxY; v += step) gridVals.push(v);

  return (
    <div className="relative">
      <span className="text-muted absolute top-0 left-0 text-[10px] opacity-60">SVG</span>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        {gridVals.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-grid)"
            />
            <text
              x={PAD.left - 6}
              y={y(v) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-muted)"
            >
              {fmt(v)}
            </text>
          </g>
        ))}
        {xs.map((v) => (
          <text
            key={v}
            x={x(v)}
            y={H - 6}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-muted)"
          >
            {v}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.label}>
            <polyline
              points={s.data.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {s.data.map((p) => (
              <circle key={p.x} cx={x(p.x)} cy={y(p.y)} r="3" fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 text-[12px]">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-[3px] w-[18px] rounded"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
}
