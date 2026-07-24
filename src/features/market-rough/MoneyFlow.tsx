"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Formula, FormulaPopover } from "./Formula";
import { fmtEur, fmtPct } from "./format";
import type { Rank } from "./metrics";
import { revBreakdown } from "./money-flow-breakdown";
import { MoneyFlowBar } from "./MoneyFlowBar";

/** One nested row under Revenue: a slice of it, coloured to match the bar. */
type RevPart = {
  cls: string;
  name: string;
  v: number;
  /** Which entry of `ranks` this row reads in "#" mode. */
  rk?: "T" | "R" | "P" | "payroll" | "opex" | "tax";
  cur?: number | null;
  before?: number | null;
  formulas?: Formula[];
};

/** Which basis every figure on the card is written in. */
type Basis = "eur" | "pct" | "rank";

/** The card's rows, as rank keys. Anything absent simply has no rank to show. */
export type MoneyFlowRanks = Partial<
  Record<"T" | "R" | "P" | "payroll" | "opex" | "tax", Rank | null>
>;

/** Previous-year figures on the same basis, for the per-item YoY chips. */
export type MoneyFlowPrev = { T?: number | null; R?: number | null; P?: number | null };

type Props = {
  /** Turnover. Falls back to revenue when missing (as the legacy does). */
  turnover: number | null;
  revenue: number | null;
  profit: number | null;
  /** Sodra wage bill — subdivides the revenue band in the bar only. */
  payroll?: number | null;
  prev?: MoneyFlowPrev;
  /** Rank chip after the turnover headline (company view). */
  rank?: Rank | null;
  /** Per-row market ranks. Their presence is what enables the "#" basis. */
  ranks?: MoneyFlowRanks;
  /** Small scope tag after the headline, e.g. "per company · 113 cos". */
  tag?: string;
  /** Controls that belong to the figures themselves — the year/month unit —
      rather than to the page. Rendered in the card's own header row. */
  actions?: React.ReactNode;
  /** "2024 → 2025" — the span the YoY figures compare. */
  yrLabel?: string;
  /** Dev-mode formula folds, keyed by legend row. Built by `moneyFormulas`. */
  formulas?: Partial<Record<"T" | "R" | "P", Formula[]>>;
};

