import { cn } from "@/lib/cn";

/** A panel of content. The dashboard's main container. */
export function Card({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("border-line bg-panel min-w-0 rounded-xl border p-[18px]", className)}
    >
      {title && <h2 className="mb-1 text-[15px] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

/** Fixed-height box a chart draws into. */
export function ChartBox({
  tall = false,
  children,
}: {
  tall?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative", tall ? "h-[520px]" : "h-[340px]")}>{children}</div>
  );
}

/** Auto-fitting grid of KPI tiles. */
export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
      {children}
    </div>
  );
}

/**
 * A single headline number. `mine` marks Fabula's own figures in gold — the
 * identity colour used for "my company" throughout the dashboard.
 */
export function Kpi({
  label,
  value,
  sub,
  mine = false,
}: {
  label: string;
  value: string;
  /** Line under the number: a change, a basis note, or a rank chip. */
  sub?: React.ReactNode;
  mine?: boolean;
}) {
  return (
    <article
      className={cn(
        "bg-panel rounded-lg border px-[13px] py-[11px]",
        mine ? "border-gold" : "border-line",
      )}
    >
      <div className="text-muted text-[11px] tracking-[0.05em] uppercase">{label}</div>
      <div className="mt-0.5 text-[21px] font-bold">{value}</div>
      {sub && <div className="text-muted mt-0.5 text-xs">{sub}</div>}
    </article>
  );
}
