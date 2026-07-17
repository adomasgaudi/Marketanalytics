import { cn } from "@/lib/cn";
import type { Rank } from "./metrics";

/**
 * Where a company sits against the market on one metric: "#3 of 118 · top 97%".
 * Green in the top quartile, red in the bottom — the read the legacy gives.
 */
export function RankChip({ rank }: { rank: Rank | null }) {
  if (!rank) return null;

  return (
    <span
      className={cn(
        "font-semibold",
        rank.pct >= 75 ? "text-green" : rank.pct <= 25 ? "text-red" : "text-muted",
      )}
    >
      #{rank.pos} of {rank.total} · top {rank.pct}%
    </span>
  );
}
