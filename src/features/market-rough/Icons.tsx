/**
 * Icon set — Lucide geometry (24 grid, 1.5 stroke, round caps, currentColor).
 * Kept in one file so weight/size can't drift between call sites. Sized by the
 * `size` prop; colour is always inherited, never hard-coded.
 */

type IconProps = { size?: number; className?: string };

function Svg({
  size = 18,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* Sliders, not a gear: at 19px a toothed cog turns to mush, and horizontal
   rails read as "adjust settings" more cleanly at small sizes. */
export function IconSettings(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </Svg>
  );
}

export function IconSun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5Z" />
    </Svg>
  );
}

/* Four-point sparkle — marks the optional polish layer. */
export function IconSparkle(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5c.7 4.3 1.5 5.1 5.8 5.8-4.3.7-5.1 1.5-5.8 5.8-.7-4.3-1.5-5.1-5.8-5.8 4.3-.7 5.1-1.5 5.8-5.8Z" />
      <path d="M17.5 15.2c.3 2 .7 2.4 2.7 2.7-2 .3-2.4.7-2.7 2.7-.3-2-.7-2.4-2.7-2.7 2-.3 2.4-.7 2.7-2.7Z" />
    </Svg>
  );
}

/* Basis marks for the bottom bar. Read as a set: one figure = per head, the
   block = the whole company, many figures = the whole market. */

export function IconBuilding(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h16M6 20V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15" />
      <path d="M9.5 8h.01M14.5 8h.01M9.5 12h.01M14.5 12h.01M11 20v-3.5h2V20" />
    </Svg>
  );
}

export function IconPerson(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </Svg>
  );
}

/* Two figures + a divider bar — "spread across the market", not a globe. */
export function IconMarket(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 20h18" />
      <path d="M6 20V11M10.5 20V6M15 20v-7M19.5 20V9" />
    </Svg>
  );
}

/* Slashed zero = the mean. Matches the ⌀ it replaces without the font risk. */
export function IconAverage(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="12" rx="6" ry="8" />
      <path d="M5.5 19.5 18.5 4.5" />
    </Svg>
  );
}

/* Three stacked slices: compact marker for narrowing the market to a segment. */
export function IconSegments(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Svg>
  );
}

/* Half-filled disc — the standard "swap colour scheme" mark. */
export function IconPalette(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </Svg>
  );
}
