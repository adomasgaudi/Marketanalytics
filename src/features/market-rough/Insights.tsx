import { cn } from "@/lib/cn";

type Insight = {
  accent: string;
  title: string;
  body: React.ReactNode;
};

/** Hand-written analyst notes, verbatim from the legacy dashboard. */
const INSIGHTS: Insight[] = [
  {
    accent: "border-l-accent",
    title: "Growth has stalled after a strong run",
    body: (
      <>
        The market grew <b>+75%</b> from €207M (2019) to €357M (2023), but 2024 was nearly
        flat at <b>€362M (+1.4%)</b>. Headcount actually <b>fell ~5%</b> (1,663 → 1,579),
        the first contraction in the dataset — agencies are doing the same revenue with
        fewer people.
      </>
    ),
  },
  {
    accent: "border-l-purple",
    title: "Media buying dominates, but is a pass-through",
    body: (
      <>
        The 18 media agencies account for <b>€238M (66%)</b> of 2024 revenue, led by{" "}
        <b>Dentsu (€36.6M)</b> and <b>BPN (€36.4M)</b>. Their margins are thin (1–5%)
        because ad spend flows through them. Real fee-economy segments — Digital (€87M),
        Creative (€59M), PR (€30M) — are where competition on talent happens.
      </>
    ),
  },
  {
    accent: "border-l-green",
    title: "Small specialists earn the best margins",
    body: (
      <>
        The most profitable firms in 2024 are boutiques: <b>SynthesisCG (37%)</b>,{" "}
        <b>Maniac (35%)</b>, <b>Expertmedia &amp; Evo media (~20%)</b>. Among larger
        firms, <b>We deliver agency</b> stands out with 19.5% margin on €4.8M revenue.
        Scale in this market does not buy profitability.
      </>
    ),
  },
  {
    accent: "border-l-red",
    title: "Several mid-size agencies are in trouble",
    body: (
      <>
        <b>WhatAbout</b> grew revenue 10× since 2019 to €11.9M but posted a{" "}
        <b>−€383k loss</b> in 2024. <b>Cyclopes (−45%)</b>, <b>Idee fixe (−44%)</b>,{" "}
        <b>Clinic212 (−38%)</b> and <b>Evolvery (−36%)</b> all lost over a third of their
        revenue since 2021.
      </>
    ),
  },
  {
    accent: "border-l-amber",
    title: "Wage inflation is squeezing everyone",
    body: (
      <>
        Median agency salary rose <b>+57%</b> in five years (€1,891 → €2,965/mo) while
        market revenue rose +75% — but 2024 revenue is flat and salaries kept climbing.
        That is the mechanism behind the 2024 headcount cut and the margin pressure
        visible in the scatter plot.
      </>
    ),
  },
  {
    accent: "border-l-accent",
    title: "Winners of 2021–2024",
    body: (
      <>
        Beyond the big media networks (Dentsu +320%, BPN +117% — partly group
        restructuring), the standout organic growers are{" "}
        <b>Sons &amp; Daughters (+180%)</b>, <b>Spotlight (+166%)</b>,{" "}
        <b>Bosanova (+152%)</b> and <b>Expertmedia (+148%)</b> — all small-to-mid
        creative/digital shops.
      </>
    ),
  },
];

/** The collapsible "Key insights" card between the market KPIs and the charts. */
export function Insights() {
  return (
    <details className="border-line bg-panel group mb-6 rounded-[10px] border">
      <summary className="group-open:border-line flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[15px] font-bold group-open:border-b [&::-webkit-details-marker]:hidden">
        <span className="text-muted text-[12px] transition-transform group-open:rotate-90">
          ▸
        </span>
        Key insights
        <span className="border-line bg-panel2 text-muted rounded-md border px-[7px] py-px text-[11px] font-semibold">
          {INSIGHTS.length}
        </span>
      </summary>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5 p-3.5">
        {INSIGHTS.map((insight) => (
          <article
            key={insight.title}
            className={cn(
              "border-line bg-panel rounded-[10px] border border-l-4 px-4 py-3.5",
              insight.accent,
            )}
          >
            <h3 className="mb-1 text-[13px] font-semibold">{insight.title}</h3>
            <p className="text-muted [&>b]:text-ink text-[12.5px]">{insight.body}</p>
          </article>
        ))}
      </div>
    </details>
  );
}