/** €/%/# pill. Mirrors KpiModeToggle's shape so the two read as one control. */
function BasisToggle({
  basis,
  onChange,
  rankable,
}: {
  basis: Basis;
  onChange: (b: Basis) => void;
  rankable: boolean;
}) {
  const btn = (value: Basis, label: string, title: string) => {
    const off = value === "rank" && !rankable;
    return (
      <button
        type="button"
        disabled={off}
        title={off ? "No market to rank against here" : title}
        onClick={() => onChange(value)}
        className={cn(
          "border-line h-6 w-[30px] border-r text-[12px] font-bold transition-colors last:border-r-0",
          off ? "bg-panel2 text-muted cursor-not-allowed opacity-40" : "cursor-pointer",
          !off && basis === value ? "bg-accent text-white" : "bg-panel2 text-muted",
        )}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="border-line bg-panel ml-auto inline-flex overflow-hidden rounded-full border">
      {btn("eur", "€", "Show euro amounts")}
      {btn("pct", "%", "Show each figure as a share of turnover")}
      {btn("rank", "#", "Show this company's rank on each figure")}
    </div>
  );
}

function Yoy({ cur, prev }: { cur: number | null; prev?: number | null }) {
  if (cur == null || prev == null || prev <= 0) return null;
  const ratio = cur / prev - 1;
  return (
    <span
      className={cn("text-[12px] font-semibold", ratio >= 0 ? "text-green" : "text-red")}
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
  yrLabel,
  formulas = {},
  payroll,
  ranks,
  actions,
}: Props) {
  const [basis, setBasis] = useState<Basis>("eur");
  // Hooks run before the guard, so the early return stays where it was.
  if (revenue == null && turnover == null) return null;
  const T = turnover ?? revenue!;

  const rankable = !!ranks && Object.values(ranks).some((r) => r != null);
  const mode: Basis = basis === "rank" && !rankable ? "eur" : basis;

  /**
   * Every figure on the card goes through here. % is always of turnover — that
   * is the whole point of the mode, so a nested row reads as its share of the
   * top line, not of its own parent. Rank falls back to the euro amount when
   * that particular row has no rank, rather than blanking the row out.
   */
  const show = (v: number, key?: keyof MoneyFlowRanks) => {
    if (mode === "pct") return T > 0 ? `${((v / T) * 100).toFixed(1)}%` : "–";
    const r = key && ranks?.[key];
    if (mode === "rank") return r ? `#${r.pos}/${r.total}` : fmtEur(v);
    return fmtEur(v);
  };

  const pass =
    turnover != null && revenue != null && turnover > revenue ? turnover - revenue : 0;

  // Bar bottom→top: Net profit, revenue sub-slices, pass-through turnover.
  const profitSeg = profit != null && profit > 0 ? profit : 0;
  const revRest = revenue != null ? Math.max(0, revenue - profitSeg) : 0;
  const revParts = revBreakdown(revRest, payroll);
  // Raw values, not percentages: the SVG divides by the total itself, so no
  // rounding happens before it reaches the geometry. `fill` because an SVG
  // rect takes fill-*, not bg-*.
  const revSlices =
    revParts && revRest > 0
      ? [
          { fill: "fill-mf-rev-tax", value: revParts.profitTax },
          { fill: "fill-mf-rev-opex", value: revParts.opex },
          { fill: "fill-mf-rev-labour", value: revParts.employer },
        ].filter((s) => s.value > 0)
      : revRest > 0
        ? [{ fill: "fill-mf-rev", value: revRest }]
        : [];
  // Bottom-up: profit sits at the foot of the bar, then the costs above it.
  const revGroup = [
    profitSeg > 0 && { fill: "fill-green", value: profitSeg },
    ...revSlices,
  ].filter(Boolean) as { fill: string; value: number }[];

  const folds = (k: "T" | "R" | "P") => [...(formulas[k] ?? [])];

  // The same split the SVG draws with, so the legend and the bar cannot drift.
  const barTotal = revGroup.reduce((sum, seg) => sum + seg.value, 0) + Math.max(0, pass);
  const passShare = barTotal > 0 ? Math.max(0, pass) / barTotal : 0;

  const legend = [
    {
      dot: "bg-mf-turn-line",
      name: "Turnover",
      val: show(T, "T"),
      cur: turnover,
      before: prev.T,
      formulas: folds("T"),
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

  return (
    <div className="card border-line bg-panel mb-4 rounded-xl border p-4">
      {/* Headline turnover lives in the legend below — this row carries the
          compared span plus any rank/tag. Always rendered: the basis toggle
          lives here even on cards that carry no span, rank or tag. */}
      <div className="text-muted mb-2 flex flex-wrap items-center gap-2 text-[13px]">
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
        {/* The period unit sits with the €/%/# basis: both describe how these
            figures are expressed, as opposed to what the page is scoped to. */}
        {actions}
        <BasisToggle basis={mode} onChange={setBasis} rankable={rankable} />
      </div>

      <div className="flex min-h-[90px] gap-3">
        {/* Bar + brackets are one SVG: they share a coordinate space, so the
            bracket meets the band edge exactly and a 1% slice draws at 1%
            instead of being floored to something visible. */}
        <MoneyFlowBar
          revenue={revGroup.map((seg) => ({ cls: seg.fill, value: seg.value }))}
          pass={pass}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Turnover holds the pass-through span, so the revenue block below
              it begins at exactly the height the gold bracket starts. Flex
              rather than a fixed offset: when the text needs more room than its
              share, the whole row grows instead of the two drifting apart. */}
          <div className="flex items-start" style={{ flex: Math.max(passShare, 0.001) }}>
            {legend.map((item) => (
              <div key={item.name} className="flex items-center gap-[9px]">
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
                  <b>
                    {item.name} {item.val} <Yoy cur={item.cur} prev={item.before} />
                  </b>
                </div>
                {/* After the figure, not under it: the row is a single baseline
                    and the popover anchors itself inside the viewport. */}
                {!!item.formulas.length && <FormulaPopover formulas={item.formulas} />}
              </div>
            ))}
          </div>

          {revenue != null && (
            <div
              className="flex flex-col gap-[6px]"
              style={{ flex: Math.max(1 - passShare, 0.001) }}
            >
              {/* Revenue, one level under Turnover: the money the agency keeps
                  out of what it billed. Its own parts step in once more. */}
              <div className="flex items-center gap-[9px]">
                <span className="bg-mf-rev h-[11px] w-[11px] flex-none rounded-[3px]" />
                <span className="text-[13px]">
                  <b>
                    Revenue {show(revenue, "R")} <Yoy cur={revenue} prev={prev.R} />
                  </b>
                </span>
                {!!folds("R").length && <FormulaPopover formulas={folds("R")} />}
              </div>
              {(
                [
                  profit != null && {
                    cls: "bg-green",
                    name: "Net profit",
                    v: profit,
                    rk: "P",
                    cur: profit,
                    before: prev.P,
                    formulas: folds("P"),
                  },
                  revParts && {
                    cls: "bg-mf-rev-labour",
                    name: "Payroll",
                    v: revParts.employer,
                    rk: "payroll",
                  },
                ] as (RevPart | false | null)[]
              )
                .filter((part): part is RevPart => !!part && part.v > 0)
                .map((part) => (
                  <div key={part.name} className="flex items-center gap-[9px] pl-[22px]">
                    <span
                      className={cn("h-[9px] w-[9px] flex-none rounded-[2px]", part.cls)}
                    />
                    <span className="text-muted text-[12.5px]">
                      {part.name}{" "}
                      <b className="text-ink font-semibold">{show(part.v, part.rk)}</b>{" "}
                      {part.cur != null && <Yoy cur={part.cur} prev={part.before} />}
                    </span>
                    {!!part.formulas?.length && (
                      <FormulaPopover formulas={part.formulas} />
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
