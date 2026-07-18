"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { CompanyProfile } from "./profile";
import { SEG_COLORS, segName } from "./segments";
import type { MarketModel } from "./types";

/** Legacy ovCoSelect thresholds — value 0 = "any". */
const THRESHOLDS: Record<string, [number, string][]> = {
  turnover: [
    [0, "Turnover: any"],
    [100000, "≥ €100k"],
    [250000, "≥ €250k"],
    [500000, "≥ €500k"],
    [1000000, "≥ €1M"],
    [2000000, "≥ €2M"],
    [5000000, "≥ €5M"],
  ],
  revenue: [
    [0, "Revenue: any"],
    [50000, "≥ €50k"],
    [100000, "≥ €100k"],
    [250000, "≥ €250k"],
    [500000, "≥ €500k"],
    [1000000, "≥ €1M"],
    [2000000, "≥ €2M"],
  ],
  employees: [
    [0, "Employees: any"],
    [1, "≥ 1"],
    [3, "≥ 3"],
    [5, "≥ 5"],
    [10, "≥ 10"],
    [25, "≥ 25"],
    [50, "≥ 50"],
    [100, "≥ 100"],
  ],
  salary: [
    [0, "Salary: any"],
    [800, "≥ €800/mo"],
    [1000, "≥ €1k/mo"],
    [1200, "≥ €1.2k/mo"],
    [1500, "≥ €1.5k/mo"],
    [2000, "≥ €2k/mo"],
    [2500, "≥ €2.5k/mo"],
    [3000, "≥ €3k/mo"],
  ],
};
type MetricKey = keyof typeof THRESHOLDS;
const METRIC_KEYS = Object.keys(THRESHOLDS) as MetricKey[];

const optCls = "cursor-pointer rounded-[6px] px-2.5 py-1.5 text-[12.5px] hover:bg-panel2";

/**
 * The legacy company picker: a "Fabula ▾" button opening a dropdown panel with
 * a segment multi-select, four metric-threshold dropdowns, Clear filters, the
 * active-segment pill row, a hint line, search, and the results list.
 */
/** Compare palette shared with chips/tabs/grouped bars (legacy CMP_PAL). */
export const CMP_PAL = [
  "#4f8ef7",
  "#f0523d",
  "#f0b429",
  "#a06bff",
  "#25c26e",
  "#ff5cb0",
  "#00c2d1",
  "#8a6d3b",
  "#b0b7c3",
  "#7a8cff",
];
export const cmpColor = (i: number) => CMP_PAL[i % CMP_PAL.length];

const activeOf = (selected: string[], off: string[]) =>
  selected.filter((b) => !off.includes(b));

/** Legacy toggle: not in pool → add (on); off → on; on → off (keep ≥1 active).
    Never reorders the pool. */
export function togglePool(b: string, selected: string[], off: string[]) {
  if (!selected.includes(b)) return { selected: [...selected, b], off };
  if (off.includes(b)) return { selected, off: off.filter((x) => x !== b) };
  if (activeOf(selected, off).length > 1) return { selected, off: [...off, b] };
  return { selected, off };
}

/** Legacy chip ×: drop from the pool; never leave the pool with nothing active. */
export function removeFromPool(
  b: string,
  selected: string[],
  off: string[],
  fallback: string,
) {
  const next = selected.filter((x) => x !== b);
  let nextOff = off.filter((x) => x !== b && next.includes(x));
  if (next.length && next.every((x) => nextOff.includes(x)))
    nextOff = nextOff.filter((x) => x !== next[0]);
  return { selected: next.length ? next : [fallback], off: nextOff };
}

/** The compare pills (legacy .ov-chips, lifted into the sticky .co-stickybar):
    stable order, click toggles the brand on/off for charts (dashed = off),
    × removes from the pool. Rendered OUTSIDE the picker so it can stick alone. */
