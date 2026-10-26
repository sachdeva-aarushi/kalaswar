/**
 * FairPrice Engine — transparent, deterministic product costing.
 *
 * Rules this engine never breaks:
 * - Labour is never silently free: a stage with hours but no recorded rate makes
 *   the estimate incomplete — no price is suggested on unknown labour.
 * - Margin and markup are different metrics and are never confused.
 * - A percentage platform fee is taken on the final selling price, so it enters
 *   the price formula rather than being treated as a fixed cost.
 * - Every figure traces back to recorded inputs; missing inputs are reported,
 *   never invented. The engine claims no knowledge of market prices.
 *
 * All arithmetic runs in integer paise to avoid binary floating-point drift.
 */

export interface MaterialLine {
  name: string;
  quantityPerUnit: number;
  unit?: string | undefined;
  unitCostInr: number;
  /** Justified wastage, e.g. 10 for 10%. Defaults to 0. */
  wastagePercent?: number | undefined;
}

export interface LabourStage {
  name: string;
  hoursPerUnit: number;
  /** Rate per hour; null/undefined means the rate has not been recorded. */
  rateInrPerHour?: number | null | undefined;
  rateSource?: string | undefined;
}

export interface FairPriceInput {
  materials: MaterialLine[];
  labourStages: LabourStage[];
  packagingPerUnitInr?: number | undefined;
  /** Production overhead as a percent of materials + labour, e.g. 10 for 10%. */
  overheadPercent?: number | undefined;
  otherPerUnitInr?: number | undefined;
  /** Logistics per unit when the seller's pricing terms include delivery. */
  logisticsPerUnitInr?: number | undefined;
  /** Platform fee as a percent of the final selling price, e.g. 5 for 5%. */
  platformFeePercent?: number | undefined;
  /** Target gross margin on the final-price base, e.g. 30 for 30%. */
  targetMarginPercent?: number | undefined;
  /** Or a markup on production cost — supply one, not both. */
  markupPercent?: number | undefined;
}

export interface CostLine {
  name: string;
  amount: number;
  rateMissing?: boolean | undefined;
}

export interface FairPriceResult {
  /** A price can be suggested: every needed input exists. */
  valid: boolean;
  /** Some recorded cost is unknown (e.g. a labour rate) — nothing is suggested. */
  incomplete: boolean;
  /** Inputs absent entirely, in plain names. */
  missing: string[];
  /** Inputs present but questionable. */
  warnings: string[];
  materialCost: number;
  materialLines: CostLine[];
  labourCost: number;
  labourLines: CostLine[];
  packaging: number;
  overhead: number;
  other: number;
  logistics: number;
  /** Materials + labour + packaging + overhead + other + logistics; null when unknown labour blocks a total. */
  productionCost: number | null;
  priceMode: "margin" | "markup" | "none";
  /** Final selling price including the fee-aware base, when valid. */
  suggested: number | null;
  /** Price that recovers recorded costs with no return, when computable. */
  floor: number | null;
  /** Platform-fee amount at the suggested price, when a fee percent applies. */
  platformFee: number | null;
  /** Suggested price minus production cost minus fee, when computable. */
  estimatedEarningsPerUnit: number | null;
  currency: "INR";
}

const toPaise = (n: number): number => Math.round(n * 100);
const fromPaise = (p: number): number => p / 100;

function lineAmount(line: MaterialLine): number {
  const qty = Math.max(0, Number(line.quantityPerUnit) || 0);
  const cost = Math.max(0, Number(line.unitCostInr) || 0);
  const wastage = Math.max(0, Number(line.wastagePercent) || 0);
  return toPaise(qty * cost * (1 + wastage / 100));
}

