"use client";

import { cn } from "@/lib/cn";
import { type Formula, FormulaPopover } from "./Formula";

export type KpiMode = "value" | "change";

/** One legacy market KPI card: #/% mode swaps value and change lines. */
export type KpiCardData = {
  label: string;
  valueText: string;
  changeText: string;
  /** "€760k → €714k" — shown as the sub line in % mode. */
  rangeText: string;
  changeCls: "pos" | "neg" | "";
  /** One entry per distinct formula — a compound explanation ("X ÷ N. YoY =
      …") is two formulas, not one sentence. */
  formulas?: Formula[];
};

export function KpiCard({ card, mode }: { card: KpiCardData; mode: KpiMode }) {
  const showChange = mode === "change";
  const main = showChange ? card.changeText : card.valueText;
  const sub = showChange ? card.rangeText : card.changeText;

  return (
    <article className="border-line bg-panel rounded-[10px] border px-[13px] py-[11px]">
      <div className="text-muted text-[11px] tracking-[.05em] uppercase">
        {card.label}
      </div>
      <div className="mt-0.5 text-[21px] font-bold">{main}</div>
      <div
        className={cn(
          "mt-0.5 text-[12px]",
          card.changeCls === "pos" && "text-green",
          card.changeCls === "neg" && "text-red",
        )}
      >
        {sub}
      </div>
      {!!card.formulas?.length && <FormulaPopover formulas={card.formulas} />}
    </article>
  );
}

/** The right-aligned #/% pill above a KPI grid. */
export function KpiModeToggle({
  mode,
  onChange,
  /** No prior year to compare against — % has nothing to show. */
  changeDisabled,
}: {
  mode: KpiMode;
  onChange: (mode: KpiMode) => void;
  changeDisabled?: boolean;
}) {
  const btn = (value: KpiMode, label: string, title: string) => {
    const off = value === "change" && changeDisabled;
    return (
      <button
        type="button"
        disabled={off}
        title={off ? "No earlier year to compare against" : title}
        onClick={() => onChange(value)}
        className={cn(
          // 13.33px mirrors the legacy's computed size (its font shorthand falls
          // back to the inherited size); divider is border-right, as there.
          "border-line h-7 w-[34px] border-r text-[13.33px] font-bold transition-colors last:border-r-0",
          off ? "bg-panel2 text-muted cursor-not-allowed opacity-40" : "cursor-pointer",
          !off && mode === value ? "bg-accent text-white" : "bg-panel2 text-muted",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="-mt-1 mb-2 flex items-center justify-end">
      <div className="border-line bg-panel inline-flex overflow-hidden rounded-full border">
        {btn("value", "€", "Show euro value")}
        {btn("change", "%", "Show percent change")}
      </div>
    </div>
  );
}
