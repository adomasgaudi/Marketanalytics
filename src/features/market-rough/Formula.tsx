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
  /** 2-3 char symbol used in the math, e.g. "HC". */
  code: string;
  /** Plain-language meaning, e.g. "headcount". */
  label: string;
  /** Raw key in data/data.json, when the value maps to one. Omitted for
      derived quantities (counts, medians) that exist only in the model. */
  field?: string;
  /** The symbol's actual value for the figure on screen, pre-formatted by the
      call site (it owns the right units). Turns the fold from a definition
      into a worked example you can check against the card. */
  value?: string;
};

export type Formula = {
  /** Short heading, e.g. "Per-employee basis". */
  name: string;
  math: ReactNode;
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

/** Every KPI shares the same YoY definition; only the symbol changes.
 *  `vals` supplies the two figures being divided, already formatted. */
export function yoy(
  code: string,
  label: string,
  field?: string,
  vals?: { cur?: string; prev?: string },
): Formula {
  return {
    name: "Year-over-year change",
    math: (
      <>
        <Frac
          num={<V c={code} sub="t" />}
          den={
            <>
              <V c={code} sub="t−1" />
            </>
          }
        />
        <Op o="−" />
        <N v={1} />
      </>
    ),
    vars: [
      { code: `${code}ₜ`, label: `${label}, selected year`, field, value: vals?.cur },
      { code: `${code}ₜ₋₁`, label: `${label}, prior year`, field, value: vals?.prev },
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
};

/** Body of a money formula: optional ∑ over filings, optional ÷ divisor. */
function moneyBody(code: string, src: string, { sum, div }: MoneyBasis) {
  const core = sum ? (
    <>
      <mo largeop="true">∑</mo>
      <V c={src} sub="i" />
    </>
  ) : (
    <V c={src} />
  );
  return (
    <>
      <V c={code} />
      <Op o="=" />
      {div ? <Frac num={<>{core}</>} den={<V c={div.code} />} /> : core}
    </>
  );
}

function moneyVars(
  code: string,
  codeLabel: string,
  src: string,
  srcLabel: string,
  field: string,
  { sum, div, values }: MoneyBasis,
  key: "T" | "R" | "P",
): FormulaVar[] {
  return [
    { code, label: codeLabel, value: values?.[key] },
    { code: sum ? `${src}ᵢ` : src, label: srcLabel, field },
    ...(div ? [{ code: div.code, label: div.label, value: div.value }] : []),
  ];
}

/**
 * The three money-flow figures. Turnover is what the filing reports as sales;
 * Revenue is the agency's own income out of that (a fee estimate for the latest
 * year); Net profit is the bottom line. Same basis applies to all three.
 */
export function moneyFormulas(
  basis: MoneyBasis = {},
): Record<"T" | "R" | "P", Formula[]> {
  return {
    T: [
      {
        name: "Turnover",
        // Symbol is `sales`, not `rev`: data.json's `revenue` field is the
        // filed sales figure we show as Turnover, while the card labelled
        // "Revenue" is the agency's own income. Sharing the letters made the
        // fold read as "Turnover = Revenue".
        math: moneyBody("T", "sales", basis),
        vars: moneyVars(
          "T",
          "turnover shown",
          "sales",
          "filed sales revenue (Pardavimo pajamos)",
          "revenue",
          basis,
          "T",
        ),
      },
    ],
    R: [
      {
        name: "Revenue (agency income)",
        math: moneyBody("R", "ei", basis),
        vars: moneyVars(
          "R",
          "revenue shown",
          "ei",
          "agency income out of turnover (spėjamos pajamos)",
          "estimatedIncome",
          basis,
          "R",
        ),
      },
      {
        name: "…when the year isn't filed yet",
        math: (
          <>
            <V c="ei" />
            <Op o="=" />
            <V c="sales" />
            <Op o="×" />
            <V c="f" />
          </>
        ),
        vars: [
          { code: "sales", label: "filed sales revenue (turnover)", field: "revenue" },
          {
            code: "f",
            label: "fee ratio — mean of ei ÷ sales over the brand's last ≤3 filed years",
          },
        ],
      },
    ],
    P: [
      {
        name: "Net profit",
        math: moneyBody("P", "pr", basis),
        vars: moneyVars(
          "P",
          "net profit shown",
          "pr",
          "filed profit after tax",
          "profit",
          basis,
          "P",
        ),
      },
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
  // Nudge applied after measuring; the panel is anchored to its trigger, which
  // can sit anywhere across the page width.
  const [shift, setShift] = useState(0);
  const [below, setBelow] = useState(false);

  // useLayoutEffect, not useEffect: measure and correct before paint so the
  // panel never flashes off-screen on first open.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    // Measure unshifted, else each open compounds the previous correction.
    const rect = el.getBoundingClientRect();
    const left = rect.left - shift;
    const right = rect.right - shift;
    let next = 0;
    if (right > window.innerWidth - EDGE) next = window.innerWidth - EDGE - right;
    if (left + next < EDGE) next = EDGE - left;
    setShift(next);
    // Flip under the trigger when the panel would clip the top of the viewport.
    setBelow(rect.height + 6 > rect.bottom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formulas]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      style={{ transform: `translateX(${shift}px)` }}
      // Width is capped to the viewport on narrow screens; the measured shift
      // keeps it inside the edges on wide ones.
      className={`border-line bg-panel absolute left-0 z-[210] w-[min(280px,calc(100vw-16px))] rounded-[6px] border p-3 text-left shadow-[0_4px_16px_rgba(0,0,0,.22)] ${
        below ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"
      }`}
    >
      {formulas.map((f, i) => (
        <div key={f.name} className={i ? "border-line mt-3 border-t pt-3" : ""}>
          <div className="text-muted mb-1 text-[10px] font-semibold tracking-wide uppercase">
            {f.name}
          </div>
          <Math_>{f.math}</Math_>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[10.5px]">
            {f.vars.map((v) => (
              <Fragment key={v.code}>
                <dt className="text-ink font-semibold italic">{v.code}</dt>
                <dd className="text-muted">
                  {/* Value first and in ink: the reader is checking the number
                      on the card, and only then how it was defined. */}
                  {v.value != null && (
                    <span className="text-ink font-semibold tabular-nums">{v.value}</span>
                  )}
                  <span className={v.value != null ? "block" : ""}>
                    {v.label}
                    {/* The raw key, so a Dev-mode reader can find the number in
                        data.json rather than trusting the label. */}
                    {v.field && (
                      <code className="bg-panel2 text-muted ml-1 rounded px-1 py-px text-[9.5px]">
                        data.json · {v.field}
                      </code>
                    )}
                  </span>
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
