"use client";

import type { CompanyProfile } from "./profile";
import { SEG_COLORS, segName } from "./segments";
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

  // Segment dots: the selected year's activities, else the newest year that has any.
  const years = Object.keys(mine)
    .map(Number)
    .sort((a, b) => b - a);
  const acts = row?.activities?.length
    ? row.activities
    : (years.map((y) => mine[y]).find((r) => r.activities?.length)?.activities ?? []);

  const rows: [string, React.ReactNode][] = [
    ["CEO", profile?.ceo ?? <Nd />],
    ["Founded", profile?.founded ?? <Nd />],
    ["Employees", row?.employees != null ? Math.round(row.employees) : <Nd />],
    [
      "Segment",
      acts.length ? (
        <span>
          {acts.map((s) => (
            <span key={s} className="mr-1">
              <span
                className="mr-1 inline-block h-2 w-2 rounded-full align-[-1px]"
                style={{ background: SEG_COLORS[s] ?? "#888" }}
              />
              {segName(s)}
            </span>
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
