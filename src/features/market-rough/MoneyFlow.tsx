import { cn } from "@/lib/cn";
import { type Formula, FormulaPopover, yoy } from "./Formula";
import { fmtEur, fmtPct } from "./format";
import type { Rank } from "./metrics";

/** Previous-year figures on the same basis, for the per-item YoY chips. */
export type MoneyFlowPrev = { T?: number | null; R?: number | null; P?: number | null };

type Props = {
  /** Turnover. Falls back to revenue when missing (as the legacy does). */
  turnover: number | null;
  revenue: number | null;
  profit: number | null;
  prev?: MoneyFlowPrev;
  /** Rank chip after the turnover headline (company view). */
  rank?: Rank | null;
  /** Small scope tag after the headline, e.g. "per company · 113 cos". */
  tag?: string;
  /** Mirrors the €/% KPI toggle: "change" swaps each value for its YoY. */
  mode?: "value" | "change";
  /** "2024 → 2025" — the span the YoY figures compare. */
  yrLabel?: string;
  /** Dev-mode formula folds, keyed by legend row. Built by `moneyFormulas`. */
  formulas?: Partial<Record<"T" | "R" | "P", Formula[]>>;
};

function Yoy({
  cur,
  prev,
  big,
}: {
  cur: number | null;
  prev?: number | null;
  big?: boolean;
}) {
  if (cur == null || prev == null || prev <= 0) return null;
  const ratio = cur / prev - 1;
  return (
    <span
      className={cn(
        "font-semibold",
        big ? "text-[19px]" : "text-[12px]",
        ratio >= 0 ? "text-green" : "text-red",
      )}
    >
      {fmtPct(ratio)}
    </span>
  );
}

/**
 * The legacy money-flow card: one vertical stacked bar (net profit / rest of
 * revenue / rest of turnover, bottom→top), a gold revenue bracket, and a
 * bottom→top legend that matches the bar order.
 */
