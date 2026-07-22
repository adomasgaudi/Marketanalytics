"use client";

import { useMemo, useState } from "react";
import { SOURCES, YEARS } from "./model-data";
import { buildModelSheet } from "./model-sheets";
import { SODRA_YEARS } from "./sodra-data";
import { buildSodraSheet } from "./sodra-sheets";
import { WorkbookViewer } from "./WorkbookViewer";

/**
 * The rebuilt dataset. Deliberately NOT its own table — it hands sheets to the
 * workbook viewer and gets that grid's whole toolbox back: freeze panes,
 * search, sort, column widths, hover detail and full screen.
 *
 * What this file owns is the two things that are properties of THIS dataset
 * rather than of the grid: which way round it reads, and which year is shown.
 * Both have to live here because flipped, the years are rows — and the
 * viewer's own year filter can only drop columns.
 */
export function ModelSheet() {
  const [yearsDown, setYearsDown] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  // The employer's +1,77% column. Off by default because it is the payroll
  // again at 1,0177x; the multiplier is in the derived figures regardless.
  const [showOptional, setShowOptional] = useState(false);

  // Two tabs: the registry figures, and Sodra's monthly record with the yearly
  // wage bill summed out of it. The year filter drives both — on Sodra it also
  // switches that sheet from yearly rollups to the twelve months behind them.
  const sheets = useMemo(
    () => [...buildModelSheet(yearsDown ? "down" : "across", year, showOptional), buildSodraSheet(yearsDown ? "down" : "across", year)],
    [yearsDown, year, showOptional],
  );

  return (
    <WorkbookViewer
      sheets={sheets}
      // Its own freeze/width memory — the source workbook's 100-column layout
      // means nothing to a 4-column sheet.
      layoutId="model"
      // The years are already filtered above, so the viewer must not filter
      // them a second time.
      initialYear=""
      hideYearFilter
      // Two registries feed this sheet and they disagree on how current they
      // are, so the legend is not decoration: without it a 2025 figure and a
      // 2019 one look equally authoritative.
      caption={
        <div className="source-legend">
          {SOURCES.map((source) => (
            <span key={source.id}>
              <b>{source.mark}</b> {source.label} · scraped {source.at.slice(0, 10)}
            </span>
          ))}
        </div>
      }
      extraActions={
        <>
          <select
            className={year ? "year-select on" : "year-select"}
            value={year ?? ""}
            onChange={(event) => setYear(Number(event.target.value) || null)}
            aria-label="Show a single year"
            title="Keep one year and drop the rest — works whichever way the sheet reads"
          >
            <option value="">All years</option>
            {[...new Set([...YEARS, ...SODRA_YEARS])]
              .sort((a, b) => b - a)
              .map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
          </select>
          <button
            className={showOptional ? "ghost-button on" : "ghost-button"}
            onClick={() => setShowOptional((on) => !on)}
            aria-pressed={showOptional}
            title="Show the employer's +1,77% Sodra column. It is always inside the derived figures; this only puts it on screen."
          >
            +1,77%
          </button>
          <button
            className={yearsDown ? "ghost-button on" : "ghost-button"}
            onClick={() => setYearsDown((on) => !on)}
            aria-pressed={yearsDown}
            title="Swap the axes: years down the side, metrics across the top"
          >
            ⇄ {yearsDown ? "Years down" : "Years across"}
          </button>
        </>
      }
    />
  );
}
