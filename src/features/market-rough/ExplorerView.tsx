"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { fmtEur, fmtEurFull, fmtInt } from "./format";
import { margin } from "./metrics";
import type { CompanyYear, MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";
import { YearRow } from "./YearRow";

/** One sortable column: header label + how to read its value off a row. */
type Column = {
  key: string;
  label: string;
  value: (row: CompanyYear) => string | number | null;
  render?: (row: CompanyYear) => string;
  numeric?: boolean;
};

const COLUMNS: Column[] = [
  { key: "brand", label: "Company", value: (r) => r.brand },
  {
    key: "segments",
    label: "Segments",
    value: (r) => r.activities.join(", "),
  },
  {
    key: "revenue",
    label: "Turnover",
    value: (r) => r.revenue,
    render: (r) => fmtEur(r.revenue),
    numeric: true,
  },
  {
    key: "estimatedIncome",
    label: "Revenue",
    value: (r) => r.estimatedIncome,
    render: (r) => fmtEur(r.estimatedIncome),
    numeric: true,
  },
  {
    key: "profit",
    label: "Profit",
    value: (r) => r.profit,
    render: (r) => fmtEur(r.profit),
    numeric: true,
  },
  {
    key: "employees",
    label: "Employees",
    value: (r) => r.employees,
    render: (r) => fmtInt(r.employees),
    numeric: true,
  },
  {
    key: "avgSalary",
    label: "Avg salary",
    value: (r) => ((r.avgSalary ?? 0) > 500 ? r.avgSalary : null),
    render: (r) => ((r.avgSalary ?? 0) > 500 ? fmtEurFull(r.avgSalary) : "–"),
    numeric: true,
  },
  {
    key: "margin",
    label: "Margin",
    value: margin,
    render: (r) => {
      const m = margin(r);
      return m == null ? "–" : `${m.toFixed(1)}%`;
    },
    numeric: true,
  },
];

export function ExplorerView({ model }: { model: MarketModel }) {
  const [{ year }] = useDashboardParams(model.last);
  // Search text and sort order are ephemeral view state, not page identity —
  // they stay out of the URL by design (see useDashboardParams).
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({
    key: "revenue",
    dir: -1,
  });

  const sortCol = COLUMNS.find((c) => c.key === sort.key) ?? COLUMNS[2];
  const q = query.trim().toLowerCase();

  const rows = model.rows
    .filter((row) => row.year === year)
    .filter(
      (row) =>
        !q ||
        row.brand.toLowerCase().includes(q) ||
        row.company.toLowerCase().includes(q) ||
        row.activities.some((a) => a.toLowerCase().includes(q)),
    )
    .sort((a, b) => {
      const av = sortCol.value(a);
      const bv = sortCol.value(b);
      // Missing figures always sink to the bottom, whatever the direction.
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" || typeof bv === "string")
        return String(av).localeCompare(String(bv)) * sort.dir;
      return (av - (bv as number)) * sort.dir;
    });

  const toggleSort = (col: Column) =>
    setSort((s) =>
      s.key === col.key
        ? { key: col.key, dir: s.dir === 1 ? -1 : 1 }
        : // Numbers open descending (biggest first), text opens ascending.
          { key: col.key, dir: col.numeric ? -1 : 1 },
    );

  return (
    <section id="explorer" className="mb-7">
      <h1 className="mt-7 mb-3.5 text-[18px] font-bold">Explorer {year}</h1>

      <YearRow years={model.finYears} defaultYear={model.last} />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${rows.length} companies…`}
        aria-label="Search companies"
        className="border-line bg-panel2 text-ink placeholder:text-muted focus:border-accent mb-3 w-full rounded-md border px-3 py-2 text-[13px] outline-none"
      />

      <div className="border-line max-h-[80vh] overflow-auto rounded-lg border">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead className="sticky top-0 z-2">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  aria-sort={
                    sort.key !== col.key
                      ? undefined
                      : sort.dir === 1
                        ? "ascending"
                        : "descending"
                  }
                  className={cn(
                    "bg-panel2 text-muted border-line hover:text-ink cursor-pointer border-b-2 px-3 py-2.5 text-left text-[11px] tracking-[.06em] whitespace-nowrap uppercase select-none",
                    col.key === "brand" && "sticky left-0 z-3",
                  )}
                >
                  {col.label}
                  {sort.key === col.key && (
                    <span className="text-accent text-[10px]">
                      {sort.dir === 1 ? " ▲" : " ▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.brand} className="group">
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "border-line max-w-[320px] overflow-hidden border-b px-3 py-2 text-ellipsis whitespace-nowrap",
                      "bg-panel group-odd:bg-zebra group-hover:bg-panel2",
                      col.key === "brand" && "sticky left-0 z-1 font-semibold",
                    )}
                  >
                    {col.render ? col.render(row) : String(col.value(row) ?? "–")}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="text-muted px-3 py-6 text-center"
                >
                  No companies match “{query}” in {year}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
