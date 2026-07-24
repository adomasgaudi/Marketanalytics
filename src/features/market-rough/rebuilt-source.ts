"use client";

import type { MarketModel } from "./types";

/**
 * Historically this overlaid the data2 rebuild onto the legacy spreadsheet
 * model behind a dev toggle. The restaurants branch builds the model from
 * data2 directly in data.ts, so there is nothing left to overlay — the hook
 * stays only so the views keep one call signature.
 */
export function useSourcedModel(model: MarketModel): MarketModel {
  return model;
}
