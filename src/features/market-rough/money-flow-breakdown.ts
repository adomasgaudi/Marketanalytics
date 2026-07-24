/** Matches model-data MODEL — employer Sodra + opex share on labour. */
const EMPLOYER_SODRA = 1.0177;
const OPEX_OF_LABOUR = 0.43;

export type RevBreakdown = {
  employer: number;
  opex: number;
  profitTax: number;
};

/** Split revenue-minus-net-profit into payroll+1.77%, opex, and profit tax. */
export function revBreakdown(
  revRest: number,
  payroll: number | null | undefined,
): RevBreakdown | null {
  if (revRest <= 0 || payroll == null || payroll <= 0) return null;

  const employer = payroll * EMPLOYER_SODRA;
  const opex = employer * OPEX_OF_LABOUR;
  if (employer + opex >= revRest) {
    const scale = revRest / (employer + opex);
    return { employer: employer * scale, opex: opex * scale, profitTax: 0 };
  }
  return { employer, opex, profitTax: revRest - employer - opex };
}
