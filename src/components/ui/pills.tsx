"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * A horizontal strip of pressable options — the app's only option control
 * (never a checkbox, radio or native select). Scrolls sideways rather than
 * wrapping, so a long year row stays one line on a phone.
 */
const pill = cva(
  "cursor-pointer whitespace-nowrap border border-line px-3 py-1.5 text-[13px] font-semibold transition-colors",
  {
    variants: {
      selected: {
        true: "border-accent bg-accent text-white",
        false: "bg-panel2 text-muted hover:text-ink",
      },
    },
    defaultVariants: { selected: false },
  },
);

type PillProps = React.ComponentPropsWithoutRef<"button"> & VariantProps<typeof pill>;

export function Pill({ selected, className, ...props }: PillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected ?? false}
      className={cn(pill({ selected }), "rounded-sm", className)}
      {...props}
    />
  );
}

/** Container for a row of pills. Hides its scrollbar, as the legacy does. */
export function PillRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex [scrollbar-width:none] gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
