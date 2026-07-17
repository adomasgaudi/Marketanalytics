"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION_LABEL } from "@/app-version";
import { useViewMode, ViewSub } from "./ViewSync";

/**
 * Legacy topnav, replicated 1:1: logo-as-button (back chevron off home, view
 * toggle on home), two-line Companies button, settings-wrap (clickable version
 * under the ⚙️ cog, dropdown menu with Dev-mode-gated items). Only deliberate
 * difference: the port-cycle button is named "⏭️ v2" and opens /v2.
 */
export function TopNav({ active }: { active?: "markets" | "companies" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Secret dev key: 8 clicks on the version label enter Dev mode (hint at 5).
  const verClicks = useRef(0);
  const verTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [verHint, setVerHint] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [palette, setPalette] = useState<"classic" | "ocean">("classic");
  const [mode, setMode] = useState<"default" | "dev">("default");
  const [graphPan, setGraphPan] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mktView, setMktView] = useViewMode("mkt");

  // Read the persisted choices the same way the legacy pre-paint script does.
  useEffect(() => {
    try {
      if (localStorage.getItem("theme") === "light") setTheme("light");
      if (localStorage.getItem("palette") === "ocean") setPalette("ocean");
      if (localStorage.getItem("viewMode") === "dev") setMode("dev");
      if (localStorage.getItem("graphPan") === "on") setGraphPan(true);
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    if (palette !== "classic") root.setAttribute("data-palette", palette);
    else root.removeAttribute("data-palette");
    root.setAttribute("data-mode", mode);
    try {
      localStorage.setItem("theme", theme);
      localStorage.setItem("palette", palette);
      localStorage.setItem("viewMode", mode);
      localStorage.setItem("graphPan", graphPan ? "on" : "off");
    } catch {}
  }, [theme, palette, mode, graphPan]);

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

  // Legacy navHome: on the dashboard the logo toggles per-year/all-years; from
  // any other view it navigates home.
  const onLogo = () => {
    if (active === "markets") setMktView(mktView === "year" ? "all" : "year");
    // Keep the URL params so both pages' view modes survive the hop, as the
    // legacy's in-memory state does.
    else router.push(`/${window.location.search}`);
  };

  const menuItem =
    "flex w-full cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-2.5 py-[7px] text-left text-[13px] text-ink hover:bg-panel2";

  return (
    <nav className="border-line bg-panel sticky top-0 z-100 flex min-h-[50px] items-center border-b px-[max(24px,calc((100%-840px)/2))] max-sm:min-h-[46px] max-sm:px-2">
      <div
        role="button"
        tabIndex={0}
        title="Dashboard · click to toggle per-year / all-years"
        onClick={onLogo}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onLogo()}
        className="hover:text-accent focus-visible:text-accent mr-6 inline-flex flex-shrink-0 cursor-pointer items-center text-[15px] leading-[1.1] font-extrabold whitespace-nowrap transition-colors focus-visible:outline-none max-sm:mr-2 max-sm:text-[13px]"
      >
        {/* Back chevron: hidden on the dashboard, shown off-home (legacy .home-ic). */}
        {active !== "markets" && (
          <span className="text-muted mr-[5px] align-[-1px] text-[1.15em] font-bold">
            ‹
          </span>
        )}
        <span className="inline-flex flex-col leading-[1.08]">
          <span className="whitespace-nowrap">Market Analytics</span>
          <span className="text-muted text-[10px] font-semibold tracking-[.01em]">
            <ViewSub scope="mkt" />
          </span>
        </span>
      </div>

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
          <ViewSub scope="co" />
        </span>
      </Link>

      {/* settings-wrap: cog above, clickable version below, menus anchored right.
          Desktop: follows Companies (legacy .nav-scroll has no flex-grow there);
          ≤600px the legacy grows nav-scroll, pushing this cluster right. */}
      <div
        ref={wrapRef}
        className="relative mr-2 flex flex-shrink-0 flex-col-reverse items-center justify-center gap-px max-sm:ml-auto"
      >
        {/* Secret dev key (legacy VER_DEV_CLICKS): 8 clicks → Dev mode; hint at
            5; the counter resets after 3.2s. Inert once already in Dev mode. */}
        <span
          onClick={(e) => {
            if (mode === "dev") return;
            e.stopPropagation();
            verClicks.current++;
            if (verTimer.current) clearTimeout(verTimer.current);
            verTimer.current = setTimeout(() => {
              verClicks.current = 0;
              setVerHint("");
            }, 3200);
            if (verClicks.current === 5) setVerHint("Click 3 more times");
            if (verClicks.current >= 8) {
              verClicks.current = 0;
              setVerHint("");
              setMode("dev");
            }
          }}
          className="text-muted text-[10px] leading-none font-semibold whitespace-nowrap select-none"
        >
          {APP_VERSION_LABEL}
        </span>
        {verHint && (
          <span className="border-line bg-panel text-muted absolute top-[calc(100%+5px)] right-0 z-210 rounded-[4px] border px-2 py-[3px] text-[10px] font-semibold whitespace-nowrap shadow-[0_2px_10px_rgba(0,0,0,.18)]">
            {verHint}
          </span>
        )}
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
            {/* Labels name the mode you'd switch TO, not the current one. */}
            <button
              type="button"
              className={menuItem}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button
              type="button"
              className={menuItem}
              onClick={() => setPalette(palette === "classic" ? "ocean" : "classic")}
            >
              {palette === "classic" ? "🎨 Ocean" : "🎨 Classic"}
            </button>
            {/* Dev-mode-only items, exactly as the legacy default-mode gating. */}
            {mode === "dev" && (
              <>
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => setMode("default")}
                >
                  → Default view
                </button>
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => setGraphPan((v) => !v)}
                >
                  🔒 Graph pan: {graphPan ? "on" : "off"}
                </button>
                <button
                  type="button"
                  className={`${menuItem} cursor-default opacity-50`}
                  title="Sodra scraping runs from the legacy app"
                >
                  🔄 Refresh Sodra
                </button>
                {/* Renamed port button: opens the previous-generation dashboard. */}
                <Link href="/v2" className={menuItem} onClick={() => setOpen(false)}>
                  ⏭️ v2
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