export function CompareChips({
  selected,
  off,
  onChange,
  onOffChange,
  fallbackBrand,
}: {
  selected: string[];
  off: string[];
  onChange: (brands: string[]) => void;
  onOffChange: (off: string[]) => void;
  fallbackBrand: string;
}) {
  if (selected.length < 2) return null;
  const activeList = activeOf(selected, off);

  const apply = (next: { selected: string[]; off: string[] }) => {
    if (next.selected !== selected) onChange(next.selected);
    if (next.off !== off) onOffChange(next.off);
  };

  return (
    <div className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {selected.map((b, i) => {
        const on = !off.includes(b);
        const primary = on && b === activeList[0];
        return (
          <span
            key={b}
            role="button"
            tabIndex={0}
            title={
              on
                ? primary
                  ? "Primary · click to hide"
                  : "Shown · click to hide"
                : "Hidden · click to show"
            }
            className={cn(
              "border-line bg-panel2 flex flex-none cursor-pointer items-center gap-1.5 rounded-[7px] border px-2 py-[5px] text-[12px] font-semibold",
              primary && "border-accent text-accent",
              !on && "text-muted border-dashed opacity-55",
            )}
            onClick={() => apply(togglePool(b, selected, off))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                apply(togglePool(b, selected, off));
              }
            }}
          >
            <i
              className={cn("h-2 w-2 flex-none rounded-full", !on && "opacity-35")}
              style={{ background: cmpColor(i) }}
            />
            {b}
            <span
              title="Remove from list"
              className="text-muted hover:text-red text-[14px] leading-none"
              onClick={(e) => {
                e.stopPropagation();
                apply(removeFromPool(b, selected, off, fallbackBrand));
              }}
            >
              ×
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Green/blue/amber data-source cubes (Initial / Rekvizitai / Sodra), dimmed
    empty when a source is missing (legacy srcCubes). */
function SrcCubes({ profile }: { profile?: CompanyProfile }) {
  const have = [true, !!profile?.rekvizitai, !!profile?.sodra];
  const colors = ["var(--color-green)", "var(--color-accent)", "var(--color-amber)"];
  return (
    <span className="mr-2 inline-flex gap-0.5 align-middle">
      {have.map((on, i) => (
        <span
          key={i}
          className="inline-block h-[9px] w-[9px] rounded-[3px]"
          style={
            on
              ? { background: colors[i] }
              : { border: "1px solid var(--color-line)", opacity: 0.5 }
          }
        />
      ))}
    </span>
  );
}

export function CompanySelector({
  model,
  year,
  selected,
  off,
  onChange,
  onOffChange,
  profiles,
}: {
  model: MarketModel;
  year: number;
  /** Selected compare pool — order is stable; never reordered by clicks. */
  selected: string[];
  /** Pool brands currently toggled off (hidden from charts). */
  off: string[];
  onChange: (brands: string[]) => void;
  onOffChange: (off: string[]) => void;
  profiles?: Record<string, CompanyProfile>;
}) {
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [segs, setSegs] = useState<Set<string>>(new Set());
  const [mins, setMins] = useState<Record<MetricKey, number>>({
    turnover: 0,
    revenue: 0,
    employees: 0,
    salary: 0,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setNested(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (nested) setNested(null);
      else setOpen(false);
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [nested]);

  const passes = (brand: string) => {
    const d = model.byBrand[brand]?.[year];
    if (segs.size && (!d || !d.activities.some((a) => segs.has(a)))) return false;
    if (mins.turnover > 0 && (d?.revenue ?? 0) < mins.turnover) return false;
    if (mins.revenue > 0 && (d?.estimatedIncome ?? 0) < mins.revenue) return false;
    if (mins.employees > 0 && (d?.employees ?? 0) < mins.employees) return false;
    if (mins.salary > 0 && (d?.avgSalary ?? 0) < mins.salary) return false;
    return true;
  };

  const q = query.trim().toLowerCase();
  const afterSearch = model.brands.filter((b) => !q || b.toLowerCase().includes(q));
  // Already-selected brands stay listed even when they fail the filters.
  const opts = [
    ...new Set([
      ...afterSearch.filter(passes),
      ...afterSearch.filter((b) => selected.includes(b) && !passes(b)),
    ]),
  ];

  const isOn = (b: string) => selected.includes(b) && !off.includes(b);
  const activeList = activeOf(selected, off);

  const toggleBrand = (b: string) => {
    const next = togglePool(b, selected, off);
    if (next.selected !== selected) onChange(next.selected);
    if (next.off !== off) onOffChange(next.off);
  };
  const filtersOn = segs.size > 0 || METRIC_KEYS.some((k) => mins[k] > 0) || q.length > 0;

  const clearFilters = () => {
    setSegs(new Set());
    setMins({ turnover: 0, revenue: 0, employees: 0, salary: 0 });
  };

  const metricDropdown = (key: MetricKey) => {
    const cur = THRESHOLDS[key].find(([v]) => v === mins[key]) ?? THRESHOLDS[key][0];
    return (
      <div key={key} className="relative">
        <button
          type="button"
          className="border-line bg-panel flex min-w-[118px] cursor-pointer items-center justify-between gap-1 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            setNested(nested === key ? null : key);
          }}
        >
          {cur[1]}
          <span
            className={cn(
              "text-[9px] transition-transform",
              nested === key && "rotate-180",
            )}
          >
            ▾
          </span>
        </button>
        {nested === key && (
          <div className="border-line bg-panel absolute z-30 mt-1 min-w-[130px] rounded-lg border p-1 shadow-lg">
            {THRESHOLDS[key].map(([v, lbl]) => (
              <div
                key={v}
                className={cn(optCls, v === mins[key] && "bg-accent text-white")}
                onClick={(e) => {
                  e.stopPropagation();
                  setMins((m) => ({ ...m, [key]: v }));
                  setNested(null);
                }}
              >
                {lbl}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="border-line bg-panel flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-lg border px-3.5 py-2 text-[13px] font-semibold"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
          setNested(null);
          if (!open) {
            setQuery("");
            setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0);
          }
        }}
      >
        {activeList.length > 1
          ? `${activeList[0]} +${activeList.length - 1}`
          : (activeList[0] ?? selected[0] ?? "Select company")}
        <span className={cn("text-[10px] transition-transform", open && "rotate-180")}>
          ▾
        </span>
      </button>

      {open && (
        <div className="border-line bg-panel absolute z-20 mt-1 w-[min(380px,92vw)] rounded-lg border p-2 shadow-xl">
          {/* Filter toolbar: segment multi-select + metric thresholds + clear. */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            <div className="relative">
              <button
                type="button"
                className="border-line bg-panel flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  setNested(nested === "seg" ? null : "seg");
                }}
              >
                {!segs.size
                  ? "Segment"
                  : segs.size === 1
                    ? segName([...segs][0])
                    : `${segs.size} segments`}
                <span className={cn("text-[9px]", nested === "seg" && "rotate-180")}>
                  ▼
                </span>
              </button>
              {nested === "seg" && (
                <div className="border-line bg-panel absolute z-30 mt-1 min-w-[160px] rounded-lg border p-1 shadow-lg">
                  {model.segments.map((s) => (
                    <div
                      key={s}
                      role="option"
                      aria-selected={segs.has(s)}
                      className={cn(optCls, segs.has(s) && "bg-accent text-white")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSegs((old) => {
                          const next = new Set(old);
                          if (next.has(s)) next.delete(s);
                          else next.add(s);
                          return next;
                        });
                      }}
                    >
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{ background: SEG_COLORS[s] ?? "#888" }}
                      />
                      {segName(s)}
                    </div>
                  ))}
                  <button
                    type="button"
                    className={cn(optCls, "w-full text-left font-semibold")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSegs(
                        segs.size === model.segments.length
                          ? new Set()
                          : new Set(model.segments),
                      );
                    }}
                  >
                    {segs.size === model.segments.length ? "Clear all" : "Select all"}
                  </button>
                  <button
                    type="button"
                    className={cn(optCls, "w-full text-left font-semibold")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setNested(null);
                    }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
            {METRIC_KEYS.map(metricDropdown)}
            <button
              type="button"
              className="text-muted hover:text-ink cursor-pointer rounded-lg px-2 py-1.5 text-[11.5px] font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
            >
              Clear filters
            </button>
          </div>

          {/* Active segment pills (click to remove). */}
          {segs.size > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {[...segs]
                .sort((a, b) => segName(a).localeCompare(segName(b), "en"))
                .map((s) => (
                  <span
                    key={s}
                    role="button"
                    tabIndex={0}
                    className="border-line bg-panel2 flex cursor-pointer items-center gap-1 rounded-[7px] border px-2 py-0.5 text-[11px] font-semibold"
                    onClick={() =>
                      setSegs((old) => {
                        const next = new Set(old);
                        next.delete(s);
                        return next;
                      })
                    }
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: SEG_COLORS[s] ?? "#888" }}
                    />
                    {segName(s)}
                    <span aria-hidden>×</span>
                  </span>
                ))}
            </div>
          )}

          {filtersOn && (
            <div className="text-muted mb-1.5 text-[11px]">
              Showing {opts.length} of {model.brands.length} · {year}
            </div>
          )}

          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company…"
            autoComplete="off"
            className="border-line bg-panel2 mb-1.5 w-full rounded-sm border px-3 py-1.5 text-[13px]"
          />

          <div
            role="listbox"
            aria-multiselectable
            className="max-h-[260px] overflow-y-auto"
          >
            {opts.length ? (
              opts.map((b) => (
                <div
                  key={b}
                  role="option"
                  aria-selected={isOn(b)}
                  className={cn(
                    optCls,
                    isOn(b) && "bg-accent font-semibold text-white",
                    selected.includes(b) &&
                      !isOn(b) &&
                      "bg-panel2 text-muted border-line border border-dashed font-semibold",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBrand(b);
                  }}
                >
                  <SrcCubes profile={profiles?.[b]} />
                  {b}
                </div>
              ))
            ) : (
              <div className="text-muted p-2 text-[12.5px]">
                {q
                  ? `No company matches “${query}” with the current filters.`
                  : "No companies match your filters."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
