import type { MetadataRoute } from "next";

// Required for output: "export" — metadata routes must opt in to static.
export const dynamic = "force-static";

const BASE = "https://marketanalytics.lt";

// Static export: generated once at build. Routes are hand-listed — the app
// has no dynamic segments, so this stays in sync by construction.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/companies`, priority: 0.9 },
    { url: `${BASE}/explore`, priority: 0.5 },
    { url: `${BASE}/explore/model`, priority: 0.3 },
    { url: `${BASE}/explore/sheets`, priority: 0.3 },
  ];
}
