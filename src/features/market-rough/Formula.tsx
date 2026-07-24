"use client";

import {
  Fragment,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * Formula rendering for the Dev-mode KPI folds.
 *
 * MathML rather than a LaTeX package: real stacked fractions with no
 * dependency, no font files to inline for the static export, and nothing for
 * the CSP to block. The primitives below keep call sites declarative so a
 * formula reads roughly like its LaTeX equivalent.
 */

/** One symbol in a formula, tied back to the field it came from. */
export type FormulaVar = {
  /** 2-3 char symbol used in the math, e.g. "HC". Omitted for source-only folds. */
  code?: string;
  /** Plain-language meaning, e.g. "headcount". */
  label: string;
  /** Raw key in data/data.json, when the value maps to one. */
  field?: string;
  /** The symbol's actual value for the figure on screen, pre-formatted. */
  value?: string;
  /** data2/… path (or data/data.json · field for legacy). */
  path?: string;
  /** Where it was scraped from. */
  source?: string;
};

export type Formula = {
  /** Short heading, e.g. "Per-employee basis". */
  name: string;
  /** Omitted for filed figures — panel shows value + path + source only. */
  math?: ReactNode;
  vars: FormulaVar[];
};

/* --- MathML primitives ------------------------------------------------- */

/** Variable, optionally subscripted: `<V c="HC" sub="t" />` → HCₜ */
export function V({ c, sub }: { c: string; sub?: string }) {
  const base = <mi>{c}</mi>;
  return sub ? (
    <msub>
      {base}
      <mi>{sub}</mi>
    </msub>
  ) : (
    base
  );
}

export function N({ v }: { v: number | string }) {
  return <mn>{v}</mn>;
}

export function Op({ o }: { o: string }) {
  return <mo>{o}</mo>;
}

/** Stacked fraction. */
export function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <mfrac>
      <mrow>{num}</mrow>
      <mrow>{den}</mrow>
    </mfrac>
  );
}

/** Root wrapper — every formula's math goes through this. */
export function Math_({ children }: { children: ReactNode }) {
  return (
    <math display="block" className="text-ink text-[15px]">
      <mrow>{children}</mrow>
    </math>
  );
}

/* --- Shared builders ---------------------------------------------------- */

// Where each figure comes from — the single (data2) dataset. Kept here so the
// ƒ popover can name the file and scrape source behind a headline number.
const PROVENANCE: Partial<Record<string, { path: string; source: string }>> = {
  revenue: {
    path: "data2/rc_bulk.json · turnover",
    source: "Registrų centras — registrucentras.lt/aduomenys",
  },
  profit: {
    path: "data2/rc_bulk.json · profit",
    source: "Registrų centras — registrucentras.lt/aduomenys",
  },
  employees: {
    path: "data2/sodra_months.json · avgHeadcount",
    source: "Sodra — sodra.lt",
  },
  avgSalary: {
    path: "data2/sodra_months.json · avgWage",
    source: "Sodra — sodra.lt",
  },
  salaryCosts: {
    path: "data2/sodra_months.json · wageBill",
    source: "Sodra — sodra.lt",
  },
};

/** Filed figure with no derivation — value, file path, scrape source. */
export function sourceFormula(
  name: string,
  field: string,
  value: string | undefined,
): Formula {
  const p = PROVENANCE[field];
  return {
    name,
    vars: [
      {
        label: name.toLowerCase(),
        value,
        field,
        path: p?.path,
        source: p?.source,
      },
    ],
  };
}

/** How a money figure is scaled before display: raw, or divided by a count. */
export type MoneyBasis = {
  /** True when the figure is a sum across companies (market views). */
  sum?: boolean;
  /** Divisor applied after summing, e.g. {code:"CO", label:"companies (113)"}. */
  div?: { code: string; label: string; value?: string } | null;
  /** Displayed figure per row, already formatted — the left side of each
      equation, so the fold can be checked against the card. */
  values?: Partial<Record<"T" | "R" | "P", string>>;
  /** Which companies were summed. Without it the fold explained how ONE
      company's figure is built while the card showed a market aggregate, and
      said the same thing whichever segment or basis was selected. */
  scope?: { label: string; companies: string };
};

/**
 * The aggregation step: which rows were summed, and what the sum was divided
 * by. Prepended to a market figure's fold so the explanation matches the
 * controls — change the segment or the basis and this line changes with it.
 */
function marketFormula(
  code: string,
  metric: string,
  { div, scope, values }: MoneyBasis,
  shown?: string,
): Formula {
  return {
    name: div ? `${metric} — summed, then divided` : `${metric} — summed`,
    math: (
      <>
        <V c={code} />
        <Op o="=" />
        <V c="Σ" />
        {div && (
          <>
            <Op o="÷" />
            <V c={div.code} />
          </>
        )}
      </>
    ),
    vars: [
      { code, label: `${metric.toLowerCase()} shown`, value: shown ?? values?.T },
      {
        code: "Σ",
        label: `${metric.toLowerCase()} of every company in ${scope?.label ?? "the market"}`,
        value: scope?.companies ? `${scope.companies} companies` : undefined,
      },
      ...(div ? [{ code: div.code, label: div.label, value: div.value }] : []),
    ],
  };
}

/**
 * The three money-flow figures. Turnover and net profit are filed — source only.
 * Revenue is derived, so it keeps the build formula.
 */
