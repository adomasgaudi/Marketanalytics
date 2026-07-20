"use client";

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
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  /** Override button padding (legacy .seg-row segs are denser: 6px 11px). */
  btnClassName?: string;
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
          onClick={() => onChange(option.value)}
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
