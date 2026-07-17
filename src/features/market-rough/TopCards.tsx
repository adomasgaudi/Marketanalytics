import type { MarketModel } from "./types";

const SOURCES = [
  { label: "Initial dataset", cube: "bg-green" },
  { label: "Rekvizitai.vz.lt", cube: "bg-accent" },
  { label: "Sodra", cube: "bg-amber" },
] as const;

/** The two cards under the hero: tracked-company count and the data sources. */
export function TopCards({ model }: { model: MarketModel }) {
  return (
    <div className="my-4 grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
      <article className="border-line bg-panel rounded-[10px] border px-[13px] py-[11px]">
        <div className="text-muted text-[11px] tracking-[.05em] uppercase">
          Companies tracked
        </div>
        <div className="mt-0.5 text-[21px] font-bold">{model.brands.length}</div>
        <div className="mt-0.5 text-[12px]">
          {model.segments.length} service segments
        </div>
      </article>
      <article className="border-line bg-panel rounded-[10px] border px-[13px] py-[11px]">
        <div className="text-muted text-[11px] tracking-[.05em] uppercase">
          Data sources
        </div>
        <div className="mt-[7px] flex flex-col gap-1.5 text-[13px]">
          {SOURCES.map((source) => (
            <span key={source.label} className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 flex-none rounded-[3px] ${source.cube}`}
              />
              {source.label}
            </span>
          ))}
        </div>
      </article>
    </div>
  );
}
