"use client";

import { useState } from "react";
import { Pill, PillRow } from "@/components/ui/pills";

/**
 * Picks the company being profiled. 132 brands is too many for one pill row, so
 * a search box narrows them first and the row stays a single scrolling line.
 */
export function CompanySelector({
  brands,
  selected,
  onSelect,
}: {
  brands: string[];
  selected: string;
  onSelect: (brand: string) => void;
}) {
  // Ephemeral UI, so it stays out of the URL — only what changes the data shown
  // (year, basis, company) is page identity.
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? brands.filter((brand) => brand.toLowerCase().includes(needle))
    : brands;

  return (
    <div className="mb-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${brands.length} companies`}
        aria-label="Search companies"
        className="border-line bg-panel2 mb-2 w-full rounded-sm border px-3 py-1.5 text-[13px]"
      />

      {matches.length === 0 ? (
        <p className="text-muted text-[13px]">No company matches “{query}”.</p>
      ) : (
        <PillRow label="Company">
          {matches.slice(0, 40).map((brand) => (
            <Pill
              key={brand}
              selected={brand === selected}
              onClick={() => onSelect(brand)}
            >
              {brand}
            </Pill>
          ))}
        </PillRow>
      )}
    </div>
  );
}
