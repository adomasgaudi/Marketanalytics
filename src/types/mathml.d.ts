/**
 * MathML intrinsics for JSX.
 *
 * The installed @types/react doesn't declare MathML elements, but React renders
 * them correctly at runtime (they go through the same createElement path as any
 * unknown host tag, in the MathML namespace). Only the subset the formula
 * primitives in features/market-rough/Formula.tsx actually use is declared —
 * add tags here as new notation is needed.
 */
import type { HTMLAttributes } from "react";

type MathMLProps = HTMLAttributes<Element> & {
  display?: "block" | "inline";
  largeop?: "true" | "false";
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      math: MathMLProps;
      mrow: MathMLProps;
      mi: MathMLProps;
      mn: MathMLProps;
      mo: MathMLProps;
      mfrac: MathMLProps;
      msub: MathMLProps;
    }
  }
}
