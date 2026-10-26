/**
 * Transparent price estimation — pure arithmetic on recorded inputs.
 * No market claim, no invented comparables: every figure traces back to
 * what the artisan or coordinator entered, and the assumptions stay visible.
 */

export interface PriceEstimateInput {
  /** Recorded cost of materials per piece. */
  materialsCost: number;
  /** Hours of labour per piece. */
  labourHours: number;
  /** Recorded wage rate per hour. */
  labourRatePerHour: number;
  /** Overhead share as a percent, e.g. 10 for 10%. */
  overheadPercent: number;
  /** Margin as a percent, e.g. 30 for 30%. */
  marginPercent: number;
}

export interface PriceEstimate {
  materials: number;
  labour: number;
  overhead: number;
  subtotal: number;
  margin: number;
  suggested: number;
  /** Lowest honest price: cost recovered with no margin. */
  floor: number;
  valid: boolean;
  /** Names of the inputs that are missing or unusable, in the caller's terms. */
  missing: string[];
}

const round = (n: number) => Math.round(n);

export function estimatePrice(input: PriceEstimateInput): PriceEstimate {
  const materials = Math.max(0, Number(input.materialsCost) || 0);
  const hours = Number(input.labourHours) || 0;
  const rate = Number(input.labourRatePerHour) || 0;
  const overheadPercent = Number(input.overheadPercent) || 0;
  const marginPercent = Number(input.marginPercent) || 0;

  const missing: string[] = [];
  if (!(hours > 0)) missing.push("hours");
  if (!(rate > 0)) missing.push("rate");

  const labour = hours * rate;
  const overhead = (materials + labour) * (overheadPercent / 100);
  const subtotal = materials + labour + overhead;
  const margin = subtotal * (marginPercent / 100);
  // When a key input is missing no price is suggested at all — showing a
  // number built on unknown labour would be exactly the guesswork this
  // estimator exists to avoid.
  const suggestable = missing.length === 0;

  return {
    materials: round(materials),
    labour: round(labour),
    overhead: round(overhead),
    subtotal: round(subtotal),
    margin: round(margin),
    suggested: suggestable ? round(subtotal + margin) : 0,
    floor: suggestable ? round(subtotal) : 0,
    valid: suggestable,
    missing,
  };
}
