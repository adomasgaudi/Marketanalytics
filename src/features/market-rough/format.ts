/** Compact number: 1.2M / 340k / 87. Mirrors the legacy dashboard's fmtM. */
export function fmtM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(Math.round(value));
}

/** Compact euros, with an en-dash for missing values (fmtEur). */
export function fmtEur(value: number | null | undefined): string {
  return value == null ? "–" : `€${fmtM(value)}`;
}

/** Signed percentage from a ratio: 0.12 -> "+12%" (fmtPct). */
export function fmtPct(ratio: number | null | undefined): string {
  if (ratio == null) return "–";
  const sign = ratio > 0 ? "+" : "";
  return `${sign}${(ratio * 100).toFixed(0)}%`;
}

/** Full euro amount with thousands separators: €1,234,567 (the legacy's E). */
export function fmtEurFull(value: number | null | undefined): string {
  return value == null ? "–" : `€${Math.round(value).toLocaleString()}`;
}

/** Plain integer with thousands separators. */
export function fmtInt(value: number | null | undefined): string {
  return value == null ? "–" : Math.round(value).toLocaleString();
}
