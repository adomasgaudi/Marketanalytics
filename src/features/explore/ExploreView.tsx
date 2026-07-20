"use client";

import { useEffect, useRef, useState } from "react";
import { CompanySelector } from "../market-rough/CompanySelector";
import { EXPLORE_COMPANY_EVENT } from "./Coverage";
import type { CompanyProfile } from "../market-rough/profile";
import type { MarketModel } from "../market-rough/types";
import { cn } from "@/lib/cn";
import { FieldData, type RekTabsFile } from "./FieldData";
import { RawJson } from "./RawJson";

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
  children,
  after,
}: {
  model: MarketModel;
  profiles?: Record<string, CompanyProfile>;
  tabs: RekTabsFile;
  /** Server-rendered sections (coverage, data changes) slotted between the
      picker and the field-data table, matching the legacy rekView order. */
  children?: React.ReactNode;
  /** Server-rendered sections after the field-data table (raw sheets). */
  after?: React.ReactNode;
}) {
  const [brand, setBrand] = useState(model.brands[0]);
  // Page-level view: the ported tables experience, or every dataset as raw
  // JSON trees. Tables stay mounted (hidden) so their state survives a switch.
  const [pageView, setPageView] = useState<"tables" | "json">("tables");
  const fieldRef = useRef<HTMLDivElement>(null);

  // Coverage-grid click-through (legacy parity): pick the company and scroll
  // down to the field-data table.
  useEffect(() => {
    const onPick = (e: Event) => {
      const b = (e as CustomEvent<string>).detail;
      if (!b) return;
      setBrand(b);
      fieldRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener(EXPLORE_COMPANY_EVENT, onPick);
    return () => window.removeEventListener(EXPLORE_COMPANY_EVENT, onPick);
  }, []);

  return (
    <>
      <div className="border-line bg-panel2 mb-3.5 inline-flex overflow-hidden rounded-lg border">
        {(["tables", "json"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setPageView(v)}
            className={cn(
              "cursor-pointer px-3.5 py-1.5 text-[13px]",
              v === pageView
                ? "bg-panel text-ink font-semibold"
                : "text-muted hover:text-ink",
            )}
          >
            {v === "tables" ? "Tables" : "Raw JSON"}
          </button>
        ))}
      </div>

      {pageView === "json" && <RawJson tabs={tabs} />}

      <div className={cn(pageView !== "tables" && "hidden")}>
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
        {children}
        <div ref={fieldRef}>
          <FieldData brand={brand} tabs={tabs} />
        </div>
        {after}
      </div>
    </>
  );
}
