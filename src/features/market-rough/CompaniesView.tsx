"use client";

import { useEffect, useRef, useState } from "react";
import { CompanyProfileCard } from "./CompanyProfile";
import { cmpColor, CompanySelector, CompareChips } from "./CompanySelector";
import { DeepDive } from "./DeepDive";
import type { CompanyProfile } from "./profile";
import { fmtEur, fmtPct } from "./format";
import { moneyFormulas, Op, V, yoy } from "./Formula";
import { KpiCard, type KpiCardData, type KpiMode, KpiModeToggle } from "./KpiCard";
import { defaultBrand, rankOf } from "./metrics";
import { MoneyFlow } from "./MoneyFlow";
import { MoneyFlowByYear } from "./MoneyFlowByYear";
import { RankVsMarket } from "./RankVsMarket";
import { useSourcedModel } from "./rebuilt-source";
import type { CompanyYear, MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

/** The selected compare pool (legacy ovBrands + ovActive): `pool` keeps its
    order; `off` hides brands from charts; `brands` = the visible (active)
    list, first entry is the primary brand. */
export function useSelectedBrands(model: MarketModel) {
  const [{ companies, off }, setParams] = useDashboardParams(model.last);
  const pool = companies.length ? companies : [defaultBrand(model)];
  const active = pool.filter((b) => !off.includes(b));
  return {
    pool,
    off,
    brands: active.length ? active : [pool[0]],
    set: (next: string[]) => setParams({ companies: next }),
    setOff: (next: string[]) => setParams({ off: next }),
  };
}

export function useSelectedBrand(model: MarketModel) {
  const { brands, set } = useSelectedBrands(model);
  return { brand: brands[0], select: (next: string) => set([next]) };
}

/** The hoisted company picker, visible on every Financials tab. */
export function CompanyPicker({
  model: legacyModel,
  profiles,
}: {
  model: MarketModel;
  profiles?: Record<string, CompanyProfile>;
}) {
  // The selector filters companies by turnover, so it must rank them on the
  // same figures the cards below will show.
  const model = useSourcedModel(legacyModel);
  const { pool, off, set, setOff } = useSelectedBrands(model);
  const [{ year }] = useDashboardParams(model.last);
  return (
    <>
      {/* The picker button scrolls away, like the legacy #ovCompanySelect. */}
      <div className="mb-1.5">
        <CompanySelector
          model={model}
          year={year}
          selected={pool}
          off={off}
          onChange={set}
          onOffChange={setOff}
          profiles={profiles}
        />
      </div>
      {/* Only the company PILLS stay pinned under the 50px top nav — the
          legacy page-level .co-stickybar (top:44px, z-80, border-bottom). */}
      {pool.length > 1 && (
        <div className="bg-bg border-line sticky top-[50px] z-40 mb-2 border-b py-1.5 max-sm:top-[46px]">
          <CompareChips
            selected={pool}
            off={off}
            onChange={set}
            onOffChange={setOff}
            fallbackBrand={defaultBrand(model)}
          />
        </div>
      )}
    </>
  );
}

/** Tab row shown when >1 company is selected — picks which single company the
    profile / money-flow / KPI widgets focus (legacy #coCompanyTabs). */
export function CompanyTabs({
  brands,
  colorPool,
  focused,
  onFocus,
}: {
  brands: string[];
  /** Full pool incl. hidden brands — keeps dot colours matching the chips. */
  colorPool?: string[];
  focused: string;
  onFocus: (brand: string) => void;
}) {
  if (brands.length < 2) return null;
  return (
    // Underline-indicator tabs rather than bordered folder tabs: no seams to
    // hide, and the active rule is drawn in the company's own chip colour, so
    // the tab, its dot and its bars all read as one identity.
    <div
      role="tablist"
      aria-label="Selected companies"
      className="border-line mb-3 flex [scrollbar-width:none] gap-0.5 overflow-x-auto border-b [&::-webkit-scrollbar]:hidden"
    >
      {brands.map((b) => {
        const color = cmpColor((colorPool ?? brands).indexOf(b));
        const on = b === focused;
        return (
          <button
            key={b}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onFocus(b)}
            className={`relative flex flex-none cursor-pointer items-center gap-2 rounded-t-md px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors select-none ${
              on ? "text-ink" : "text-muted hover:text-ink hover:bg-panel2/60"
            }`}
          >
            <i
              className="h-2 w-2 flex-none rounded-full transition-opacity"
              style={{ background: color, opacity: on ? 1 : 0.45 }}
            />
            {b}
            {on && (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                style={{ background: color }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The "Company {year}" panel: profile box, money-flow, #/% KPIs, vs-market. */
export function CompanyPerYear({
  model: legacyModel,
  profiles,
}: {
  model: MarketModel;
  profiles?: Record<string, CompanyProfile>;
}) {
  // Follows the nav's data-source toggle, so every widget below — money-flow,
  // KPIs, ranks, deep-dive — reads the same dataset.
  const model = useSourcedModel(legacyModel);
  const [{ year, basis, src }] = useDashboardParams(model.last);
  const { brands, pool } = useSelectedBrands(model);
  // Focused company for the single-company widgets; follows the pool.
  const [focus, setFocus] = useState<string | null>(null);
  const brand = focus && brands.includes(focus) ? focus : brands[0];
  const [kpiMode, setKpiMode] = useState<KpiMode>("value");
  // Legacy auto-flip: 8s after load the KPIs flip #→% once, unless touched.
  const touched = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!touched.current) setKpiMode("change");
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  const row = model.byBrand[brand]?.[year];
  const prev = model.byBrand[brand]?.[year - 1];

  // Per-employee divides every money figure by headcount, so the same company
  // can be compared against a peer ten times its size. Headcount itself is the
  // denominator, so it stops being a ranking metric in this mode.
  const perEmployee = basis === "emp";
  const per = (metric: (row: CompanyYear) => number | null) =>
    perEmployee
      ? (candidate: CompanyYear) => {
          const value = metric(candidate);
          const staff = candidate.employees ?? 0;
          return value != null && staff > 0 ? value / staff : null;
        }
      : metric;

  const rank = (metric: (row: CompanyYear) => number | null) =>
    rankOf(model.rows, year, row, per(metric));

  const turnover = rank((r) => r.revenue);

  const scaleMoney = (v: number | null) =>
    v == null
      ? null
      : perEmployee
        ? (row?.employees ?? 0) > 0
          ? v / row!.employees!
          : null
        : v;
  const scaleMoneyPrev = (v: number | null | undefined) =>
    v == null
      ? null
      : perEmployee
        ? (prev?.employees ?? 0) > 0
          ? v / prev!.employees!
          : null
        : v;

  const tabs = (
    <CompanyTabs brands={brands} colorPool={pool} focused={brand} onFocus={setFocus} />
  );
  const profileCard = (
    <CompanyProfileCard
      model={model}
      brand={brand}
      year={year}
      profile={profiles?.[brand]}
    />
  );

  // The profile box shows for every company, even without a filing (legacy).
  if (!row)
    return (
      <div>
        {tabs}
        {profileCard}
        <p className="text-muted border-line bg-panel2 rounded-lg border p-4 text-sm">
          {year > model.last
            ? `No ${year} data for ${brand} yet — only ~12 companies have a partial ${year} so far.`
            : `${brand} has no ${year} filing.`}
        </p>
      </div>
    );

  // Legacy company KPI cards: Revenue / Employees / Median salary / Turnover,
  // each labelled "23→24", with YoY change, prev→cur range and a formula fold.
  const hasFin = row.revenue != null;
  // 93 filings report employees:0 (20 brands). Per-employee then divides by a
  // zero denominator, every money figure nulls out, and MoneyFlow's own
  // `revenue == null && turnover == null` guard silently unmounts the whole
  // card. Say why instead of leaving a hole.
  const noHeadcount = perEmployee && !((row.employees ?? 0) > 0);
  const hasPrev = !!(
    prev &&
    (prev.revenue != null ||
      prev.estimatedIncome != null ||
      prev.employees != null ||
      prev.avgSalary != null)
  );
  const yrLab = hasPrev
    ? `${String(year - 1).slice(2)}→${String(year).slice(2)}`
    : String(year);
  const emp = row.employees != null ? Math.round(row.employees) : null;
  const sal = (row.avgSalary ?? 0) > 500 ? Math.round(row.avgSalary!) : null;
  const prevEmp = prev?.employees != null ? Math.round(prev.employees) : null;
  const prevSal = (prev?.avgSalary ?? 0) > 500 ? Math.round(prev!.avgSalary!) : null;
  const empYoY = row.employees != null && (prevEmp ?? 0) > 0;
  // Must key off `sal`, not row.avgSalary: sal is null for sub-€500 noise, and
  // the range text dereferences sal! whenever salYoY is true.
  const salYoY = sal != null && (prevSal ?? 0) > 0;

  // Revenue and Turnover are already in the money-flow card above — only the
  // two figures it can't show get their own KPI cards. (Mirrors MarketsView;
  // the companies path was missed when markets was de-duplicated.)
  const cards: KpiCardData[] = [
    {
      label: `Employees ${yrLab}`,
      valueText: emp != null ? emp.toLocaleString() : "–",
      changeText: empYoY ? fmtPct(row.employees! / prevEmp! - 1) : "—",
      rangeText: empYoY
        ? `${prevEmp!.toLocaleString()} → ${emp!.toLocaleString()}`
        : emp != null
          ? emp.toLocaleString()
          : "–",
      changeCls: empYoY ? (row.employees! >= prevEmp! ? "pos" : "neg") : "",
      formulas: [
        {
          // One company, one filing — no sum or median to take. The figure is
          // read straight off the year's record.
          name: "Headcount",
          math: (
            <>
              <V c="HC" />
              <Op o="=" />
              <V c="emp" />
            </>
          ),
          vars: [
            {
              code: "HC",
              label: "headcount shown",
              value: emp != null ? emp.toLocaleString() : undefined,
            },
            {
              code: "emp",
              label: `${brand}'s reported employees, ${year}`,
              field: "employees",
            },
          ],
        },
        ...(empYoY
          ? [
              yoy("HC", "headcount", "employees", {
                cur: emp?.toLocaleString(),
                prev: prevEmp?.toLocaleString(),
              }),
            ]
          : []),
      ],
    },
    {
      label: `Median salary ${yrLab}`,
      valueText: sal != null ? `€${sal.toLocaleString()}/mo` : "–",
      changeText: salYoY ? fmtPct(row.avgSalary! / prevSal! - 1) : "—",
      rangeText: salYoY
        ? `€${prevSal!.toLocaleString()}/mo → €${sal!.toLocaleString()}/mo`
        : sal != null
          ? `€${sal.toLocaleString()}/mo`
          : "–",
      changeCls: salYoY ? (row.avgSalary! >= prevSal! ? "pos" : "neg") : "",
      formulas: [
        {
          name: "Average monthly salary",
          math: (
            <>
              <V c="SAL" />
              <Op o="=" />
              <V c="avg" />
            </>
          ),
          vars: [
            {
              code: "SAL",
              label: "salary shown",
              value: sal != null ? `€${sal.toLocaleString()}/mo` : undefined,
            },
            {
              code: "avg",
              label: `${brand}'s average monthly pay, ${year} (only > €500/mo counts)`,
              field: "avgSalary",
            },
          ],
        },
        ...(salYoY
          ? [
              yoy("SAL", "average salary", "avgSalary", {
                cur: sal != null ? `€${sal.toLocaleString()}/mo` : undefined,
                prev: prevSal != null ? `€${prevSal.toLocaleString()}/mo` : undefined,
              }),
            ]
          : []),
      ],
    },
  ];

  return (
    <div>
      {tabs}
      {profileCard}
      {/* Above the money-flow card, as in MarketsView: the toggle governs both
          that card and the KPI cards, so it must not sit between them. */}
      <KpiModeToggle
        mode={kpiMode}
        onChange={(m) => {
          touched.current = true;
          setKpiMode(m);
        }}
      />
      {/* iPad and up: money-flow and the KPI cards sit on one row (as MarketsView). */}
      <div className="mb-6 md:flex md:items-stretch md:gap-2.5">
        <div className="min-w-0 md:flex-1 [&>.card]:md:mb-0 [&>.card]:md:h-full">
          {!hasFin ? (
            // Partial year (2025+): record exists but financials aren't filed yet.
            <div className="text-muted border-line bg-panel mb-4 rounded-xl border p-4 text-[13px]">
              {year} financials aren&rsquo;t filed yet — Lithuanian annual reports land
              ~mid-
              {year + 1}. Showing Sodra headcount &amp; pay only.
            </div>
          ) : noHeadcount ? (
            <div className="text-muted border-line bg-panel mb-4 rounded-xl border p-4 text-[13px]">
              {brand} reported no {year} headcount, so per-employee figures can&rsquo;t be
              computed. Switch the basis to full company to see the {year} financials.
            </div>
          ) : (
            <MoneyFlow
              mode={kpiMode}
              turnover={scaleMoney(row.revenue)}
              revenue={scaleMoney(row.estimatedIncome)}
              profit={scaleMoney(row.profit)}
              prev={
                prev
                  ? {
                      T: scaleMoneyPrev(prev.revenue),
                      R: scaleMoneyPrev(prev.estimatedIncome),
                      P: scaleMoneyPrev(prev.profit),
                    }
                  : {}
              }
              formulas={moneyFormulas({
              source: src,
                div:
                  perEmployee && (row.employees ?? 0) > 0
                    ? {
                        code: "HC",
                        label: "this company's headcount",
                        value: Math.round(row.employees!).toLocaleString(),
                      }
                    : null,
                // The figures as shown on the card, so the fold reads as a worked
                // example rather than a definition (matches MarketsView).
                values: {
                  T: fmtEur(scaleMoney(row.revenue)),
                  R: fmtEur(scaleMoney(row.estimatedIncome)),
                  P: fmtEur(scaleMoney(row.profit)),
                },
              })}
              rank={perEmployee ? null : turnover}
              tag={
                perEmployee && (row.employees ?? 0) > 0
                  ? `per employee · ${Math.round(row.employees!)} staff`
                  : undefined
              }
            />
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 md:w-[340px] md:flex-none md:grid-cols-2">
          {cards.map((card) => (
            <KpiCard key={card.label} card={card} mode={kpiMode} />
          ))}
        </div>
      </div>

      <RankVsMarket
        model={model}
        brand={brand}
        brands={brands}
        colorPool={pool}
        year={year}
        perEmployee={perEmployee}
      />
    </div>
  );
}

/** The "Company all time" panel: money-flow by year + the folded-in
    "Compare financials" deep-dive (legacy makeSectionsCollapsible). */
export function CompanyAllTime({ model: legacyModel }: { model: MarketModel }) {
  const model = useSourcedModel(legacyModel);
  const { brand } = useSelectedBrand(model);

  return (
    <div>
      <MoneyFlowByYear
        title={`${brand} — money-flow by year`}
        rows={model.finYears
          .map((fy) => model.byBrand[brand]?.[fy])
          .filter((r): r is CompanyYear => r != null && r.revenue != null)
          .map((r) => ({
            year: r.year,
            turnover: r.revenue ?? 0,
            revenue: r.estimatedIncome ?? 0,
            profit: r.profit ?? 0,
          }))}
      />
      <DeepDive model={model} title="Compare financials" />
    </div>
  );
}
