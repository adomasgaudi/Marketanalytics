export const DEFAULT_YEAR = 2025;
export const PUBLIC_YEAR_FLOOR = 2021;

export function publicYears(years: number[]) {
  return years.filter((year) => year >= PUBLIC_YEAR_FLOOR);
}
