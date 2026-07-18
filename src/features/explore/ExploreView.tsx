"use client";

import { useState } from "react";
import { CompanySelector } from "../market-rough/CompanySelector";
import type { CompanyProfile } from "../market-rough/profile";
import type { MarketModel } from "../market-rough/types";
import { FieldData, type RekTabsFile } from "./FieldData";

/**
 * The client shell of the v3 Data-exploration page: the legacy rekView's
 * single-select company picker driving the "Company field data" section.
 * (Coverage / changes / raw sheets are brand-independent and rendered by the
 * server page around this.)
 */
export function ExploreView({
  model,
  profiles,
  tabs,
}: {
  model: MarketModel;
  profiles?: Record<string, CompanyProfile>;
  tabs: RekTabsFile;
}) {
  const [brand, setBrand] = useState(model.brands[0]);

  return (
    <>
      <div className="mb-3.5">
        <CompanySelector
          model={model}
          year={model.last}
          selected={[brand]}
          off={[]}
          // Single-select, as the legacy rekCompanySelect: picking a company
          // replaces the previous one instead of growing a compare pool.
          onChange={(next) => setBrand(next.find((b) => b !== brand) ?? brand)}
          onOffChange={() => {}}
          profiles={profiles}
        />
      </div>
      <FieldData brand={brand} tabs={tabs} />
    </>
  );
}
