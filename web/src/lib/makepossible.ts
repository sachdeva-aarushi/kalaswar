import type { Shg } from "./types";

/* ============================================================
   MakePossible — rule-based custom-request feasibility engine.

   Deterministic application logic over RECORDED collective data
   (skills, materials inventory, capacity, workload, comparable
   prices). Never invents data: anything not recorded is reported
   as missing, and "insufficient_information" is a first-class
   result. The final feasibility decision always stays with the
   SHG coordinator; this engine only prepares the evidence.
   ============================================================ */

export type FeasibilityStatus =
  | "potentially_feasible"
  | "feasible_with_changes"
  | "not_currently_feasible"
  | "insufficient_information";

export const FEASIBILITY_STATUSES: FeasibilityStatus[] = [
  "potentially_feasible",
  "feasible_with_changes",
  "not_currently_feasible",
  "insufficient_information",
];

export interface CustomRequestSpec {
  quantity: number;
  craft_preference?: string | null;
  materials?: string | null;
  category?: string | null;
  budget_inr_per_unit?: number | null;
  budget_inr_total?: number | null;
  deadline_in_days?: number | null;
}

export interface SkillRecord {
  skill: string;
  level: string;
  notes?: string | null;
}

export interface MaterialRecord {
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number | null;
  updated_at: string;
}

export interface CollectiveSnapshot {
  shg: Pick<Shg, "id" | "name" | "monthly_capacity">;
  skills: SkillRecord[];
  materials: MaterialRecord[];
  /** Units currently in active production (pending + in production orders). */
  activeWorkloadUnits: number;
  /** Recorded product prices for a comparable category, for budget context. */
  comparablePrices: { min: number; avg: number; max: number; count: number };
}

export interface FeasibilityAssessment {
  status: FeasibilityStatus;
  reasons: string[];
  /** Informational observations that do not change the decision on their own. */
  notes: string[];
  missing: string[];
  suggestedChanges: string[];
  dataUsed: {
    matchedSkills: string[];
    matchedMaterials: string[];
    monthlyCapacity: number | null;
    activeWorkloadUnits: number;
    comparablePriceCount: number;
    estimatedProductionDays: number | null;
  };
}

/** Words too generic to evidence a craft match on their own (e.g. "weaving" appears in many skills). */
const GENERIC_WORDS = new Set([
  "weaving", "weave", "craft", "crafts", "making", "handmade", "handcrafted",
  "bag", "bags", "item", "items", "product", "products", "piece", "pieces",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !GENERIC_WORDS.has(t));
}

function overlapMatches(source: string, target: string): boolean {
  const a = tokens(source);
  const b = tokens(target);
  return a.some((t) => b.includes(t));
}

/** Deterministic production-time estimate from recorded capacity. */
export function estimateProductionDays(quantity: number, monthlyCapacity: number | null): number | null {
  if (monthlyCapacity == null || monthlyCapacity <= 0) return null;
  const piecesPerDay = monthlyCapacity / 30;
  return Math.ceil(quantity / piecesPerDay) + 4; // +4 days preparation/dispatch buffer
}

