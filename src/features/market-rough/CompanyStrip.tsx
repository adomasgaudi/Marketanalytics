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

/**
 * Every tracked agency on one scrolling line, largest first, each carrying its
 * turnover for the selected year. It answers the question the headline count
 * raises and then refuses to answer — "132 agencies, but WHICH?" — without
 * costing a page of vertical space.
 *
 * Follows the bottom bar's segment scope, so narrowing to PR narrows the strip
 * to the agencies that do PR, and says so in the count.
 */
export function CompanyStrip({ model: legacyModel }: { model: MarketModel }) {
  const model = useSourcedModel(legacyModel);
  const [{ year, segment, companies }] = useDashboardParams(model.last);

  // Turnover by default, so the strip opens on the names worth knowing and a
  // company's place along it is itself information; clicking the sort label
  // flips to alphabetical for when you're LOOKING SOMEONE UP, not browsing.
  const [alpha, setAlpha] = useState(false);
  const rows = model.rows
    .filter((row) => row.year === year)
    .filter((row) => !segment || row.activities.includes(segment))
    .sort((a, b) =>
      alpha
        ? a.brand.localeCompare(b.brand, undefined, { sensitivity: "base" })
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

  return (
    <section className="mb-10" aria-label="Tracked agencies">
      <div className="text-muted mb-2 flex items-baseline gap-2 text-[11px] font-semibold tracking-[.18em] uppercase">
        <span>{segment ? `${segName(segment)} agencies` : "Every agency"}</span>
        <span className="text-[10px] tracking-normal normal-case opacity-70">
          {rows.length} · {year} ·{" "}
          <button
            type="button"
            onClick={() => setAlpha((v) => !v)}
            title="Toggle sort order"
            className="hover:text-accent cursor-pointer underline decoration-dotted underline-offset-2 transition-colors"
          >
            {alpha ? "alphabetical" : "by turnover"}
          </button>
        </span>
      </div>

      {/* THREE rows that scroll together, not one row that wraps. `grid-flow-col`
          fills down-then-across, so the band moves as one and the ranking still
          reads down each column then rightward. A wrapping flex would instead
          run out of width, break to a second line, and only then scroll — which
          puts rank 2 underneath rank 1 and hides the order.

          Scrollbar hidden: the band is visibly cut off at the right edge, which
          says "there is more" more quietly than a bar does. */}
      <div
        ref={stripRef}
        className="-mx-1 grid [scrollbar-width:none] [grid-auto-columns:max-content] grid-flow-col grid-rows-3 gap-1.5 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
      >
        {rows.map((row) => (
          <Link
            key={row.brand}
            data-selected={companies.includes(row.brand) || undefined}
            href={`/companies?companies=${encodeURIComponent(row.brand)}&year=${year}`}
            title={`${row.company} — ${row.activities.map(segName).join(", ") || "no segment"}`}
            className={`border-line bg-panel hover:border-accent hover:text-accent flex flex-none items-baseline gap-2 rounded-full border py-1 pr-3 pl-3 text-[12.5px] font-medium whitespace-nowrap transition-colors ${companies.includes(row.brand) ? "border-accent text-accent" : ""}`}
          >
            {row.brand}
            <span className="text-muted text-[11px] tabular-nums">
              {row.revenue == null ? "—" : fmtEur(row.revenue)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
