"use client";

import { useEffect, useState } from "react";
import { APP_VERSION } from "@/app-version";
import { VERSIONS } from "@/features/market-rough/version-history";
import { DevCorner } from "@adomas/dev-tools";

/**
 * Next.js seam for the portable Pepper dev toolkit (src/dev): mounts
 * <DevCorner /> only in Dev mode (html[data-mode="dev"], toggled by the
 * 8-click secret in the TopNav) and only after hydration — DevCorner reads
 * localStorage in its initializers, so it must never render on the server.
 */
export function DevCornerMount() {
  const [dev, setDev] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDev(root.getAttribute("data-mode") === "dev");
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ["data-mode"] });
    return () => mo.disconnect();
  }, []);

  if (!dev) return null;
  return (
    <DevCorner
      history={{
        version: APP_VERSION,
        entries: VERSIONS.map((e) => ({
          version: e.v.replace(/^v/, ""),
          title: e.title,
          summary: e.desc ?? `${e.date}${e.sp != null ? ` · ${e.sp} sp` : ""}`,
        })),
      }}
    />
  );
}
