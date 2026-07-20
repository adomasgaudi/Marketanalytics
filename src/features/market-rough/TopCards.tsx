import type { MarketModel } from "./types";

const SOURCES = [
  { label: "Initial dataset", cube: "bg-green" },
  { label: "Rekvizitai.vz.lt", cube: "bg-accent" },
  { label: "Sodra", cube: "bg-amber" },
] as const;

/** The two cards under the hero: tracked-company count and the data sources. */
export function TopCards({ model }: { model: MarketModel }) {
  return (
    // Borderless stat band rather than two boxes — the count carries the drama,
    // the sources sit under it as quiet chips.
    <div className="mt-7 mb-20 flex flex-wrap items-end gap-x-10 gap-y-5 md:mb-28">
      <div>
        <div className="text-muted text-[11px] font-semibold tracking-[.18em] uppercase">
          Companies tracked
        </div>
        <div className="mt-1 flex items-baseline gap-2.5">
          <span className="text-[clamp(40px,7vw,58px)] leading-[0.9] font-extrabold tracking-[-0.04em] tabular-nums">
            {model.brands.length}
          </span>
          <span className="text-muted text-[13px]">
            across {model.segments.length} service segments
          </span>
        </div>
      </div>
      <div className="pb-1.5">
        <div className="text-muted mb-2 text-[11px] font-semibold tracking-[.18em] uppercase">
          Data sources
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((source) => (
            <span
              key={source.label}
              className="border-line bg-panel flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-[12.5px] font-medium"
            >
              <span
                className={`inline-block h-2 w-2 flex-none rounded-full ${source.cube}`}
              />
              {source.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
