import { cn } from "@/lib/cn";
import { fmtEur, fmtPct } from "./format";
import { margin, marketTotals, medianSalary } from "./metrics";
import type { CompanyYear, MarketModel } from "./types";

type Insight = {
  accent: string;
  title: string;
  /** Rendered as bullets — keep each line ~10-15 words, figures intact. */
  lines: React.ReactNode[];
};

const pct = (from: number | null | undefined, to: number | null | undefined) =>
  from && to ? to / from - 1 : null;

const inYear = (rows: CompanyYear[], year: number) =>
  rows.filter((row) => row.year === year && (row.revenue ?? 0) > 0);

/** Joins ["A", "B", "C"] as "A, B and C". */
const list = (parts: React.ReactNode[]) =>
  parts.flatMap((part, i) => [
    i === 0 ? null : i === parts.length - 1 ? " and " : ", ",
    <span key={i}>{part}</span>,
  ]);

/** Computes the six analyst cards from the data for one selected year. */
function buildInsights(model: MarketModel, year: number): Insight[] {
  const { rows } = model;
  const first = model.finYears[0];
  const cur = marketTotals(rows, year);
  const prev = marketTotals(rows, year - 1);
  const base = marketTotals(rows, first);
  const insights: Insight[] = [];

  // 1 — growth regime: what kind of year was this, and who did the work.
  if (year > first) {
    const revMove = pct(prev.revenue, cur.revenue)!;
    const headMove = pct(prev.employees, cur.employees) ?? 0;
    const jobless = revMove > -0.02 && headMove < -0.02;
    const title =
      revMove > 0.08
        ? "A genuine growth year"
        : revMove < -0.02
          ? "The market shrank"
          : jobless
            ? "Flat revenue, fewer people"
            : "Growth has stalled";
    insights.push({
      accent: "border-l-accent",
      title,
      lines: [
        <>
          <b>{fmtPct(revMove)}</b> YoY; <b>{fmtPct(pct(base.revenue, cur.revenue))}</b>{" "}
          since {first} ({fmtEur(base.revenue)} → {fmtEur(cur.revenue)})
        </>,
        <>
          Headcount <b>{fmtPct(headMove)}</b> —{" "}
          {jobless
            ? "productivity, not growth"
            : headMove > revMove + 0.03
              ? "hiring ahead of the business, eroding revenue per head"
              : "in step with revenue: real demand"}
        </>,
      ],
    });
  }

  // 2 — largest segment by revenue share that year.
  const segRevenue = model.segments
    .map((seg) => ({
      seg,
      rows: inYear(rows, year).filter((row) => row.activities.includes(seg)),
    }))
    .map(({ seg, rows: segRows }) => ({
      seg,
      count: segRows.length,
      revenue: segRows.reduce((sum, row) => sum + (row.revenue ?? 0), 0),
      profit: segRows.reduce((sum, row) => sum + (row.profit ?? 0), 0),
      top: [...segRows].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))[0],
    }))
    .sort((a, b) => b.revenue - a.revenue);
  const big = segRevenue[0];
  if (big?.top) {
    const bigMargin = (big.profit / big.revenue) * 100;
    const passThrough = bigMargin < 6;
    insights.push({
      accent: "border-l-purple",
      title: passThrough
        ? `${big.seg} is big, but it's a pass-through`
        : `${big.seg} is where the money is`,
      lines: [
        <>
          <b>{Math.round((big.revenue / cur.revenue) * 100)}%</b> of {year} revenue (
          {fmtEur(big.revenue)}, led by {big.top.brand}); keeps{" "}
          <b>{bigMargin.toFixed(1)}%</b> as profit
        </>,
        passThrough ? (
          <>
            Rest flows to media/suppliers — real fee economy is{" "}
            {list(segRevenue.slice(1, 4).map((s) => `${s.seg} (${fmtEur(s.revenue)})`))}
          </>
        ) : (
          <>Healthy keep-rate for its size: fee work, not pass-through spend</>
        ),
      ],
    });
  }

  // 3 — best margins on fee revenue that year.
  const byMargin = inYear(rows, year)
    .map((row) => ({ row, m: margin(row) }))
    .filter((x): x is { row: CompanyYear; m: number } => x.m != null)
    .sort((a, b) => b.m - a.m);
  if (byMargin.length >= 8) {
    const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const bySize = [...byMargin].sort(
      (a, b) => (b.row.estimatedIncome ?? 0) - (a.row.estimatedIncome ?? 0),
    );
    const cut = Math.floor(bySize.length / 4);
    const bigMedian = median(bySize.slice(0, cut).map((x) => x.m));
    const smallMedian = median(bySize.slice(cut).map((x) => x.m));
    const smallWin = smallMedian > bigMedian + 2;
    insights.push({
      accent: "border-l-green",
      title: smallWin
        ? "Scale does not buy profitability"
        : "The big firms out-earn the boutiques",
      lines: [
        <>
          Top quartile by fee revenue: median <b>{bigMedian.toFixed(0)}%</b> margin vs{" "}
          <b>{smallMedian.toFixed(0)}%</b> for the rest
        </>,
        <>
          {smallWin ? "Big means payroll, not profit. " : "Scale pays, but "}
          margin leaders are specialists:{" "}
          {list(
            byMargin.slice(0, 3).map(({ row, m }) => (
              <b key={row.brand}>
                {row.brand} ({m.toFixed(0)}%)
              </b>
            )),
          )}
        </>,
      ],
    });
  }

  // 4 — mid-size agencies in decline: revenue drop over the trailing 3 years.
  const back = Math.max(first, year - 3);
  const decliners = inYear(rows, year)
    .map((row) => ({
      row,
      change: pct(model.byBrand[row.brand]?.[back]?.revenue, row.revenue),
    }))
    .filter(
      (x): x is { row: CompanyYear; change: number } =>
        x.change != null && x.change < -0.25 && (x.row.revenue ?? 0) > 500_000,
    )
    .sort((a, b) => a.change - b.change);
  // Growers that still lose money — growth bought with negative margins.
  const unprofitableGrower = inYear(rows, year)
    .filter(
      (row) =>
        (row.profit ?? 0) < -100_000 &&
        (row.revenue ?? 0) > 2_000_000 &&
        (pct(model.byBrand[row.brand]?.[back]?.revenue, row.revenue) ?? 0) > 0.3,
    )
    .sort((a, b) => (a.profit ?? 0) - (b.profit ?? 0))[0];
  if (year > back && (decliners.length || unprofitableGrower)) {
    insights.push({
      accent: "border-l-red",
      title: unprofitableGrower
        ? "Growth isn't the same as health"
        : "Agencies in trouble",
      lines: [
        unprofitableGrower ? (
          <>
            <b>{unprofitableGrower.brand}</b>:{" "}
            <b>
              {fmtPct(
                pct(
                  model.byBrand[unprofitableGrower.brand]?.[back]?.revenue,
                  unprofitableGrower.revenue,
                ),
              )}
            </b>{" "}
            growth since {back}, yet a <b>{fmtEur(unprofitableGrower.profit)}</b> loss —
            share bought below cost
          </>
        ) : null,
        decliners.length ? (
          <>
            {list(
              decliners.slice(0, 4).map(({ row, change }) => (
                <b key={row.brand}>
                  {row.brand} ({fmtPct(change)})
                </b>
              )),
            )}{" "}
            lost a quarter-plus of revenue since {back}
          </>
        ) : null,
      ].filter(Boolean),
    });
  }

  // 5 — wage pressure: median salary vs revenue over the same span.
  const salary = medianSalary(rows, year);
  const salaryBase = medianSalary(rows, back);
  if (salary && salaryBase && year > back) {
    const salaryUp = pct(salaryBase, salary)!;
    const revUp = pct(marketTotals(rows, back).revenue, cur.revenue)!;
    insights.push({
      accent: "border-l-amber",
      title:
        salaryUp > revUp
          ? "Wage inflation is squeezing margins"
          : "Revenue is outrunning wages",
      lines: [
        <>
          Median salary <b>{fmtPct(salaryUp)}</b> since {back} (€{Math.round(salaryBase)}{" "}
          → €{Math.round(salary)}/mo) vs revenue <b>{fmtPct(revUp)}</b>
        </>,
        <>
          {salaryUp > revUp
            ? "Payroll outgrowing the market — margin pressure"
            : "Market absorbing wage growth so far"}
        </>,
      ],
    });
  }

  // 6 — fastest growers over the same trailing span.
  const winners = inYear(rows, year)
    .map((row) => ({
      row,
      change: pct(model.byBrand[row.brand]?.[back]?.revenue, row.revenue),
    }))
    .filter(
      (x): x is { row: CompanyYear; change: number } =>
        x.change != null && x.change > 0.5 && (x.row.revenue ?? 0) > 1_000_000,
    )
    .sort((a, b) => b.change - a.change);
  if (year > back && winners.length) {
    // Which segment do the fast growers cluster in? That's where demand is shifting.
    const segCounts = new Map<string, number>();
    for (const { row } of winners.slice(0, 8))
      for (const seg of row.activities) segCounts.set(seg, (segCounts.get(seg) ?? 0) + 1);
    const hot = [...segCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const clustered = hot && hot[1] >= Math.max(3, Math.ceil(winners.length / 2));
    insights.push({
      accent: "border-l-accent",
      title: clustered
        ? `Demand is shifting toward ${hot[0]}`
        : `Winners of ${back}–${year}`,
      lines: [
        <>
          Standout €1M+ growers:{" "}
          {list(
            winners.slice(0, 4).map(({ row, change }) => (
              <b key={row.brand}>
                {row.brand} ({fmtPct(change)})
              </b>
            )),
          )}
        </>,
        clustered ? (
          <>
            Mostly <b>{hot[0]}</b> — client budgets are moving there
          </>
        ) : (
          <>Spread across segments — execution, not one hot niche</>
        ),
      ],
    });
  }

  return insights;
}

