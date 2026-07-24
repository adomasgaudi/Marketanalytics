import { cn } from "@/lib/cn";

/**
 * The arrow-key cluster, drawn as keycaps with what each axis does.
 *
 * The bindings existed but were invisible: nothing on the page said the whole
 * dashboard is drivable from the keyboard, so nobody found it. Shown in the
 * hero rather than a help panel because it is only worth knowing before you
 * start, and it costs nothing to ignore.
 *
 * Shown only where a keyboard exists: `hover: hover` + `pointer: fine` means a
 * mouse or trackpad, i.e. a computer. A width breakpoint was the wrong test —
 * a tablet is wide enough to pass it and still has no arrow keys.
 */
const CAP =
  "border-line text-muted flex h-8 w-8 items-center justify-center rounded-[7px] border bg-panel text-[13px] leading-none";

export function ArrowKeysHint({
  vertical,
  className,
}: {
  /** What ↑/↓ do here. Omitted, the vertical pair is drawn inactive — the
      Companies page binds only the horizontal axis. */
  vertical?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "kbd-hint text-muted items-center justify-center gap-5",
        className,
      )}
      aria-hidden
    >
      {/* Left label, right-aligned so it points into the cluster. */}
      <span className="w-[92px] text-right text-[11px] leading-tight font-semibold tracking-[.12em] uppercase">
        prev year
      </span>

      <div className="flex flex-col items-center gap-1">
        <div className={cn(CAP, !vertical && "opacity-35")}>↑</div>
        <div className="flex gap-1">
          <div className={CAP}>←</div>
          <div className={cn(CAP, !vertical && "opacity-35")}>↓</div>
          <div className={CAP}>→</div>
        </div>
        <span
          className={cn(
            "mt-1 text-[11px] leading-tight font-semibold tracking-[.12em] uppercase",
            !vertical && "opacity-35",
          )}
        >
          {vertical ?? "—"}
        </span>
      </div>

      <span className="w-[92px] text-left text-[11px] leading-tight font-semibold tracking-[.12em] uppercase">
        next year
      </span>
    </div>
  );
}
