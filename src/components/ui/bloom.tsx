import { cn } from "@/lib/cn";

type Props = {
  /** Any theme colour token name: accent, green, purple, gold, amber. */
  color?: string;
  /** Placement + size, e.g. "-top-24 -left-[20vw] h-[380px] w-[80vw]". */
  className?: string;
  /** 0-100. Kept low on purpose — these should read as light, not as shapes. */
  opacity?: number;
  blur?: number;
};

/**
 * A barely-there colour bloom for section backdrops. Absolutely positioned and
 * behind everything (-z-10), so the parent needs `relative isolate`.
 */
export function Bloom({ color = "accent", className, opacity = 14, blur = 70 }: Props) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute -z-10", className)}
      style={{
        opacity: opacity / 100,
        filter: `blur(${blur}px)`,
        background: `radial-gradient(60% 60% at 30% 40%, var(--color-${color}), transparent 70%)`,
      }}
    />
  );
}