export function MoneyFlow({
  turnover,
  revenue,
  profit,
  prev = {},
  rank,
  tag,
  mode = "value",
  yrLabel,
  formulas = {},
}: Props) {
  if (revenue == null && turnover == null) return null;
  const T = turnover ?? revenue!;

  const pass =
    turnover != null && revenue != null && turnover > revenue ? turnover - revenue : 0;
  const pctOf = (v: number) => (T > 0 ? (v / T) * 100 : 0);

  // Bar bottom→top: Net profit (green), rest-of-Revenue, rest-of-Turnover.
  const profitSeg = profit != null && profit > 0 ? profit : 0;
  const revRest = revenue != null ? Math.max(0, revenue - profitSeg) : 0;
  const segments = [
    profitSeg > 0 && { cls: "bg-green", pct: pctOf(profitSeg) },
    revRest > 0 && { cls: "bg-mf-rev", pct: pctOf(revRest) },
    pass > 0 && { cls: "bg-mf-turn", pct: pctOf(pass) },
  ].filter(Boolean) as { cls: string; pct: number }[];

  // Each row pairs its own definition with the shared YoY formula, and only
  // shows the latter when there is a prior year to compare against.
  const folds = (
    k: "T" | "R" | "P",
    code: string,
    label: string,
    before?: number | null,
  ) => [
    ...(formulas[k] ?? []),
    ...(formulas[k] && before != null && before > 0 ? [yoy(code, label)] : []),
  ];

  const legend = [
    profit != null && {
      dot: "bg-green",
      name: "Net profit",
      val: fmtEur(profit),
      cur: profit,
      before: prev.P,
      formulas: folds("P", "P", "net profit", prev.P),
    },
    revenue != null && {
      dot: "bg-mf-rev",
      name: "Revenue",
      val: fmtEur(revenue),
      cur: revenue,
      before: prev.R,
      formulas: folds("R", "R", "revenue", prev.R),
    },
    {
      dot: "bg-mf-turn",
      name: "Turnover",
      val: fmtEur(T),
      cur: turnover,
      before: prev.T,
      formulas: folds("T", "T", "turnover", prev.T),
      // Turnover is the card's headline now that the title row is gone.
      lead: true,
    },
  ].filter(Boolean) as {
    dot: string;
    name: string;
    val: string;
    cur: number | null;
    before?: number | null;
    formulas: Formula[];
    lead?: boolean;
  }[];

  const revPct = revenue != null ? Math.max(0, Math.min(100, pctOf(revenue))) : 100;

  return (
    <div className="card border-line bg-panel mb-4 rounded-xl border p-4">
      {/* Headline turnover lives in the legend below — this row carries the
          compared span plus any rank/tag. */}
      {(rank || tag || yrLabel) && (
        <div className="text-muted mb-2 flex flex-wrap items-baseline gap-2 text-[13px]">
          {yrLabel && (
            <span className="text-[11px] font-semibold tracking-[.12em] uppercase">
              {yrLabel}
            </span>
          )}
          {rank && (
            <span className="text-gold text-[12px] font-semibold">
              #{rank.pos}/{rank.total}
            </span>
          )}
          {tag && (
            <span className="border-line bg-panel2 text-muted rounded-[5px] border px-1.5 py-px align-middle text-[10px] font-semibold">
              {tag}
            </span>
          )}
        </div>
      )}

      <div className="flex min-h-[90px] gap-3">
        <div className="border-line flex w-[26px] flex-none flex-col-reverse overflow-hidden rounded-[6px] border">
          {segments.map((seg, i) => (
            <div
              key={i}
              className={cn("min-h-1 w-full", seg.cls)}
              style={{ flex: Math.max(seg.pct, 3).toFixed(2) }}
            />
          ))}
        </div>

        {/* Gold revenue bracket, only when a pass-through slice exists. */}
        {pass > 0 && revenue != null && (
          <div className="flex w-[84px] flex-none flex-col-reverse">
            <div
              className="border-gold before:bg-gold after:bg-gold relative flex items-center border-l-2 pl-[7px] before:absolute before:top-0 before:left-0 before:h-0.5 before:w-1.5 before:content-[''] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-1.5 after:content-['']"
              style={{ flex: revPct.toFixed(2) }}
            >
              <span className="text-ink text-[11px] leading-[1.25] font-semibold">
                Revenue {fmtEur(revenue)} <Yoy cur={revenue} prev={prev.R} />
              </span>
            </div>
            <div style={{ flex: (100 - revPct).toFixed(2) }} />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col-reverse">
          {legend.map((item) => (
            <div key={item.name} className="flex min-h-8 flex-1 items-center gap-[9px]">
              <span
                className={cn(
                  "flex-none rounded-[3px]",
                  item.lead ? "h-[15px] w-[15px]" : "h-[11px] w-[11px]",
                  item.dot,
                )}
              />
              <div
                className={cn(
                  "flex min-w-0 flex-col",
                  item.lead ? "text-[19px] leading-tight" : "text-[13px]",
                )}
              >
                {/* % mode promotes the YoY to the headline and drops the
                    absolute figures to the sub line, like the KPI cards. */}
                {mode === "change" ? (
                  <>
                    <b>
                      {item.name}{" "}
                      <Yoy cur={item.cur} prev={item.before} big={item.lead} />
                    </b>
                    {item.before != null && item.before > 0 && (
                      <span className="text-muted text-[11px] font-normal">
                        {fmtEur(item.before)} → {item.val}
                      </span>
                    )}
                  </>
                ) : (
                  <b>
                    {item.name} {item.val} <Yoy cur={item.cur} prev={item.before} />
                  </b>
                )}
              </div>
              {/* Sits after the figure, not under it: the row is a single
                  baseline and the popover anchors itself inside the viewport. */}
              {!!item.formulas.length && <FormulaPopover formulas={item.formulas} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
