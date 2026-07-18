"use client";

import { useEffect, useRef, useState } from "react";
import { CompanyProfileCard } from "./CompanyProfile";
import { cmpColor, CompanySelector, CompareChips } from "./CompanySelector";
import { DeepDive } from "./DeepDive";
import type { CompanyProfile } from "./profile";
import { fmtEur, fmtPct } from "./format";
import { KpiCard, type KpiCardData, type KpiMode, KpiModeToggle } from "./KpiCard";
import { rankOf } from "./metrics";
import { MoneyFlow } from "./MoneyFlow";
import { MoneyFlowByYear } from "./MoneyFlowByYear";
import { RankVsMarket } from "./RankVsMarket";
import type { CompanyYear, MarketModel } from "./types";
import { useDashboardParams } from "./useDashboardParams";

/** The selected compare pool (legacy ovBrands + ovActive): `pool` keeps its
    order; `off` hides brands from charts; `brands` = the visible (active)
    list, first entry is the primary brand. */
export function useSelectedBrands(model: MarketModel) {
  const [{ companies, off }, setParams] = useDashboardParams(model.last);
  const pool = companies.length ? companies : [model.brands[0]];
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
  model,
  profiles,
}: {
  model: MarketModel;
  profiles?: Record<string, CompanyProfile>;
}) {
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
            fallbackBrand={model.brands[0]}
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
    <div
      role="tablist"
      aria-label="Selected companies"
      className="mb-3 flex [scrollbar-width:none] gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
    >
      {brands.map((b) => (
        <button
          key={b}
          type="button"
          role="tab"
          aria-selected={b === focused}
          onClick={() => onFocus(b)}
          className={`border-line flex flex-none cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12.5px] font-semibold ${
            b === focused ? "bg-accent border-accent text-white" : "bg-panel2 text-muted"
          }`}
        >
          <i
            className="h-2 w-2 rounded-full"
            style={{ background: cmpColor((colorPool ?? brands).indexOf(b)) }}
          />
          {b}
        </button>
      ))}
    </div>
  );
}

/** The "Company {year}" panel: profile box, money-flow, #/% KPIs, vs-market. */
export function CompanyPerYear({
  model,
  profiles,
}: {
  model: MarketModel;
  profiles?: Record<string, CompanyProfile>;
}) {
  const [{ year, basis }] = useDashboardParams(model.last);
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
  const E = (v: number | null) =>
    v != null ? `€${Math.round(v).toLocaleString()}` : "–";

  const emp = row.employees != null ? Math.round(row.employees) : null;
  const sal = (row.avgSalary ?? 0) > 500 ? Math.round(row.avgSalary!) : null;
  const prevEmp = prev?.employees != null ? Math.round(prev.employees) : null;
  const prevSal = (prev?.avgSalary ?? 0) > 500 ? Math.round(prev!.avgSalary!) : null;
  const curRevenue = scaleMoney(row.estimatedIncome);
  const prevRevenue = scaleMoneyPrev(prev?.estimatedIncome);
  const curTurnover = scaleMoney(row.revenue);
  const prevTurnover = scaleMoneyPrev(prev?.revenue);
  const revYoY =
    curRevenue != null && (prevRevenue ?? 0) > 0 ? curRevenue / prevRevenue! - 1 : null;
  const turnYoY =
    curTurnover != null && (prevTurnover ?? 0) > 0
      ? curTurnover / prevTurnover! - 1
      : null;
  const empYoY = row.employees != null && (prevEmp ?? 0) > 0;
  const salYoY = row.avgSalary != null && (prevSal ?? 0) > 0;

  const cards: KpiCardData[] = [
    {
      label: `${perEmployee ? "Revenue/empl." : "Revenue"} ${yrLab}`,
      valueText: hasFin ? fmtEur(curRevenue) : "–",
      changeText: hasFin && revYoY != null ? fmtPct(revYoY) : "—",
      rangeText:
        revYoY != null
          ? `${fmtEur(prevRevenue)} → ${fmtEur(curRevenue)}`
          : fmtEur(curRevenue),
      changeCls: revYoY != null ? (revYoY >= 0 ? "pos" : "neg") : "",
      formula:
        revYoY != null
          ? `Year-over-year change in revenue. (${E(curRevenue)} ÷ ${E(prevRevenue)}) − 1.`
          : undefined,
    },
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
      formula: empYoY
        ? `Sum of reported headcount in ${year}. YoY = this year ÷ last year − 1.`
        : undefined,
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
      formula: salYoY
        ? `Middle value of the company's average monthly salary in ${year}. YoY = this year ÷ last year − 1.`
        : undefined,
    },
    {
      label: `${perEmployee ? "Turnover/empl." : "Turnover"} ${yrLab}`,
      valueText: hasFin ? fmtEur(curTurnover) : "–",
      changeText: hasFin && turnYoY != null ? fmtPct(turnYoY) : "—",
      rangeText:
        turnYoY != null
          ? `${fmtEur(prevTurnover)} → ${fmtEur(curTurnover)}`
          : fmtEur(curTurnover),
      changeCls: turnYoY != null ? (turnYoY >= 0 ? "pos" : "neg") : "",
      formula:
        turnYoY != null
          ? `Year-over-year change in turnover. (${E(curTurnover)} ÷ ${E(prevTurnover)}) − 1.`
          : undefined,
    },
  ];

  return (
    <div>
      {tabs}
      {profileCard}
      {!hasFin ? (
        // Partial year (2025+): record exists but financials aren't filed yet.
        <div className="text-muted border-line bg-panel mb-4 rounded-xl border p-4 text-[13px]">
          {year} financials aren&rsquo;t filed yet — Lithuanian annual reports land ~mid-
          {year + 1}. Showing Sodra headcount &amp; pay only.
        </div>
      ) : (
        <MoneyFlow
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
          rank={perEmployee ? null : turnover}
          tag={
            perEmployee && (row.employees ?? 0) > 0
              ? `per employee · ${Math.round(row.employees!)} staff`
              : undefined
          }
        />
      )}

      <KpiModeToggle
        mode={kpiMode}
        onChange={(m) => {
          touched.current = true;
          setKpiMode(m);
        }}
      />
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
        {cards.map((card) => (
          <KpiCard key={card.label} card={card} mode={kpiMode} />
        ))}
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
export function CompanyAllTime({ model }: { model: MarketModel }) {
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
