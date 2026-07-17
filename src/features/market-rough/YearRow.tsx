"use client";

import { Pill, PillRow } from "@/components/ui/pills";
import { useDashboardParams } from "./useDashboardParams";

/**
 * Year selector. Writes to the URL, so the chosen year is shareable and
 * survives a refresh.
 */
export function YearRow({
  years,
  defaultYear,
}: {
  years: number[];
  defaultYear: number;
}) {
  const [{ year }, setParams] = useDashboardParams(defaultYear);

  return (
    <PillRow label="Year" className="mb-3">
      {years.map((option) => (
        <Pill
          key={option}
          selected={option === year}
          onClick={() => setParams({ year: option })}
        >
          {option}
        </Pill>
      ))}
    </PillRow>
  );
}
