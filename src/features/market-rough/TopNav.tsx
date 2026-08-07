"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION_LABEL } from "@/app-version";
import { IconMoon, IconSettings, IconSun } from "./Icons";
import { NuqsBoundary } from "@/components/nuqs-boundary";

/**
 * Two page tabs plus theme controls and the Dev-mode settings menu. Time-view
 * switching lives under each page title, so these tabs only change pages.
 */
/** Accent palettes, in cycle order. "classic" is the original blue. */
const PALETTES = [
  "classic",
  "ocean",
  "indigo",
  "violet",
  "emerald",
  "amber",
  "slate",
] as const;
type Palette = (typeof PALETTES)[number];

/**
 * Wrapper with its own nuqs boundary: useViewMode reads the URL, and a page
 * without an adapter (the static /companies/<slug> profiles) would crash at
 * prerender. The boundary scopes the client-side bailout to the nav alone, so
 * those pages still export their CONTENT as real HTML.
 */
export function TopNav(props: { active?: "markets" | "companies" }) {
  return (
    <NuqsBoundary>
      <TopNavInner {...props} />
    </NuqsBoundary>
  );
}

function TopNavInner({ active }: { active?: "markets" | "companies" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<"Markets" | "Companies" | null>(null);
  // Secret dev key: 8 clicks on the version label enter Dev mode (hint at 5).
  const verClicks = useRef(0);
  const verTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [verHint, setVerHint] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [palette, setPalette] = useState<Palette>("classic");
  const [mode, setMode] = useState<"default" | "dev">("default");
  const [graphPan, setGraphPan] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Read the persisted choices the same way the legacy pre-paint script does.
  useEffect(() => {
    try {
      if (localStorage.getItem("theme") === "light") setTheme("light");
      const saved = localStorage.getItem("palette");
      if (saved && (PALETTES as readonly string[]).includes(saved))
        setPalette(saved as Palette);
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

  const menuItem =
    "flex w-full cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-2.5 py-[7px] text-left text-[13px] text-ink hover:bg-panel2";

  const switchView = (
    event: React.MouseEvent<HTMLAnchorElement>,
    target: "markets" | "companies",
  ) => {
    if (active === target) return;
    event.preventDefault();
    setSwitchingTo(target === "markets" ? "Markets" : "Companies");
    window.setTimeout(() => router.push(target === "markets" ? "/" : "/companies"), 500);
  };

  // Secret dev key (legacy VER_DEV_CLICKS): 8 clicks → Dev mode; hint at 5; the
  // counter resets after 3.2s. Inert once already in Dev mode.
  const onVerClick = (e: React.MouseEvent) => {
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
  };
  const versionTag = (sizeCls: string) => (
    <span
      onClick={onVerClick}
      className={`letterpress text-muted ${sizeCls} leading-none font-semibold whitespace-nowrap select-none`}
    >
      {APP_VERSION_LABEL}
    </span>
  );
  const verHintEl = verHint ? (
    <span className="border-line bg-panel text-muted absolute top-[calc(100%+5px)] right-0 z-210 rounded-[4px] border px-2 py-[3px] text-[10px] font-semibold whitespace-nowrap shadow-[0_2px_10px_rgba(0,0,0,.18)]">
      {verHint}
    </span>
  ) : null;

  // Nav padding folds in the content wrap's own px-6 (840+48=792) so the logo
  // shares a left edge with the page content, not the column's outer edge.
  return (
    <>
      <nav className="border-line bg-panel sticky top-0 z-100 flex min-h-[50px] items-center border-b px-[max(24px,calc((100%-792px)/2))] max-sm:min-h-[46px] max-sm:px-2">
        <Link
          href="/"
          onClick={(event) => switchView(event, "markets")}
          className={`inline-flex h-[50px] items-center px-[18px] text-[15px] font-semibold whitespace-nowrap transition-colors max-sm:h-[46px] max-sm:px-2 max-sm:text-[13px] ${
            active === "markets"
              ? "text-accent shadow-[inset_0_-2px_0_var(--color-accent)]"
              : "text-ink hover:text-accent"
          }`}
        >
          Markets
        </Link>

      {/* Page navigation only; time-view controls live under the hero titles. */}
        <Link
          href="/companies"
          onClick={(event) => switchView(event, "companies")}
          className={`inline-flex h-[50px] items-center px-[18px] text-[15px] font-semibold whitespace-nowrap transition-colors max-sm:h-[46px] max-sm:px-2 max-sm:text-[13px] ${
            active === "companies"
              ? "text-accent shadow-[inset_0_-2px_0_var(--color-accent)]"
              : // Same resting/hover colours as the Market Analytics logo, so the
                // two nav items read as equal peers rather than title + sub-link.
                "text-ink hover:text-accent"
          }`}
        >
          Companies
        </Link>

        {/* Right cluster: the theme+accent control lives out here (the settings
          menu below is empty in default mode); the cog appears only in Dev. */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          {/* One control, two sides: theme on the left, accent swatch on the
            right. In default mode the version sits to their left. */}
          <div className="flex items-center gap-1">
            {mode !== "dev" && (
              <span className="relative inline-flex items-center">
                {versionTag("text-[8px]")}
                {verHintEl}
              </span>
            )}
            <div className="border-line flex items-center overflow-hidden rounded-full border">
              <button
                type="button"
                title={theme === "dark" ? "Switch to light" : "Switch to dark"}
                aria-label="Toggle light / dark theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-muted hover:text-accent hover:bg-panel2 flex cursor-pointer items-center px-2.5 py-1 leading-none transition-colors"
              >
                {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
              </button>
              <span className="bg-line h-4 w-px" />
              <button
                type="button"
                title={`Accent: ${palette} — click to cycle`}
                aria-label="Cycle accent colour"
                // Cycles through the accent palettes rather than flipping two.
                onClick={() =>
                  setPalette(PALETTES[(PALETTES.indexOf(palette) + 1) % PALETTES.length])
                }
                className="hover:bg-panel2 flex cursor-pointer items-center px-2.5 py-1 leading-none transition-colors"
              >
                <span
                  className="border-line h-3.5 w-3.5 rounded-full border"
                  style={{ background: "var(--color-accent)" }}
                />
              </button>
            </div>
          </div>

          {/* Dev only: the version sits beside the cog, menus anchored right. */}
          {mode === "dev" && (
            <div
              ref={wrapRef}
              className="relative flex flex-shrink-0 flex-col-reverse items-center justify-center gap-px"
            >
              {versionTag("text-[10px]")}
              <button
                type="button"
                title="Settings"
                aria-label="Settings"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="text-muted hover:text-accent cursor-pointer border-none bg-transparent px-2 py-1 leading-none transition-colors"
              >
                <IconSettings size={19} className="block" />
              </button>

              {open && (
                <div className="border-line bg-panel absolute top-[calc(100%+4px)] right-0 z-200 min-w-[160px] rounded-[10px] border p-2 shadow-[0_4px_20px_rgba(0,0,0,.4)]">
                  <button
                    type="button"
                    className={menuItem}
                    onClick={() => {
                      setMode("default");
                      setOpen(false);
                    }}
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
                    title="Sodra scraping runs in CI (refresh-sodra workflow)"
                  >
                    🔄 Refresh Sodra
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
      {switchingTo && (
        <div className="bg-bg/90 fixed inset-0 z-[700] grid place-items-center backdrop-blur-sm">
          <div className="text-center">
            <span className="border-line border-t-accent mx-auto mb-3 block h-8 w-8 animate-spin rounded-full border-2" />
            <p className="text-sm font-semibold">Opening {switchingTo}…</p>
          </div>
        </div>
      )}
    </>
  );
}
