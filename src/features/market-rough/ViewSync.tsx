"use client";

import { useDashboardParams } from "./useDashboardParams";

/**
 * The hero's clickable dotted-underline word: tapping it switches per-year ↔
 * all-years, exactly like the legacy #mktViewWord / #coViewWord.
 */
export function ViewWord() {
  const [{ view }, setParams] = useDashboardParams(0);
  return (
    <span
      role="button"
      tabIndex={0}
      title="Tap to switch per-year / all-time"
      onClick={() => setParams({ view: view === "year" ? "all" : "year" })}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") &&
        setParams({ view: view === "year" ? "all" : "year" })
      }
      className="text-accent cursor-pointer whitespace-nowrap underline decoration-dotted underline-offset-[5px] hover:opacity-80"
    >
      {view === "year" ? "per year" : "all years"}
    </span>
  );
}

/** Nav sub-label that follows the view mode ("per year" / "all years"). */
export function ViewSub() {
  const [{ view }] = useDashboardParams(0);
  return <>{view === "year" ? "per year" : "all years"}</>;
}

/**
 * GroupCard whose active tab is the URL's view mode: tab 0 = per-year,
 * tab 1 = all-time. Clicking a tab and clicking the hero word stay in sync.
 */
export function ViewGroupCard({
  title,
  gold,
  hoisted,
  tabs,
}: {
  title: string;
  gold?: boolean;
  hoisted?: React.ReactNode;
  tabs: { label: string; content: React.ReactNode }[];
}) {
  const [{ view }] = useDashboardParams(0);
  const active = view === "year" ? 0 : 1;

  // Legacy default mode shows NO tab row — the hero's per-year/all-years word
  // is the only switcher; the heading just gets a hairline underneath.
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
