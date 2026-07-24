"use client";

import type { MarketModel } from "./types";

/**
 * The dashboard now has ONE dataset: loadMarketData() builds the model straight
 * from data2/ (see data.ts), so there is no longer a legacy set to overlay or a
 * source toggle to honour. This hook stays as a thin passthrough only so the
 * many views that call `useSourcedModel(model)` need not each be rewired; it
 * returns the model it is given. Remove it if those call sites are ever cleaned
 * up to use the model prop directly.
 */
export function useSourcedModel(model: MarketModel): MarketModel {
  return model;
}
