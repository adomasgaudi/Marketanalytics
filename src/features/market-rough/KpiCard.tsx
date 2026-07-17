"use client";

import { cn } from "@/lib/cn";

export type KpiMode = "value" | "change";

/** One legacy market KPI card: #/% mode swaps value and change lines. */
export type KpiCardData = {
  label: string;
  valueText: string;
  changeText: string;
  /** "€760k → €714k" — shown as the sub line in % mode. */
  rangeText: string;
  changeCls: "pos" | "neg" | "";
  formula?: string;
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
      {card.formula && (
        <details className="kpi-f group mt-[7px]">
          <summary className="text-muted group-open:text-ink inline-flex cursor-pointer list-none items-center gap-1 text-[10.5px] [&::-webkit-details-marker]:hidden">
            <span className="font-bold italic">ƒ</span> formula
            <span className="text-[9px] group-open:hidden">▸</span>
            <span className="hidden text-[9px] group-open:inline">▾</span>
          </summary>
          <div className="text-muted mt-[5px] text-[11px] leading-[1.45]">
            {card.formula}
          </div>
        </details>
      )}
    </article>
  );
}

/** The right-aligned #/% pill above a KPI grid. */
export function KpiModeToggle({
  mode,
  onChange,
}: {
  mode: KpiMode;
  onChange: (mode: KpiMode) => void;
}) {
  const btn = (value: KpiMode, label: string, title: string) => (
    <button
      type="button"
      title={title}
      onClick={() => onChange(value)}
      className={cn(
        "h-7 w-[34px] cursor-pointer border-none text-[12px] font-bold transition-colors",
        mode === value ? "bg-accent text-white" : "bg-panel2 text-muted",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="-mt-1 mb-2 flex items-center justify-end">
      <div className="border-line bg-panel divide-line inline-flex divide-x overflow-hidden rounded-full border">
        {btn("value", "#", "Show number")}
        {btn("change", "%", "Show percent change")}
      </div>
    </div>
  );
}
