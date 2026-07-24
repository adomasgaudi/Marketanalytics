import type { MetadataRoute } from "next";

// Required for output: "export" — metadata routes must opt in to static.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://marketanalytics.lt/sitemap.xml",
  };
}
