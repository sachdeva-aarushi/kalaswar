import {
  assessFeasibility,
  type CollectiveSnapshot,
  type CustomRequestSpec,
  type FeasibilityAssessment,
} from "./makepossible";
import type { QuotationSpec } from "./types";

/* ============================================================
   B2B Studio — deterministic rules over recorded data.

   Validation, brief→feasibility mapping, quotation totals and
   versioning rules. No invented data, no opaque scores; every
   decision here is explainable from the inputs.
   ============================================================ */

/** Required brief fields before a request can leave draft status. */
export const REQUIRED_BRIEF_FIELDS = [
  "title",
  "craft_category",
  "quantity",
  "deadline",
  "delivery_location",
] as const;

export interface BriefValidation {
  ok: boolean;
  missing: string[];
  invalid: string[];
}

export function validateBrief(brief: Record<string, unknown>): BriefValidation {
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const field of REQUIRED_BRIEF_FIELDS) {
    const value = brief[field];
    // Numbers are valid values (e.g. quantity); anything else must be a non-empty string.
    if (typeof value === "number") {
      if (!Number.isFinite(value)) missing.push(field);
    } else if (typeof value !== "string" || value.trim() === "") {
      missing.push(field);
    }
  }
  const qty = Number(brief["quantity"]);
  if (brief["quantity"] != null && String(brief["quantity"]).trim() !== "" && (!Number.isFinite(qty) || qty <= 0)) {
    invalid.push("quantity");
  }
  if (typeof brief["deadline"] === "string" && brief["deadline"].trim() !== "" && Number.isNaN(Date.parse(brief["deadline"]))) {
    invalid.push("deadline");
  }
  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}

const DAY_MS = 86_400_000;

/** Map a buyer brief onto the MakePossible request spec. Deadline days are
 *  computed from an injectable "today" so the engine stays deterministic. */
export function specForAssessment(brief: Record<string, unknown>, today: Date = new Date()): CustomRequestSpec {
  const craft = [brief["craft_category"], brief["product_references"]].filter(Boolean).join(" ");
  const deadlineMs =
    typeof brief["deadline"] === "string" && !Number.isNaN(Date.parse(brief["deadline"]))
      ? Date.parse(brief["deadline"])
      : null;
  const deadlineInDays =
    deadlineMs != null ? Math.max(1, Math.ceil((deadlineMs - today.getTime()) / DAY_MS)) : null;
  return {
    quantity: Number(brief["quantity"]) || 0,
    craft_preference: craft || null,
    materials: typeof brief["materials"] === "string" ? brief["materials"] : null,
    category: typeof brief["craft_category"] === "string" ? brief["craft_category"] : null,
    budget_inr_per_unit:
      brief["budget_per_unit"] != null && String(brief["budget_per_unit"]).trim() !== ""
        ? Number(brief["budget_per_unit"])
        : null,
    budget_inr_total:
      (brief["budget_per_unit"] == null || String(brief["budget_per_unit"]).trim() === "") &&
      brief["budget_total"] != null &&
      String(brief["budget_total"]).trim() !== ""
        ? Number(brief["budget_total"])
        : null,
    deadline_in_days: deadlineInDays,
  };
}

export function assessBuyerRequest(
  brief: Record<string, unknown>,
  snap: CollectiveSnapshot,
  today: Date = new Date(),
): FeasibilityAssessment {
  return assessFeasibility(specForAssessment(brief, today), snap);
}

/** Commercial fields whose change requires a new quotation version (and
 *  renewed buyer acceptance): price, quantity, specifications and dates. */
const VERSIONED_FIELDS = [
  "product_spec",
  "quantity",
  "unit_price_inr",
  "lead_time_days",
  "delivery_assumptions",
  "expiry_date",
] as const;

export function changedCommercialFields(prev: QuotationSpec, next: QuotationSpec): string[] {
  const changed: string[] = [];
  for (const field of VERSIONED_FIELDS) {
    const a = prev[field] ?? null;
    const b = next[field] ?? null;
    if (String(a ?? "") !== String(b ?? "")) changed.push(field);
  }
  return changed;
}

export interface QuoteTotals {
  goodsInr: number;
  feesInr: number;
  totalInr: number;
}

/** Totals in whole rupees from unit price × quantity plus a fee percentage.
 *  Returns null when unit price or quantity is missing — never a guess. */
export function quoteTotals(spec: QuotationSpec): QuoteTotals | null {
  const qty = Number(spec.quantity);
  const price = Number(spec.unit_price_inr);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) return null;
  const goodsInr = Math.round(price * qty);
  const feesPct = Number(spec.fees_pct);
  const feesInr = Number.isFinite(feesPct) && feesPct > 0 ? Math.round((goodsInr * feesPct) / 100) : 0;
  return { goodsInr, feesInr, totalInr: goodsInr + feesInr };
}

/** Reorder prefill: a reorder reuses the specification as a *starting point*,
 *  never confirmed state. Confirmed-order and decision fields are stripped so
 *  the new request must be revalidated end-to-end. */
export function prefillBriefForReorder(brief: Record<string, unknown>): Record<string, unknown> {
  const next = { ...brief };
  for (const key of ["confirmed_order_id", "decline_reason", "clarification_note", "reorder_of"]) {
    delete next[key];
  }
  next["reorder"] = true;
  return next;
}
