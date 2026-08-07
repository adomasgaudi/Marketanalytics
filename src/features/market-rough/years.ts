"use client";

import { useEffect, useMemo, useState } from "react";
import { publicYears } from "./year-policy";

export function useDevMode() {
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsDev(root.getAttribute("data-mode") === "dev");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-mode"] });
    return () => observer.disconnect();
  }, []);

  return isDev;
}

export function useVisibleYears(years: number[]) {
  const isDev = useDevMode();
  return useMemo(() => (isDev ? years : publicYears(years)), [isDev, years]);
}
