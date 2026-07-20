/**
 * Stand-in for @adomas/dev-tools when that optional package isn't installed
 * (CI, or a clone without the sibling "Meta apps" checkout). next.config.ts
 * aliases the package to this file whenever it can't be found on disk, so a
 * production build never depends on a path outside the repo.
 *
 * The dev corner only ever mounts in Dev mode, which a deployed build can't
 * enter meaningfully — rendering nothing is the correct behaviour, not a
 * degraded one.
 */
type HistoryEntry = { version: string; title: string; summary: string };

/** Mirrors the real DevCorner's props so the call site type-checks either way. */
export function DevCorner(_props: {
  history?: { version: string; entries: HistoryEntry[] };
}) {
  return null;
}
