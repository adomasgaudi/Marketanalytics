"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION_LABEL } from "@/app-version";
import { ViewSub } from "./ViewSync";

/**
 * Legacy topnav, replicated 1:1: logo (main + "per year" sub), a two-line
 * Companies button, and the settings-wrap on the right (version label under
 * the ⚙️ cog, dropdown menu). Only deliberate difference from the original:
 * the port-cycle button is named "⏭️ v2" and simply opens /v2.
 *
 * The bar spans the viewport while its contents line up with the centred
 * column — the legacy's max() padding trick, no wrapper element needed.
 */
export function TopNav({ active }: { active?: "markets" | "companies" }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [palette, setPalette] = useState<"classic" | "ocean">("classic");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Read the persisted choices the same way the legacy pre-paint script does.
  useEffect(() => {
    try {
      if (localStorage.getItem("theme") === "light") setTheme("light");
      if (localStorage.getItem("palette") === "ocean") setPalette("ocean");
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    if (palette !== "classic") root.setAttribute("data-palette", palette);
    else root.removeAttribute("data-palette");
    try {
      localStorage.setItem("theme", theme);
      localStorage.setItem("palette", palette);
    } catch {}
  }, [theme, palette]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menuItem =
    "flex w-full cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-2.5 py-[7px] text-left text-[13px] text-ink hover:bg-panel2";

  return (
    <nav className="border-line bg-panel sticky top-0 z-100 flex min-h-[50px] items-center border-b px-[max(24px,calc((100%-840px)/2))] max-sm:min-h-[46px] max-sm:px-2">
      {/* Logo = the Markets "tab", as in the legacy (clicking it goes home). */}
      <Link
        href="/"
        className="hover:text-accent mr-6 inline-flex flex-shrink-0 cursor-pointer items-center text-[15px] leading-[1.1] font-extrabold whitespace-nowrap transition-colors max-sm:mr-2 max-sm:text-[13px]"
      >
        <span className="inline-flex flex-col leading-[1.08]">
          <span className="whitespace-nowrap">Market Analytics</span>
          <span className="text-muted text-[10px] font-semibold tracking-[.01em]">
            <ViewSub />
          </span>
        </span>
      </Link>

      {/* Two-line nav button: page name + small gray mode sub-label. */}
      <Link
        href="/companies"
        className={`inline-flex h-[50px] flex-col items-center justify-center gap-px px-[18px] text-[15px] leading-[1.05] font-semibold whitespace-nowrap transition-colors max-sm:h-[46px] max-sm:px-2 max-sm:text-[13px] ${
          active === "companies"
            ? "text-accent shadow-[inset_0_-2px_0_var(--color-accent)]"
            : "text-muted hover:text-ink"
        }`}
      >
        <span>Companies</span>
        <span className="text-muted text-[10px] font-semibold tracking-[.01em]">
          <ViewSub />
        </span>
      </Link>

      {/* settings-wrap: cog above, version label below, menu anchored right. */}
      <div
        ref={wrapRef}
        className="relative mr-2 ml-auto flex flex-shrink-0 flex-col-reverse items-center justify-center gap-px"
      >
        <span className="text-muted text-[10px] leading-none font-semibold whitespace-nowrap">
          {APP_VERSION_LABEL}
        </span>
        <button
          type="button"
          title="Settings"
          aria-label="Settings"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-muted hover:text-accent cursor-pointer border-none bg-transparent px-2 py-1 leading-none transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            width="19"
            height="19"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="block"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2.6l1.5 2.7 3-.7.4 3 2.7 1.4-1.5 2.6 1.5 2.6-2.7 1.4-.4 3-3-.7L12 21.4l-1.5-2.7-3 .7-.4-3L4.4 15l1.5-2.6L4.4 9.8l2.7-1.4.4-3 3 .7z" />
          </svg>
        </button>

        {open && (
          <div className="border-line bg-panel absolute top-[calc(100%+4px)] right-0 z-200 min-w-[160px] rounded-[10px] border p-2 shadow-[0_4px_20px_rgba(0,0,0,.4)]">
            <button
              type="button"
              className={menuItem}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
            <button
              type="button"
              className={menuItem}
              onClick={() => setPalette(palette === "classic" ? "ocean" : "classic")}
            >
              {palette === "classic" ? "🎨 Classic" : "🎨 Ocean"}
            </button>
            {/* Renamed port button: opens the previous-generation dashboard. */}
            <Link href="/v2" className={menuItem} onClick={() => setOpen(false)}>
              ⏭️ v2
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
