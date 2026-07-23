"use client";

import Link from "next/link";
import { fmtEur } from "./format";
import { useSourcedModel } from "./rebuilt-source";
import { segName } from "./segments";
import type { MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

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
  const [{ year, segment }] = useDashboardParams(model.last);

  const rows = model.rows
    .filter((row) => row.year === year)
    .filter((row) => !segment || row.activities.includes(segment))
    // Ranked by turnover, so the strip opens on the names worth knowing and a
    // company's place along it is itself information.
    .sort((a, b) => (b.revenue ?? -1) - (a.revenue ?? -1));

  if (!rows.length) return null;

  return (
    <section className="mb-10" aria-label="Tracked agencies">
      <div className="text-muted mb-2 flex items-baseline gap-2 text-[11px] font-semibold tracking-[.18em] uppercase">
        <span>{segment ? `${segName(segment)} agencies` : "Every agency"}</span>
        <span className="text-[10px] tracking-normal normal-case opacity-70">
          {rows.length} · {year} · by turnover
        </span>
      </div>

      {/* One line, scrolled horizontally. The scrollbar is hidden because the
          row is visibly cut off at the right edge, which says "there is more"
          more quietly than a bar does. */}
      <div className="-mx-1 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
        {rows.map((row) => (
          <Link
            key={row.brand}
            href={`/companies?companies=${encodeURIComponent(row.brand)}&year=${year}`}
            title={`${row.company} — ${row.activities.map(segName).join(", ") || "no segment"}`}
            className="border-line bg-panel hover:border-accent hover:text-accent flex flex-none items-baseline gap-2 rounded-full border py-1 pr-3 pl-3 text-[12.5px] font-medium whitespace-nowrap transition-colors"
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