export function moneyFormulas(
  basis: MoneyBasis = {},
): Record<"T" | "R" | "P", Formula[]> {
  // Market cards aggregate; a company card does not. Only the former needs the
  // extra step, and it must be FIRST — it is what the figure on the card is.
  const agg = (code: "T" | "R" | "P", metric: string): Formula[] =>
    basis.sum ? [marketFormula(code, metric, basis, basis.values?.[code])] : [];
  return {
    T: [...agg("T", "Turnover"), sourceFormula("Turnover", "revenue", basis.values?.T)],
    R: [
      ...agg("R", "Revenue"),
      {
        name: "…how the figure is built",
        math: (
          <>
            <V c="ei" />
            <Op o="=" />
            <V c="pay" />
            <Op o="×" />
            <V c="sod" />
            <Op o="×" />
            <V c="opx" />
            <Op o="+" />
            <V c="pre" />
          </>
        ),
        vars: [
          {
            code: "pay",
            label: "payroll — Sodra's monthly wage × headcount, summed over the year",
            field: "salaryCosts",
            path: PROVENANCE.salaryCosts?.path,
            source: PROVENANCE.salaryCosts?.source,
          },
          { code: "sod", label: "1,0177 — the employer's own Sodra contribution" },
          {
            code: "opx",
            label: "1,43 — own opex at 43% of labour. The only assumption here",
          },
          {
            code: "pre",
            label: "profit before tax, as filed with Registrų centras",
            field: "profit",
            path: PROVENANCE.profit?.path,
            source: PROVENANCE.profit?.source,
          },
        ],
      },
    ],
    P: [
      ...agg("P", "Net profit"),
      sourceFormula("Net profit", "profit", basis.values?.P),
    ],
  };
}

/* --- Popover ----------------------------------------------------------- */

/**
 * The `ƒ` trigger and its floating panel. Opens on hover, latches on click so
 * the panel can be read without holding the pointer still, closes on Escape or
 * an outside click. Hidden outside Dev mode by the `.kpi-f` CSS hook.
 */
export function FormulaPopover({ formulas }: { formulas: Formula[] }) {
  const [open, setOpen] = useState(false);
  const [latched, setLatched] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setLatched(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setLatched(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="kpi-f relative mt-[7px] inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !latched && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label="Show formula"
        onClick={() => {
          setLatched((l) => !l);
          setOpen(true);
        }}
        className="border-line text-muted hover:text-ink hover:border-accent flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded border text-[11px] font-bold italic transition-colors"
      >
        ƒ
      </button>
      {open && <FormulaPanel formulas={formulas} />}
    </span>
  );
}

const EDGE = 8; // viewport breathing room

function FormulaPanel({ formulas }: { formulas: Formula[] }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  const [below, setBelow] = useState(false);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = rect.left - shift;
    const right = rect.right - shift;
    let next = 0;
    if (right > window.innerWidth - EDGE) next = window.innerWidth - EDGE - right;
    if (left + next < EDGE) next = EDGE - left;
    setShift(next);
    setBelow(rect.height + 6 > rect.bottom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formulas]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      style={{ transform: `translateX(${shift}px)` }}
      className={`border-line bg-panel absolute left-0 z-[210] w-[min(280px,calc(100vw-16px))] rounded-[6px] border p-3 text-left shadow-[0_4px_16px_rgba(0,0,0,.22)] ${
        below ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"
      }`}
    >
      {formulas.map((f, i) => (
        <div key={f.name} className={i ? "border-line mt-3 border-t pt-3" : ""}>
          <div className="text-muted mb-1 text-[10px] font-semibold tracking-wide uppercase">
            {f.name}
          </div>
          {f.math ? <Math_>{f.math}</Math_> : null}
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[10.5px]">
            {f.vars.map((v, j) =>
              !f.math && v.path ? (
                <dd key={j} className="text-muted col-span-2 leading-snug">
                  {v.value != null && (
                    <span className="text-ink font-semibold tabular-nums">{v.value}</span>
                  )}
                  {v.value != null && (v.path || v.source) && " — "}
                  {v.path && (
                    <code className="bg-panel2 text-muted rounded px-1 py-px text-[9.5px]">
                      {v.path}
                    </code>
                  )}
                  {v.source && (
                    <span className={v.path ? "mt-0.5 block" : ""}>{v.source}</span>
                  )}
                </dd>
              ) : (
                <Fragment key={v.code ?? j}>
                  {v.code ? (
                    <dt className="text-ink font-semibold italic">{v.code}</dt>
                  ) : null}
                  <dd className={v.code ? "text-muted" : "text-muted col-span-2"}>
                    {v.value != null && (
                      <span className="text-ink font-semibold tabular-nums">
                        {v.value}
                      </span>
                    )}
                    <span className={v.value != null ? "block" : ""}>
                      {v.label}
                      {v.path && (
                        <code className="bg-panel2 text-muted ml-1 rounded px-1 py-px text-[9.5px]">
                          {v.path}
                        </code>
                      )}
                      {v.source && !v.path && (
                        <span className="text-muted block text-[9.5px]">{v.source}</span>
                      )}
                      {v.field && !v.path && (
                        <code className="bg-panel2 text-muted ml-1 rounded px-1 py-px text-[9.5px]">
                          {v.field}
                        </code>
                      )}
                    </span>
                  </dd>
                </Fragment>
              ),
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}
