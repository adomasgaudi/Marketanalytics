"use client";

import { useDashboardParams, type ViewMode } from "./useDashboardParams";

/** Which page's view mode to read/write — Markets and Companies are independent. */
export type ViewScope = "mkt" | "co";

export function useViewMode(scope: ViewScope): [ViewMode, (v: ViewMode) => void] {
  const [{ mktView, coView }, setParams] = useDashboardParams(0);
  const view = scope === "mkt" ? mktView : coView;
  const set = (v: ViewMode) =>
    setParams(scope === "mkt" ? { mktView: v } : { coView: v });
  return [view, set];
}

/**
 * The hero's clickable dotted-underline word: tapping it switches per-year ↔
 * all-years, exactly like the legacy #mktViewWord / #coViewWord.
 */
export function ViewWord({ scope }: { scope: ViewScope }) {
  const [view, set] = useViewMode(scope);
  const toggle = () => set(view === "year" ? "all" : "year");
  return (
    <span
      role="button"
      tabIndex={0}
      title="Tap to switch per-year / all-time"
      onClick={toggle}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
      className="text-accent cursor-pointer whitespace-nowrap underline decoration-dotted underline-offset-[5px] hover:opacity-[.82]"
    >
      {view === "year" ? "per year" : "all years"}
    </span>
  );
}

/** Nav sub-label that follows one scope's view mode ("per year" / "all years"). */
export function ViewSub({ scope }: { scope: ViewScope }) {
  const [view] = useViewMode(scope);
  return <>{view === "year" ? "per year" : "all years"}</>;
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
    <section className="mb-7">
      <h2
        className={`border-line mt-7 mb-3.5 border-b pb-2 text-[18px] font-bold ${gold ? "text-gold" : ""}`}
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