export function computeFairPrice(input: FairPriceInput): FairPriceResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // --- Materials ---
  const materialLines: CostLine[] = (input.materials ?? [])
    .filter((l) => l && (l.name || l.quantityPerUnit || l.unitCostInr))
    .map((l) => ({ name: l.name || "Material", amount: fromPaise(lineAmount(l)) }));
  const materialPaise = (input.materials ?? []).reduce((sum, l) => sum + lineAmount(l), 0);
  if (materialPaise === 0) warnings.push("No material cost recorded.");

  // --- Labour ---
  const stages = input.labourStages ?? [];
  let labourIncomplete = false;
  let labourMissing = false;
  let labourKnownPaise = 0;
  const labourLines: CostLine[] = stages.map((s) => {
    const hours = Math.max(0, Number(s.hoursPerUnit) || 0);
    const rateKnown = s.rateInrPerHour != null && Number(s.rateInrPerHour) > 0;
    if (hours > 0 && !rateKnown) {
      labourIncomplete = true;
      return { name: s.name || "Labour", amount: 0, rateMissing: true };
    }
    const amount = rateKnown ? hours * Number(s.rateInrPerHour) : 0;
    labourKnownPaise += toPaise(amount);
    if (hours === 0) warnings.push(`No hours recorded for "${s.name || "Labour"}".`);
    return { name: s.name || "Labour", amount: fromPaise(toPaise(amount)) };
  });
  if (stages.length === 0) {
    labourMissing = true;
    missing.push("Labour hours — no production stages recorded");
  } else {
    const totalHours = stages.reduce((s, st) => s + (Math.max(0, Number(st.hoursPerUnit) || 0)), 0);
    if (totalHours === 0) {
      labourMissing = true;
      missing.push("Labour hours — every stage has zero hours");
    } else if (labourIncomplete) missing.push("Labour rate for at least one recorded stage");
  }

  const packaging = Math.max(0, Number(input.packagingPerUnitInr) || 0);
  const other = Math.max(0, Number(input.otherPerUnitInr) || 0);
  const logistics = Math.max(0, Number(input.logisticsPerUnitInr) || 0);
  const overheadPercent = Math.max(0, Number(input.overheadPercent) || 0);
  const overheadPaise = Math.round((materialPaise + labourKnownPaise) * (overheadPercent / 100));

  const productionCost: number | null = labourIncomplete
    ? null
    : fromPaise(materialPaise + labourKnownPaise + toPaise(packaging) + overheadPaise + toPaise(other) + toPaise(logistics));

  // --- Price modes ---
  const marginPercent = Number(input.targetMarginPercent ?? 0) || 0;
  const markupPercent = Number(input.markupPercent ?? 0) || 0;
  const feePercent = Math.max(0, Number(input.platformFeePercent) || 0);
  let priceMode: FairPriceResult["priceMode"] = "none";
  if (marginPercent > 0) priceMode = "margin";
  else if (markupPercent > 0) priceMode = "markup";
  if (marginPercent > 0 && markupPercent > 0) {
    warnings.push("Both a target margin and a markup were supplied — the margin was used. They are different metrics.");
  }

  let valid = !labourIncomplete && !labourMissing && productionCost != null && productionCost > 0;
  let suggested: number | null = null;
  let floor: number | null = null;
  let platformFee: number | null = null;
  let earnings: number | null = null;

  if (productionCost != null && productionCost > 0) {
    const feeRate = feePercent / 100;
    // Cost recovery with no return, fee-aware.
    floor = feeRate < 1 ? fromPaise(Math.round(toPaise(productionCost) / (1 - feeRate))) : productionCost;

    if (priceMode === "margin") {
      if (marginPercent >= 100) {
        valid = false;
        warnings.push("A target margin of 100% or more is not a usable price basis.");
      } else if (marginPercent / 100 + feeRate >= 1) {
        valid = false;
        warnings.push("Margin plus platform fee exceeds 100% — no price can satisfy both.");
      } else {
        suggested = fromPaise(Math.round(toPaise(productionCost) / (1 - marginPercent / 100 - feeRate)));
      }
    } else if (priceMode === "markup") {
      if (markupPercent < 0) {
        valid = false;
        warnings.push("A negative markup is not a usable price basis.");
      } else {
        const markedUp = toPaise(productionCost) + Math.round(toPaise(productionCost) * (markupPercent / 100));
        suggested = feeRate < 1 ? fromPaise(Math.round(markedUp / (1 - feeRate))) : fromPaise(markedUp);
      }
    }
  }

  if (suggested != null) {
    platformFee = fromPaise(Math.round(toPaise(suggested) * (feePercent / 100)));
    earnings =
      productionCost != null
        ? fromPaise(toPaise(suggested) - toPaise(productionCost) - toPaise(platformFee ?? 0))
        : null;
  }

  return {
    valid,
    incomplete: labourIncomplete,
    missing,
    warnings,
    materialCost: fromPaise(materialPaise),
    materialLines,
    labourCost: labourIncomplete ? fromPaise(labourKnownPaise) : fromPaise(labourKnownPaise),
    labourLines,
    packaging,
    overhead: fromPaise(overheadPaise),
    other,
    logistics,
    productionCost,
    priceMode,
    suggested,
    floor,
    platformFee,
    estimatedEarningsPerUnit: earnings,
    currency: "INR",
  };
}

/**
 * Recompute a costing against current inputs and compare with an approved
 * snapshot. Returns which figures changed — never mutates the snapshot.
 */
export function diffAgainstSnapshot(
  snapshot: { productionCost: number | null; suggested: number | null },
  current: { productionCost: number | null; suggested: number | null },
): { productionCostChanged: boolean; suggestedChanged: boolean } {
  const same = (a: number | null, b: number | null) => a == null && b == null || (a != null && b != null && toPaise(a) === toPaise(b));
  return {
    productionCostChanged: !same(snapshot.productionCost, current.productionCost),
    suggestedChanged: !same(snapshot.suggested, current.suggested),
  };
}
