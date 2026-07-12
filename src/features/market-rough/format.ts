export function fmtM(value: number) {
  return `${(value / 1_000_000).toFixed(1)}M`;
}

export function fmtInt(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
