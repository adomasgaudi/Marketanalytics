"use client";

import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";

/** How money figures are scaled. Mirrors the legacy's basis toggles. */
export const BASES = ["total", "emp"] as const;
export type Basis = (typeof BASES)[number];

/**
 * Market aggregation: the whole market, average per company, or per employee.
 * "whole" is the default — a page called Market Analytics should open on the
 * market's actual size, not on the average agency inside it.
 */
// Order IS the rendering order of the segmented control: whole first because
// it is the default and the largest reading, then the two ways of dividing it.
export const MARKET_MODES = ["whole", "avg", "emp"] as const;
export type MarketMode = (typeof MARKET_MODES)[number];

/**
 * The dashboard's selections, held in the URL so a view is shareable and
 * survives a refresh. Only what CHANGES WHAT IS SHOWN belongs here — ephemeral
 * UI (open dropdown, hover) stays in local component state.
 *
 * `shallow` defaults to true: the URL updates client-side with no server
 * round-trip, so this costs no more than useState.
 */
/**
 * Which dataset the money figures come from.
 *
 * "rebuilt" is the DEFAULT and what the site means by its figures: data2/,
 * sourced from Registrų centras (turnover, profit) and Sodra (the payroll,
 * summed month by month). "legacy" is data/data.json — the original
 * spreadsheet, kept only so the two can be compared, since its payroll
 * annualises a single month and overstates in ~78% of company-years.
 *
 * In the URL, so a comparison is shareable.
 */
export const SOURCES = ["legacy", "rebuilt"] as const;
export type DataSource = (typeof SOURCES)[number];

/** Per-year vs all-years page mode — the legacy's clickable "per year" word. */
export const VIEWS = ["year", "all"] as const;
export type ViewMode = (typeof VIEWS)[number];

export function useDashboardParams(defaultYear: number) {
  return useQueryStates({
    year: parseAsInteger.withDefault(defaultYear),
    // Markets and Companies keep INDEPENDENT view modes, as the legacy's
    // separate mktNavMode / coNavMode labels do.
    mktView: parseAsStringLiteral(VIEWS).withDefault("year"),
    coView: parseAsStringLiteral(VIEWS).withDefault("year"),
    basis: parseAsStringLiteral(BASES).withDefault("total"),
    market: parseAsStringLiteral(MARKET_MODES).withDefault("whole"),
    /** Brands being compared; empty means the default company. */
    companies: parseAsArrayOf(parseAsString).withDefault([]),
    /** Brands in the pool that are toggled OFF (hidden from charts). */
    off: parseAsArrayOf(parseAsString).withDefault([]),
    /** Segment filter; empty means no filter (all segments). */
    segments: parseAsArrayOf(parseAsString).withDefault([]),
    /** Scopes the cash-flow panel to one service segment; "" = whole market. */
    segment: parseAsString.withDefault(""),
    src: parseAsStringLiteral(SOURCES).withDefault("rebuilt"),
  });
}
