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

/** Market aggregation: average per company, per employee, or the whole market. */
export const MARKET_MODES = ["avg", "emp", "whole"] as const;
export type MarketMode = (typeof MARKET_MODES)[number];

/**
 * The dashboard's selections, held in the URL so a view is shareable and
 * survives a refresh. Only what CHANGES WHAT IS SHOWN belongs here — ephemeral
 * UI (open dropdown, hover) stays in local component state.
 *
 * `shallow` defaults to true: the URL updates client-side with no server
 * round-trip, so this costs no more than useState.
 */
export function useDashboardParams(defaultYear: number) {
  return useQueryStates({
    year: parseAsInteger.withDefault(defaultYear),
    basis: parseAsStringLiteral(BASES).withDefault("total"),
    market: parseAsStringLiteral(MARKET_MODES).withDefault("avg"),
    /** Brands being compared; empty means the default company. */
    companies: parseAsArrayOf(parseAsString).withDefault([]),
    /** Segment filter; empty means no filter (all segments). */
    segments: parseAsArrayOf(parseAsString).withDefault([]),
  });
}
