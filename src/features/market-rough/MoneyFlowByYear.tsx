"use client";

import { fmtPct } from "./format";

/** Chart-label format, as the legacy SVG engine: 1.94M / 653.5k — no €. */
const chartFmt = (v: number) =>
  v >= 1e6
    ? `${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}M`
    : v >= 1e3
      ? `${(v / 1e3).toFixed(1)}k`
      : String(Math.round(v));

export type YearFlow = {
  year: number;
  turnover: number;
  revenue: number;
  profit: number;
};

/**
 * Money-flow by year: one stacked SVG bar per year — bottom→top Net profit
 * (green), rest-of-Revenue (dark gray), rest-of-Turnover (light gray) — with
 * the turnover total on top, as the legacy drawFinSvg stacked chart.
 */
export function MoneyFlowByYear({ rows, title }: { rows: YearFlow[]; title: string }) {
  const W = 760;
  const H = 300;
  const PAD = { top: 28, right: 12, bottom: 24, left: 44 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const max = Math.max(...rows.map((r) => r.turnover), 1) * 1.05;
  const barW = Math.min(56, (plotW / rows.length) * 0.6);

  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const x = (i: number) => PAD.left + (plotW / rows.length) * (i + 0.5);

  // Round y-axis gridlines: 4 steps of a "nice" value.
  const step = niceStep(max / 4);
  const gridVals: number[] = [];
  for (let v = step; v <= max; v += step) gridVals.push(v);

  return (
    <section className="border-line bg-panel mb-4 min-w-0 rounded-xl border p-[18px]">
      <h2 className="mb-1 text-[15px] font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-muted p-6 text-center text-[13px]">No data.</p>
      ) : (
        <div className="relative">
          <span className="text-muted absolute top-0 left-0 text-[10px] opacity-60">
            SVG
          </span>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label={title}
          >
            {gridVals.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="var(--color-grid)"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 6}
                  y={y(v) + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--color-muted)"
                >
                  {chartFmt(v)}
                </text>
              </g>
            ))}

            {/* Legend inside the plot, top-right, as the legacy engine draws it. */}
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

            {rows.map((r, i) => {
              const profit = Math.max(0, r.profit);
              const revRest = Math.max(0, r.revenue - profit);
              const turnRest = Math.max(0, r.turnover - r.revenue);
              const x0 = x(i) - barW / 2;
              const yProfitTop = y(profit);
              const yRevTop = y(profit + revRest);
              const yTurnTop = y(profit + revRest + turnRest);
              const prevTurnover = i > 0 ? rows[i - 1].turnover : null;
              const yoy =
                prevTurnover != null && prevTurnover > 0
                  ? r.turnover / prevTurnover - 1
                  : null;
              return (
                <g key={r.year}>
                  <rect
                    x={x0}
                    y={yProfitTop}
                    width={barW}
                    height={y(0) - yProfitTop}
                    fill="var(--color-green)"
                  />
                  <rect
                    x={x0}
                    y={yRevTop}
                    width={barW}
                    height={yProfitTop - yRevTop}
                    fill="var(--color-mf-rev)"
                  />
                  <rect
                    x={x0}
                    y={yTurnTop}
                    width={barW}
                    height={yRevTop - yTurnTop}
                    fill="var(--color-mf-turn)"
                  />
                  <text
                    x={x(i)}
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
                      x={x(i)}
                      y={yTurnTop - 18}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill={yoy >= 0 ? "var(--color-green)" : "var(--color-red)"}
                    >
                      {fmtPct(yoy)}
                    </text>
                  )}
                  {/* Revenue value inside the dark band, as the legacy. */}
                  {revRest > 0 && yProfitTop - yRevTop > 14 && (
                    <text
                      x={x(i)}
                      y={(yRevTop + yProfitTop) / 2 + 3}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill="var(--color-ink)"
                    >
                      {chartFmt(r.revenue)}
                    </text>
                  )}
                  <text
                    x={x(i)}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--color-muted)"
                  >
                    {r.year}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

function niceStep(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
}
