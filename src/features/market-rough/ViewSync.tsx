"use client";

import { useDashboardParams, type ViewMode } from "./useDashboardParams";

/** Which page's view mode to read/write — Markets and Companies are independent. */
export type ViewScope = "mkt" | "co";

export function useViewMode(scope: ViewScope): [ViewMode, (v: ViewMode) => void] {
  const [{ mktView, coView }, setParams] = useDashboardParams();
  const view = scope === "mkt" ? mktView : coView;
  const set = (v: ViewMode) =>
    setParams(scope === "mkt" ? { mktView: v } : { coView: v });
  return [view, set];
}

/** The current time scope shown inside a hero title. */
export function ViewLabel({
  scope,
  yearLabel = "per year",
}: {
  scope: ViewScope;
  /** What to show in per-year mode. Markets names the actual year ("in 2025");
      Companies keeps the abstract "per year". */
  yearLabel?: string;
}) {
  const [view] = useViewMode(scope);
  return <>{view === "year" ? yearLabel : "all years"}</>;
}

/** Explicit action below the title; the label names the destination. */
export function ViewSwitch({ scope }: { scope: ViewScope }) {
  const [view, set] = useViewMode(scope);
  const next = view === "year" ? "all" : "year";
  return (
    <button
      type="button"
      onClick={() => set(next)}
      className="text-accent mt-3 cursor-pointer text-[13px] font-semibold underline decoration-dotted underline-offset-4 hover:decoration-solid"
    >
      {view === "year" ? "See all years together" : "See for a single year"}
    </button>
  );
}

/**
 * Section card whose visible panel is the scope's view mode: panel 0 =
 * per-year, panel 1 = all-time. Legacy default mode shows NO tab row — the
 * hero word switches; the heading just gets a hairline underneath.
 */
export function ViewGroupCard({
  title,
  gold,
  hoisted,
  scope,
  tabs,
}: {
  title: string;
  gold?: boolean;
  hoisted?: React.ReactNode;
  scope: ViewScope;
  tabs: { label: string; content: React.ReactNode }[];
}) {
  const [view] = useViewMode(scope);
  const active = view === "year" ? 0 : 1;

  return (
    <section className="my-4">
      {/* Legacy .group-sum: 19px/700, 16px 2px padding, hairline, 12px below. */}
      <h2
        className={`border-line mb-3 flex items-center gap-2.5 border-b px-0.5 py-4 text-[19px] font-bold ${gold ? "text-gold" : ""}`}
      >
        {title}
      </h2>
      {hoisted}
      {tabs.map((tab, i) => (
        <div key={tab.label} hidden={i !== active}>
          {tab.content}
        </div>
      ))}
    </section>
  );
}