export function assessFeasibility(spec: CustomRequestSpec, snap: CollectiveSnapshot): FeasibilityAssessment {
  const reasons: string[] = [];
  const notes: string[] = [];
  const missing: string[] = [];
  const suggestedChanges: string[] = [];
  const matchedSkills: string[] = [];
  const matchedMaterials: string[] = [];

  /* ---- Skill fit ---- */
  const craftWish = spec.craft_preference ?? spec.category ?? "";
  if (snap.skills.length === 0) {
    missing.push(`No skills are recorded for ${snap.shg.name}.`);
  } else if (craftWish) {
    const matches = snap.skills.filter((s) => overlapMatches(craftWish, s.skill));
    if (matches.length === 0) {
      reasons.push(
        `No recorded skill at ${snap.shg.name} matches "${craftWish}" (recorded: ${snap.skills
          .map((s) => s.skill)
          .join(", ")}).`,
      );
    } else {
      matchedSkills.push(...matches.map((m) => m.skill));
    }
  } else {
    missing.push("The request does not state a craft or product type, so skill fit cannot be checked.");
  }

  /* ---- Materials ---- */
  if (snap.materials.length === 0) {
    missing.push(`${snap.shg.name} has no materials inventory recorded.`);
  } else if (spec.materials) {
    const matches = snap.materials.filter((m) => overlapMatches(spec.materials!, m.name));
    if (matches.length > 0) {
      matchedMaterials.push(...matches.map((m) => m.name));
      for (const m of matches) {
        if (m.low_stock_threshold != null && m.quantity <= m.low_stock_threshold) {
          reasons.push(
            `${m.name} is at ${m.quantity} ${m.unit}, at or below the low-stock threshold — stock needs confirmation before committing.`,
          );
        }
      }
    } else {
      missing.push(
        `No recorded material matches "${spec.materials}" — the coordinator must confirm material availability.`,
      );
    }
  }

  /* ---- Capacity vs quantity and current workload ---- */
  const estimatedDays = estimateProductionDays(spec.quantity, snap.shg.monthly_capacity);
  if (snap.shg.monthly_capacity == null) {
    missing.push(`${snap.shg.name} has not recorded a monthly production capacity.`);
  } else {
    const remaining = snap.shg.monthly_capacity - snap.activeWorkloadUnits;
    if (spec.quantity > snap.shg.monthly_capacity) {
      suggestedChanges.push(
        `Quantity ${spec.quantity} exceeds the recorded monthly capacity of ${snap.shg.monthly_capacity} pieces.`,
      );
      reasons.push(
        `Quantity exceeds the recorded monthly capacity (${spec.quantity} requested vs ${snap.shg.monthly_capacity} recorded).`,
      );
    } else if (spec.quantity > remaining) {
      suggestedChanges.push(
        `Active work already covers ${snap.activeWorkloadUnits} of ${snap.shg.monthly_capacity} monthly pieces; consider reducing the quantity or extending the deadline.`,
      );
      reasons.push(
        `Current active workload (${snap.activeWorkloadUnits} pieces) leaves only ${Math.max(remaining, 0)} pieces of headroom this month.`,
      );
    }
  }

  /* ---- Budget vs recorded comparable prices ---- */
  if (snap.comparablePrices.count === 0) {
    missing.push("No comparable recorded product prices exist to sanity-check the budget.");
  } else if (spec.budget_inr_per_unit != null) {
    const { min, avg, max, count } = snap.comparablePrices;
    if (spec.budget_inr_per_unit < min) {
      suggestedChanges.push(
        `Budget of ₹${spec.budget_inr_per_unit} per piece is below the lowest comparable recorded price (₹${min}); the coordinator may propose a higher price or simpler materials.`,
      );
      reasons.push(
        `Budget per piece (₹${spec.budget_inr_per_unit}) is below all ${count} comparable recorded prices (₹${min}–₹${max}).`,
      );
    } else if (spec.budget_inr_per_unit < avg) {
      notes.push(
        `Budget per piece (₹${spec.budget_inr_per_unit}) is below the average comparable price (₹${Math.round(avg)}) but within the recorded range — worth confirming with the coordinator.`,
      );
    }
  } else if (spec.budget_inr_total != null) {
    missing.push("The request states a total budget but not a per-piece budget; per-unit pricing is needed.");
  } else {
    missing.push("No budget recorded, so price fit cannot be checked.");
  }

  /* ---- Deadline vs estimated production time ---- */
  if (estimatedDays == null) {
    // capacity missing already reported
  } else if (spec.deadline_in_days != null) {
    if (estimatedDays > spec.deadline_in_days * 1.5) {
      reasons.push(
        `Estimated production time (${estimatedDays} days) far exceeds the ${spec.deadline_in_days}-day deadline.`,
      );
      suggestedChanges.push(`Reduce the quantity or extend the deadline below ${estimatedDays} days of production time.`);
    } else if (estimatedDays > spec.deadline_in_days) {
      reasons.push(
        `Estimated production time (${estimatedDays} days) exceeds the ${spec.deadline_in_days}-day deadline; possible with a priority schedule but the coordinator must confirm.`,
      );
      suggestedChanges.push("Extend the deadline, or reduce quantity so production fits the dates.");
    }
  } else {
    missing.push("No deadline recorded, so timeline fit cannot be checked.");
  }

  /* ---- Aggregate the decision ---- */
  const hardSkillFail = craftWish !== "" && snap.skills.length > 0 && matchedSkills.length === 0;
  const hardCapacityFail =
    snap.shg.monthly_capacity != null && spec.quantity > snap.shg.monthly_capacity * 1.5;

  let status: FeasibilityStatus;
  if (hardSkillFail || hardCapacityFail) {
    status = "not_currently_feasible";
  } else if (missing.length > 0) {
    status = "insufficient_information";
  } else if (reasons.length > 0 || suggestedChanges.length > 0) {
    status = "feasible_with_changes";
  } else {
    status = "potentially_feasible";
  }

  return {
    status,
    reasons,
    notes,
    missing,
    suggestedChanges,
    dataUsed: {
      matchedSkills,
      matchedMaterials,
      monthlyCapacity: snap.shg.monthly_capacity,
      activeWorkloadUnits: snap.activeWorkloadUnits,
      comparablePriceCount: snap.comparablePrices.count,
      estimatedProductionDays: estimatedDays,
    },
  };
}
