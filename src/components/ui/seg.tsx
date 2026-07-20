"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Legacy .seg: a JOINED segmented control — one rounded border around the
 * group, divider lines between buttons, active segment solid accent.
 * (Distinct from Pill, which is a free-standing rounded button.)
 */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  btnClassName,
  onHoverChange,
}: {
  /** `title` doubles as the tooltip + accessible name when `label` is an icon. */
  options: { value: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  /** Override button padding (legacy .seg-row segs are denser: 6px 11px). */
  btnClassName?: string;
  /** Fires with the hovered/focused option (null on leave). Supplied when the
   *  caller renders its own explanation popup — the native `title` tooltip is
   *  then suppressed so the two don't stack. */
  onHoverChange?: (value: T | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "seg-group border-line inline-flex overflow-hidden rounded-[8px] border",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={onHoverChange ? undefined : option.title}
          aria-label={option.title}
          onClick={() => onChange(option.value)}
          onPointerEnter={() => onHoverChange?.(option.value)}
          onPointerLeave={() => onHoverChange?.(null)}
          onFocus={() => onHoverChange?.(option.value)}
          onBlur={() => onHoverChange?.(null)}
          data-on={option.value === value}
          className={cn(
            "seg-btn border-line cursor-pointer border-r px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors last:border-r-0",
            option.value === value
              ? "bg-accent text-white"
              : "bg-panel2 text-muted hover:text-ink",
            btnClassName,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
