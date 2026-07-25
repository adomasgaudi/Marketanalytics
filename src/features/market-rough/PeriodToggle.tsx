"use client";

import { useEffect, useState } from "react";
import { Seg } from "@/components/ui/seg";
import { useDashboardParams } from "./useDashboardParams";

/**
 * Opt-in switch for controls that are ours, not the reader's: `?dev=1`.
 *
 * NODE_ENV was the obvious gate and the wrong one — the owner develops against
 * `pnpm dev`, so "hidden in production" still meant "always on screen for the
 * person asking it to go away". A URL flag is visible, testable in the built
 * site, and identical in both environments. Read after mount so the prerendered
 * HTML (which has no query string) and the first client render agree.
 */
function useDevFlag() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(new URLSearchParams(window.location.search).get("dev") === "1");
  }, []);
  return on;
}

/**
 * Year / month for the money figures. It lives ON the card rather than in the
 * bottom bar because it is a property of these numbers, not of the page — and
 * because it COMPOSES with the aggregation basis instead of replacing it, so
 * "per company, per month" is a reading you can reach.
 *
 * Month is the year over twelve. Nothing in the dataset carries monthly
 * turnover or profit — those are annual registry filings — so this is a
 * run-rate, and the tooltip says so rather than implying a measurement.
 *
 * HIDDEN unless `?dev=1` — dev server included. `?per=month` still works on
 * its own, so the monthly reading stays reachable without the switch.
 */
export function PeriodToggle({ defaultYear }: { defaultYear: number }) {
  const [{ per }, setParams] = useDashboardParams(defaultYear);
  const dev = useDevFlag();
  if (!dev) return null;
  return (
    <Seg
      label="Period"
      btnClassName="px-2.5 py-0.5 text-[11px]"
      options={[
        { value: "year" as const, title: "Figures for the whole year", label: "/ year" },
        {
          value: "month" as const,
          title: "The year divided by 12 — an average month, not a measured one",
          label: "/ month",
        },
      ]}
      value={per}
      onChange={(value) => setParams({ per: value })}
    />
  );
}
