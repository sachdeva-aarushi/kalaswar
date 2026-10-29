import math
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from app.schemas.makepossible import (
    CollectiveSnapshot,
    CustomRequestSpec,
    MakePossibleEvaluationRequest,
    MakePossibleEvaluationResult,
)

GENERIC_WORDS: Set[str] = {
    "weaving", "weave", "craft", "crafts", "making", "handmade", "handcrafted",
    "bag", "bags", "item", "items", "product", "products", "piece", "pieces",
    "traditional", "indian", "sample", "order",
}


def tokenize(text: str) -> List[str]:
    """Tokenizes and filters common stopwords to prevent spurious craft matches."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return [
        word for word in cleaned.split()
        if len(word) > 2 and word not in GENERIC_WORDS
    ]


def tokens_overlap(source: str, target: str) -> bool:
    """Returns True if there is meaningful keyword overlap between two craft descriptions."""
    a = set(tokenize(source))
    b = set(tokenize(target))
    return bool(a.intersection(b))


def estimate_production_days(quantity: int, monthly_capacity: Optional[int]) -> Optional[int]:
    """Deterministic production duration in calendar days including preparation and QA buffer."""
    if monthly_capacity is None or monthly_capacity <= 0:
        return None
    pieces_per_day = monthly_capacity / 30.0
    return int(math.ceil(quantity / pieces_per_day)) + 4  # +4 days preparation and QA inspection


def evaluate_feasibility(request: MakePossibleEvaluationRequest) -> MakePossibleEvaluationResult:
    """
    MakePossible Feasibility Engine — strictly deterministic rules-based evaluation.
    Evaluates:
      1. Craft skill fit against verified artisan skills.
      2. Material availability and stock freshness (stale inventory flagged as missing/uncertain).
      3. Active collective workload and monthly capacity headroom.
      4. Requested delivery deadline vs estimated production duration.
      5. Budget alignment against comparable recorded products.

    Golden Rule: Unknown or unrecorded data outputs 'uncertain', NEVER 'feasible'.
    """
    now = datetime.now(timezone.utc)
    spec: CustomRequestSpec = request.request
    snap: Optional[CollectiveSnapshot] = request.snapshot

    # If snapshot not supplied, we simulate an unrecorded collective -> strictly uncertain
    if snap is None:
        return MakePossibleEvaluationResult(
            status="uncertain",
            evidence=[],
            missing_info=["Collective snapshot data not provided or collective unrecorded."],
            constraints=["Operational capacity cannot be confirmed without recorded collective data."],
            suggested_changes=["Select a verified SHG cluster with recorded skills and inventory."],
            summary="Uncertain: No collective operational data available to evaluate feasibility.",
            data_used={},
            evaluated_at=now.isoformat(),
        )

    evidence: List[str] = []
    missing_info: List[str] = []
    constraints: List[str] = []
    suggested_changes: List[str] = []
    data_used: Dict[str, Any] = {}

    hard_skill_fail = False
    hard_capacity_fail = False
    hard_deadline_fail = False

    # 1. Skill Fit Evaluation
    craft_query = spec.craft_preference or spec.category or ""
    matched_skills: List[str] = []

    if not snap.skills:
        missing_info.append(f"No craft skills are recorded for collective '{snap.shg_name}'.")
    elif craft_query:
        for skill in snap.skills:
            if tokens_overlap(craft_query, skill.skill):
                matched_skills.append(skill.skill)
        
        if not matched_skills:
            hard_skill_fail = True
            recorded_skills_str = ", ".join([s.skill for s in snap.skills])
            constraints.append(
                f"Collective '{snap.shg_name}' does not possess recorded skills matching '{craft_query}'. "
                f"(Recorded skills: {recorded_skills_str})"
            )
        else:
            evidence.append(f"Craft skill verified: {', '.join(matched_skills)} (Mastery: {snap.skills[0].level}).")
    else:
        missing_info.append("Custom request does not specify a craft preference or category.")

    data_used["matched_skills"] = matched_skills

    # 2. Materials & Freshness Evaluation
    matched_materials: List[str] = []
    if spec.materials:
        if not snap.materials:
            missing_info.append(f"Collective '{snap.shg_name}' has no recorded materials inventory.")
        else:
            for mat in snap.materials:
                if tokens_overlap(spec.materials, mat.name):
                    matched_materials.append(mat.name)
                    # Check stock quantity
                    if mat.low_stock_threshold is not None and mat.quantity <= mat.low_stock_threshold:
                        constraints.append(
                            f"Material '{mat.name}' is low in stock ({mat.quantity} {mat.unit} remaining). "
                            f"Raw material replenishment required before commencing production."
                        )
                        suggested_changes.append(f"Procure additional {mat.name} or allow 7-day procurement lead time.")
                    else:
                        evidence.append(f"Material verified in stock: {mat.name} ({mat.quantity} {mat.unit}).")

                    # Check inventory freshness
                    if mat.updated_at:
                        mat_updated = mat.updated_at if mat.updated_at.tzinfo else mat.updated_at.replace(tzinfo=timezone.utc)
                        age_days = (now - mat_updated).days
                        if age_days > request.inventory_freshness_threshold_days:
                            missing_info.append(
                                f"Inventory count for '{mat.name}' was last confirmed {age_days} days ago "
                                f"(exceeds {request.inventory_freshness_threshold_days}-day freshness policy). "
                                f"Physical stock verification required."
                            )
                    else:
                        missing_info.append(f"Inventory timestamp missing for '{mat.name}'. Fresh stock check required.")

            if not matched_materials:
                missing_info.append(
                    f"Requested material '{spec.materials}' is not recorded in '{snap.shg_name}' inventory. "
                    f"Coordinator must confirm material sourcing."
                )
    else:
        missing_info.append("Specific materials not stated in request.")

    data_used["matched_materials"] = matched_materials

    # 3. Monthly Capacity & Workload Evaluation
    estimated_days = estimate_production_days(spec.quantity, snap.monthly_capacity)
    data_used["estimated_production_days"] = estimated_days
    data_used["monthly_capacity"] = snap.monthly_capacity
    data_used["active_workload_units"] = snap.active_workload_units

    if snap.monthly_capacity is None or snap.monthly_capacity <= 0:
        missing_info.append(f"Monthly production capacity is unrecorded for collective '{snap.shg_name}'.")
    else:
        remaining_capacity = snap.monthly_capacity - snap.active_workload_units
        if spec.quantity > snap.monthly_capacity * 1.5:
            hard_capacity_fail = True
            constraints.append(
                f"Requested quantity ({spec.quantity} units) far exceeds collective monthly capacity "
                f"({snap.monthly_capacity} units)."
            )
            suggested_changes.append(
                f"Split order across multi-SHG clusters or scale down batch size to {snap.monthly_capacity} units."
            )
        elif spec.quantity > remaining_capacity:
            constraints.append(
                f"Current active workload ({snap.active_workload_units} units) leaves only "
                f"{max(remaining_capacity, 0)} units of capacity this month."
            )
            suggested_changes.append("Schedule order in next month's batch or extend delivery timeline.")
        else:
            evidence.append(
                f"Capacity verified: {spec.quantity} units requested with {remaining_capacity} units "
                f"headroom available this month (Monthly capacity: {snap.monthly_capacity})."
            )

    # 4. Deadline vs Estimated Production Duration
    if spec.deadline_in_days is None:
        missing_info.append("No delivery deadline stated in request.")
    elif estimated_days is not None:
        if estimated_days > spec.deadline_in_days * 1.5:
            hard_deadline_fail = True
            constraints.append(
                f"Estimated production duration ({estimated_days} days) far exceeds requested "
                f"{spec.deadline_in_days}-day deadline."
            )
            suggested_changes.append(f"Extend deadline to at least {estimated_days} calendar days.")
        elif estimated_days > spec.deadline_in_days:
            constraints.append(
                f"Estimated production duration ({estimated_days} days) exceeds requested "
                f"{spec.deadline_in_days}-day deadline."
            )
            suggested_changes.append(f"Extend deadline to {estimated_days} days or reduce batch quantity.")
        else:
            evidence.append(
                f"Timeline feasible: Production requires ~{estimated_days} days, well within the "
                f"{spec.deadline_in_days}-day deadline."
            )

    # 5. Budget Fit Check
    if spec.budget_inr_per_unit is not None and snap.comparable_prices.count > 0:
        min_p = snap.comparable_prices.min
        avg_p = snap.comparable_prices.avg
        if spec.budget_inr_per_unit < min_p:
            constraints.append(
                f"Target budget of ₹{spec.budget_inr_per_unit:.0f}/unit is below lowest comparable "
                f"product price (₹{min_p:.0f})."
            )
            suggested_changes.append(
                f"Increase budget per unit to at least ₹{min_p:.0f} or simplify craft specifications."
            )
        else:
            evidence.append(
                f"Budget fit: Target ₹{spec.budget_inr_per_unit:.0f}/unit is within recorded historical "
                f"range (₹{min_p:.0f}–₹{snap.comparable_prices.max:.0f})."
            )

    # --- Strict Status Aggregation Rule ---
    # 1. Hard fail on capability or physical limits -> not_feasible
    if hard_skill_fail or hard_capacity_fail or hard_deadline_fail:
        final_status = "not_feasible"
    # 2. Any missing data or unverified stale inventory -> uncertain (NEVER feasible on unknown data)
    elif missing_info:
        final_status = "uncertain"
    # 3. Soft constraints requiring adjustments -> uncertain or feasible
    elif constraints:
        final_status = "uncertain"  # Needs coordinator clarification
    else:
        final_status = "feasible"

    # Deterministic Summary Generation
    if final_status == "feasible":
        summary = (
            f"Feasible: Collective '{snap.shg_name}' possesses verified craft skills, available material stock, "
            f"and sufficient production headroom to deliver {spec.quantity} units within the requested schedule."
        )
    elif final_status == "not_feasible":
        summary = (
            f"Not Feasible: Operational constraints prevent fulfillment as requested. "
            f"Primary reason: {constraints[0] if constraints else 'Incompatible requirements'}."
        )
    else:
        summary = (
            f"Uncertain: Incomplete or stale information prevents an automated commitment. "
            f"Clarification required for: {'; '.join(missing_info[:2])}."
        )

    return MakePossibleEvaluationResult(
        status=final_status,
        evidence=evidence,
        missing_info=missing_info,
        constraints=constraints,
        suggested_changes=suggested_changes,
        summary=summary,
        data_used=data_used,
        evaluated_at=now.isoformat(),
    )
