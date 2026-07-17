"use client";

import { GroupCard } from "@/components/ui/group";
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
export function ViewGroupCard(props: {
  title: string;
  gold?: boolean;
  hoisted?: React.ReactNode;
  tabs: { label: string; content: React.ReactNode }[];
}) {
  const [{ view }, setParams] = useDashboardParams(0);
  return (
    <GroupCard
      {...props}
      active={view === "year" ? 0 : 1}
      onChange={(i) => setParams({ view: i === 0 ? "year" : "all" })}
    />
  );
}
