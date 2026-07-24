"use client";

import type { CompanyProfile } from "./profile";
import { segName } from "./segments";
import { useSegColors } from "./useSegColors";
import type { MarketModel } from "./types";

const Nd = () => <span className="text-muted italic">no data</span>;

/** The legacy #mineNote profile box: brand + full legal name, CEO / Founded /
    Employees / Segment / Risk / Type / Website rows, then the Rekvizitai
    description (or an "About: no data" row). */
export function CompanyProfileCard({
  model,
  brand,
  year,
  profile,
}: {
  model: MarketModel;
  brand: string;
  year: number;
  profile?: CompanyProfile;
}) {
  const mine = model.byBrand[brand] ?? {};
  const row = mine[year];
  const fullName = Object.values(mine)
    .map((r) => r.company)
    .find(Boolean);

  // Company type = legal form parsed from the full name (UAB / MB / VšĮ / AB …).
  const lf = fullName?.includes(",") ? fullName.split(",").pop()!.trim() : "";
  const ctype = lf && lf.length <= 6 ? lf : "";

  let webHref: string | null = null;
  let webDom = "";
  if (profile?.website) {
    webHref = /^https?:\/\//.test(profile.website)
      ? profile.website.trim()
      : `https://${profile.website.trim()}`;
    webDom = webHref.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  }

  const SEG_COLORS = useSegColors();

  // Segment dots: the selected year's activities, else the newest year that has any.
  const years = Object.keys(mine)
    .map(Number)
    .sort((a, b) => b - a);
  const acts = row?.activities?.length
    ? row.activities
    : (years.map((y) => mine[y]).find((r) => r.activities?.length)?.activities ?? []);
  const main = row?.mainSegment ?? acts[0];

  /** One coloured dot plus its segment name. */
  const SegDot = ({ seg, bold }: { seg: string; bold?: boolean }) => (
    <span className="mr-1.5 whitespace-nowrap">
      <span
        className="mr-1 inline-block h-2 w-2 rounded-full align-[-1px]"
        style={{ background: SEG_COLORS[seg] ?? "#888" }}
      />
      <span className={bold ? "font-bold" : "text-muted font-normal"}>
        {segName(seg)}
      </span>
    </span>
  );

  const rows: [string, React.ReactNode][] = [
    ["CEO", profile?.ceo ?? <Nd />],
    ["Founded", profile?.founded ?? <Nd />],
    ["Employees", row?.employees != null ? Math.round(row.employees) : <Nd />],
    // The main segment gets its own line. Inline, an "main" tag after one of
    // four names was easy to miss, and the one segment a company is actually
    // known for is the thing a reader wants first.
    [
      "Main segment",
      main ? <SegDot seg={main} bold /> : <Nd />,
    ],
    [
      "Also in",
      acts.filter((s) => s !== main).length ? (
        <span>
          {acts
            .filter((s) => s !== main)
            .map((s) => (
              <SegDot key={s} seg={s} />
            ))}
        </span>
      ) : (
        <Nd />
      ),
    ],
    ["Risk", row?.risk || <Nd />],
    ["Type", ctype || <Nd />],
    [
      "Website",
      webHref ? (
        <a href={webHref} target="_blank" rel="noopener" className="text-accent">
          {webDom}
        </a>
      ) : (
        <Nd />
      ),
    ],
  ];

  return (
    <div className="border-line bg-panel mb-4 rounded-xl border p-4">
      <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
        <span className="text-[15px] font-bold">{brand}</span>
        {fullName && fullName !== brand && (
          <span className="text-muted text-[12px]">{fullName}</span>
        )}
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2 py-[1px] text-[12.5px]">
          <span className="text-muted min-w-[88px]">{k}</span>
          <span className="font-semibold">{v}</span>
        </div>
      ))}
      {profile?.description ? (
        <div className="border-line mt-2 border-t pt-2 text-[12.5px]">
          {profile.description}
        </div>
      ) : (
        <div className="flex gap-2 py-[1px] text-[12.5px]">
          <span className="text-muted min-w-[88px]">About</span>
          <span className="font-semibold">
            <Nd />
          </span>
        </div>
      )}
    </div>
  );
}
