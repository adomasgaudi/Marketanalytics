"use client";

import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { DEFAULT_YEAR } from "./year-policy";

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
export const PERIODS = ["year", "month"] as const;
export type Period = (typeof PERIODS)[number];
export type MarketMode = (typeof MARKET_MODES)[number];

/**
 * The dashboard's selections, held in the URL so a view is shareable and
 * survives a refresh. Only what CHANGES WHAT IS SHOWN belongs here — ephemeral
 * UI (open dropdown, hover) stays in local component state.
 *
 * `shallow` defaults to true: the URL updates client-side with no server
 * round-trip, so this costs no more than useState.
 */
/** Per-year vs all-years page mode — the legacy's clickable "per year" word. */
export const VIEWS = ["year", "all"] as const;
export type ViewMode = (typeof VIEWS)[number];

export function useDashboardParams() {
  return useQueryStates({
    year: parseAsInteger.withDefault(DEFAULT_YEAR),
    // Markets and Companies keep INDEPENDENT view modes, as the legacy's
    // separate mktNavMode / coNavMode labels do.
    mktView: parseAsStringLiteral(VIEWS).withDefault("all"),
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
    /**
     * Time unit for money figures. A SEPARATE axis from `market`: it composes
     * with all three of them, so "per company per month" is a reading and had
     * to stop being a fourth mutually-exclusive basis.
     *
     * "month" is the year over twelve — a run-rate, NOT a measured month.
     * Nothing here carries monthly turnover or profit; those are annual
     * registry filings. Sodra is monthly, but these cards aggregate a year.
     */
    per: parseAsStringLiteral(PERIODS).withDefault("year"),
  });
}
