"use client";

import { Seg } from "@/components/ui/seg";
import { useDashboardParams } from "./useDashboardParams";

/**
 * Year / month for the money figures. It lives ON the card rather than in the
 * bottom bar because it is a property of these numbers, not of the page — and
 * because it COMPOSES with the aggregation basis instead of replacing it, so
 * "per company, per month" is a reading you can reach.
 *
 * Month is the year over twelve. Nothing in the dataset carries monthly
 * turnover or profit — those are annual registry filings — so this is a
 * run-rate, and the tooltip says so rather than implying a measurement.
 */
export function PeriodToggle({ defaultYear }: { defaultYear: number }) {
  const [{ per }, setParams] = useDashboardParams(defaultYear);
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
