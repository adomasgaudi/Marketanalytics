"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION_LABEL } from "@/app-version";
import { IconMoon, IconPalette, IconSettings, IconSparkle, IconSun } from "./Icons";
import type { SegPalette } from "./segments";
import { useDashboardParams } from "./useDashboardParams";
import { useViewMode, ViewSub } from "./ViewSync";

/**
 * Legacy topnav, replicated 1:1: logo-as-button (back chevron off home, view
 * toggle on home), two-line Companies button, settings-wrap (clickable version
 * under the ⚙️ cog, dropdown menu with Dev-mode-gated items). Only deliberate
 * difference: the port-cycle button is named "⏭️ v2" and opens /v2.
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

export function TopNav({ active }: { active?: "markets" | "companies" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Secret dev key: 8 clicks on the version label enter Dev mode (hint at 5).
  const verClicks = useRef(0);
  const verTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [verHint, setVerHint] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [palette, setPalette] = useState<Palette>("classic");
  // Visual-polish layer. Defaults ON, but every rule is scoped under
  // [data-skin="refined"] — flipping this back to "classic" restores the
  // pre-polish design exactly, which is the kill switch for other devices.
  const [skin, setSkin] = useState<"classic" | "refined">("refined");
  // Doughnut/bars segment colours. "harmony" (default) is the muted validated
  // set; "spectral" restores the original saturated one. See segments.ts.
  const [segPalette, setSegPalette] = useState<SegPalette>("harmony");
  const [mode, setMode] = useState<"default" | "dev">("default");
  const [graphPan, setGraphPan] = useState(false);
  // Which dataset the money figures come from. In the URL so a comparison is
  // shareable; the toggle only writes it, CompaniesView reads it.
  const [{ src }, setParams] = useDashboardParams(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mktView, setMktView] = useViewMode("mkt");
  const [coView, setCoView] = useViewMode("co");

  // Read the persisted choices the same way the legacy pre-paint script does.
  useEffect(() => {
    try {
      if (localStorage.getItem("theme") === "light") setTheme("light");
      const saved = localStorage.getItem("palette");
      if (saved && (PALETTES as readonly string[]).includes(saved))
        setPalette(saved as Palette);
      if (localStorage.getItem("skin") === "classic") setSkin("classic");
      if (localStorage.getItem("segPalette") === "spectral") setSegPalette("spectral");
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
    root.setAttribute("data-skin", skin);
    // Absent attribute means "harmony" — only the opt-out is written.
    if (segPalette === "spectral") root.setAttribute("data-seg-palette", "spectral");
    else root.removeAttribute("data-seg-palette");
    try {
      localStorage.setItem("segPalette", segPalette);
      localStorage.setItem("theme", theme);
      localStorage.setItem("palette", palette);
      localStorage.setItem("viewMode", mode);
      localStorage.setItem("skin", skin);
      localStorage.setItem("graphPan", graphPan ? "on" : "off");
    } catch {}
  }, [theme, palette, mode, graphPan, skin, segPalette]);

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

  // Nav padding folds in the content wrap's own px-6 (840+48=792) so the logo
  // shares a left edge with the page content, not the column's outer edge.
  return (
    <nav className="border-line bg-panel sticky top-0 z-100 flex min-h-[50px] items-center border-b px-[max(24px,calc((100%-792px)/2))] max-sm:min-h-[46px] max-sm:px-2">
      <div
        role="button"
        tabIndex={0}
        title="Dashboard · click to toggle per-year / all-years"
        onClick={onLogo}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onLogo()}
        className="hover:text-accent focus-visible:text-accent mr-6 inline-flex flex-shrink-0 cursor-pointer items-center text-[15px] leading-[1.1] font-extrabold whitespace-nowrap transition-colors select-none focus-visible:outline-none max-sm:mr-2 max-sm:text-[13px]"
      >
        {/* Back chevron: always occupies space so the title never shifts;
            invisible on the dashboard (legacy .home-ic). */}
        <span
          className={`text-muted mr-[5px] align-[-1px] text-[1.15em] font-bold ${
            active === "markets" ? "invisible" : ""
          }`}
        >
          ‹
        </span>
        <span className="inline-flex flex-col leading-[1.08]">
          <span className="whitespace-nowrap">Market Analytics</span>
          <span className="text-muted text-[10px] font-semibold tracking-[.01em]">
            <ViewSub scope="mkt" />
          </span>
        </span>
      </div>

      {/* Two-line nav button: page name + small gray mode sub-label. Re-tapping
          it while ALREADY on Companies toggles per-year ⇄ all-years (legacy). */}
      <Link
        href="/companies"
        onClick={(e) => {
          if (active === "companies") {
            e.preventDefault();
            setCoView(coView === "year" ? "all" : "year");
          }
        }}
        className={`inline-flex h-[50px] flex-col items-center justify-center gap-px px-[18px] text-[15px] leading-[1.05] font-semibold whitespace-nowrap transition-colors select-none max-sm:h-[46px] max-sm:px-2 max-sm:text-[13px] ${
          active === "companies"
            ? "text-accent shadow-[inset_0_-2px_0_var(--color-accent)]"
            : // Same resting/hover colours as the Market Analytics logo, so the
              // two nav items read as equal peers rather than title + sub-link.
              "text-ink hover:text-accent"
        }`}
      >
        <span>Companies</span>
        <span className="text-muted text-[10px] font-semibold tracking-[.01em]">
          <ViewSub scope="co" />
        </span>
      </Link>

      {/* Data source. Rebuilt is the default and needs no announcement, so the
          pill only lights up when the site is showing the OLD spreadsheet
          figures — that is the state worth seeing from across the room.
          `ml-auto` starts the right-hand cluster. */}
      <button
        type="button"
        onClick={() => setParams({ src: src === "rebuilt" ? "legacy" : "rebuilt" })}
        aria-pressed={src === "rebuilt"}
        title="Rebuilt figures (Registrų centras + Sodra) vs the original spreadsheet's"
        className={`ml-auto flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
          src === "legacy"
            ? "border-gold text-gold bg-gold/12"
            : "border-line text-muted hover:text-ink"
        }`}
      >
        🧮 {src === "legacy" ? "Legacy data" : "Rebuilt data"}
      </button>

      {/* settings-wrap: cog above, clickable version below, menus anchored right. */}
      <div
        ref={wrapRef}
        className="relative flex flex-shrink-0 flex-col-reverse items-center justify-center gap-px"
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
          className="letterpress text-muted text-[10px] leading-none font-semibold whitespace-nowrap select-none"
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
          <IconSettings size={19} className="block" />
        </button>

        {open && (
          <div className="border-line bg-panel absolute top-[calc(100%+4px)] right-0 z-200 min-w-[160px] rounded-[10px] border p-2 shadow-[0_4px_20px_rgba(0,0,0,.4)]">
            {/* Labels name the mode you'd switch TO, not the current one. */}
            <button
              type="button"
              className={menuItem}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button
              type="button"
              className={menuItem}
              // Cycles through the accent palettes rather than flipping two.
              onClick={() =>
                setPalette(PALETTES[(PALETTES.indexOf(palette) + 1) % PALETTES.length])
              }
            >
              <IconPalette size={15} />
              <span className="capitalize">{palette}</span>
            </button>
            {/* Kill switch for the polish layer — deliberately NOT dev-gated so
                it stays reachable on a phone if the new skin misbehaves. */}
            <button
              type="button"
              className={menuItem}
              onClick={() => setSkin(skin === "refined" ? "classic" : "refined")}
            >
              <IconSparkle size={15} />
              {skin === "refined" ? "Skin: refined" : "Skin: classic"}
            </button>
            {/* Segment chart colours; "spectral" restores the pre-v3.41 set. */}
            <button
              type="button"
              className={menuItem}
              onClick={() =>
                setSegPalette(segPalette === "harmony" ? "spectral" : "harmony")
              }
            >
              <IconPalette size={15} />
              {segPalette === "harmony" ? "Segments: harmony" : "Segments: spectral"}
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
                  title="Sodra scraping runs in CI (refresh-sodra workflow)"
                >
                  🔄 Refresh Sodra
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