/** The collapsible "Key insights" card — recomputed for the selected year. */
export function Insights({ model, year }: { model: MarketModel; year: number }) {
  const insights = buildInsights(model, year);

  return (
    <details className="border-line bg-panel group mb-6 rounded-[10px] border">
      <summary className="group-open:border-line flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[15px] font-bold group-open:border-b [&::-webkit-details-marker]:hidden">
        <span className="text-muted text-[12px] transition-transform group-open:rotate-90">
          ▸
        </span>
        Key insights {year}
        <span className="border-line bg-panel2 text-muted rounded-md border px-[7px] py-px text-[11px] font-semibold">
          {insights.length}
        </span>
      </summary>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5 p-3.5">
        {insights.map((insight) => (
          <article
            key={insight.title}
            className={cn(
              "border-line bg-panel rounded-[10px] border border-l-4 px-4 py-3.5",
              insight.accent,
            )}
          >
            <h3 className="mb-1 text-[13px] font-semibold">{insight.title}</h3>
            <ul className="text-muted [&_b]:text-ink space-y-1 text-[12.5px]">
              {insight.lines.map((line, i) => (
                <li
                  key={i}
                  className="relative pl-3 before:absolute before:left-0 before:content-['·']"
                >
                  {line}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </details>
  );
}
