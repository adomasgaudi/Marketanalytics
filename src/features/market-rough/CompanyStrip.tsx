"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fmtEur } from "./format";
import { useSourcedModel } from "./rebuilt-source";
import { segName } from "./segments";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

/** Rows in the strip's grid — the F+←/→ column jump in BottomBar must match. */
export const STRIP_ROWS = 3;

const SORTS = ["turnover", "salary", "alphabetical"] as const;
type Sort = (typeof SORTS)[number];
const SORT_LABEL: Record<Sort, string> = {
  turnover: "by turnover",
  salary: "by salary",
  alphabetical: "alphabetical",
};

/** Next item in a list, wrapping — shared cycle behavior of the header words. */
function cycle<T>(list: readonly T[], current: T): T {
  return list[(list.indexOf(current) + 1) % list.length];
}

/**
 * Every tracked agency on one scrolling band. The whole header line is
 * clickable: the scope word cycles segments, the year cycles years, the sort
 * word cycles turnover → salary → A–Z. Chips TOGGLE into the compare pool
 * (multi-select, held in the URL); "Open in dashboard" carries them over.
 */
export function CompanyStrip({ model: legacyModel }: { model: MarketModel }) {
  const model = useSourcedModel(legacyModel);
  const [{ year, segment, companies }, setParams] = useDashboardParams(model.last);

  const [sort, setSort] = useState<Sort>("turnover");
  const rows = model.rows
    .filter((row) => row.year === year)
    .filter((row) => !segment || row.activities.includes(segment))
    .sort((a, b) =>
      sort === "alphabetical"
        ? a.brand.localeCompare(b.brand, undefined, { sensitivity: "base" })
        : sort === "salary"
          ? (b.avgSalary ?? -1) - (a.avgSalary ?? -1)
          : (b.revenue ?? -1) - (a.revenue ?? -1),
    );

  // Keyboard (F+arrows in the bottom bar) moves the selection without touching
  // the strip — follow it, so the selected pill is always in view.
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedKey = companies.join(",");
  useEffect(() => {
    stripRef.current
      ?.querySelector("[data-selected]")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selectedKey, year, segment]);

  if (!rows.length) return null;

  const word =
    "hover:text-accent cursor-pointer underline decoration-dotted underline-offset-2 transition-colors";
  const toggle = (brand: string) =>
    setParams({
      companies: companies.includes(brand)
        ? companies.filter((b) => b !== brand)
        : [...companies, brand],
    });

  return (
    <section className="mb-10" aria-label="Tracked agencies">
      <div className="text-muted mb-2 flex items-baseline gap-2 text-[11px] font-semibold tracking-[.18em] uppercase">
        {/* Scope word: cycles "" → each segment → back. */}
        <button
          type="button"
          title="Change segment"
          className={word}
          onClick={() =>
            setParams({ segment: cycle(["", ...model.segments], segment ?? "") })
          }
        >
          {segment ? `${segName(segment)} agencies` : "Every agency"}
        </button>
        <span className="text-[10px] tracking-normal normal-case opacity-70">
          <button
            type="button"
            title="Change year"
            className={word}
            onClick={() => setParams({ year: cycle(model.finYears, year) })}
          >
            {year}
          </button>{" "}
          ·{" "}
          <button
            type="button"
            onClick={() => setSort(cycle(SORTS, sort))}
            title="Change sort order"
            className={word}
          >
            {SORT_LABEL[sort]}
          </button>
        </span>
        {companies.length > 0 && (
          <Link
            href={`/companies?companies=${companies.map(encodeURIComponent).join(",")}&year=${year}`}
            className="text-accent text-[10px] tracking-normal normal-case hover:underline"
          >
            Open {companies.length} in dashboard →
          </Link>
        )}
      </div>

      {/* THREE rows that scroll together, not one row that wraps — the band
          moves as one and ranking reads down each column then rightward.
          Scrollbar hidden: the cut-off right edge says "there is more". */}
      <div
        ref={stripRef}
        className="-mx-1 grid [scrollbar-width:none] [grid-auto-columns:max-content] grid-flow-col grid-rows-3 gap-1.5 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
      >
        {rows.map((row) => (
          <button
            key={row.brand}
            type="button"
            data-selected={companies.includes(row.brand) || undefined}
            onClick={() => toggle(row.brand)}
            title={`${row.company} — ${row.activities.map(segName).join(", ") || "no segment"} — click to select`}
            className={`border-line bg-panel hover:border-accent hover:text-accent flex flex-none cursor-pointer items-baseline gap-2 rounded-full border py-1 pr-3 pl-3 text-[12.5px] font-medium whitespace-nowrap transition-colors ${companies.includes(row.brand) ? "border-accent text-accent" : ""}`}
          >
            {row.brand}
            <span className="text-muted text-[11px] tabular-nums">
              {sort === "salary"
                ? row.avgSalary == null
                  ? "—"
                  : `€${row.avgSalary}/mo`
                : row.revenue == null
                  ? "—"
                  : fmtEur(row.revenue)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
