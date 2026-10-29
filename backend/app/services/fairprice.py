from datetime import datetime, timedelta, timezone
from typing import List, Optional
from app.schemas.pricing import (
    CostBreakdownItem,
    FairPriceCalculateRequest,
    FairPriceCalculateResponse,
)


def to_paise(rupees: float) -> int:
    """Converts a rupee float to integer paise, avoiding binary float rounding drift."""
    return int(round(rupees * 100))


def from_paise(paise: int) -> float:
    """Converts integer paise to rupee float."""
    return paise / 100.0


def compute_fair_price(request: FairPriceCalculateRequest) -> FairPriceCalculateResponse:
    """
    FairPrice Engine — transparent, deterministic product costing according to DAY-NRLM standards:
    - Distinguishes markup on cost vs margin on selling price.
    - Flags stale material prices against freshness threshold.
    - Tracks evidence-based wastage allowances.
    - Calculates quote validity expiry.
    - Enforces labour safeguard: labour is never silently free.
    - Runs all calculations in integer paise.
    """
    now = datetime.now(timezone.utc)
    warnings: List[str] = []
    missing_inputs: List[str] = []
    stale_flags: List[str] = []

    # 1. Materials & Wastage Calculation
    material_breakdown: List[CostBreakdownItem] = []
    raw_materials_paise = 0
    wastage_paise = 0

    if not request.materials:
        warnings.append("No material lines recorded for this calculation.")

    for mat in request.materials:
        base_line_paise = to_paise(mat.quantity * mat.unit_cost_inr)
        line_wastage_paise = to_paise(mat.quantity * mat.unit_cost_inr * (mat.wastage_percent / 100.0))
        
        raw_materials_paise += base_line_paise
        wastage_paise += line_wastage_paise
        
        is_stale = False
        notes = f"{mat.quantity} {mat.unit} @ ₹{mat.unit_cost_inr:.2f}"
        if mat.wastage_percent > 0:
            notes += f" (+{mat.wastage_percent}% wastage: ₹{from_paise(line_wastage_paise):.2f})"

        if mat.price_confirmed_at:
            # Ensure price_confirmed_at is timezone-aware
            confirmed_at = mat.price_confirmed_at if mat.price_confirmed_at.tzinfo else mat.price_confirmed_at.replace(tzinfo=timezone.utc)
            age_days = (now - confirmed_at).days
            if age_days > request.stale_price_threshold_days:
                is_stale = True
                stale_msg = (
                    f"Material '{mat.name}' price was confirmed {age_days} days ago "
                    f"(exceeds {request.stale_price_threshold_days}-day freshness policy)."
                )
                stale_flags.append(stale_msg)
                notes += f" [STALE: {age_days}d ago]"
        else:
            # Price confirmation timestamp absent
            warnings.append(f"Material '{mat.name}' has no price confirmation date recorded.")

        material_breakdown.append(CostBreakdownItem(
            name=mat.name,
            amount=from_paise(base_line_paise + line_wastage_paise),
            notes=notes,
            stale=is_stale,
        ))

    direct_materials_total_paise = raw_materials_paise + wastage_paise

    # 2. Labour Calculation
    labour_breakdown: List[CostBreakdownItem] = []
    labour_paise = 0
    labour_incomplete = False

    if not request.labour_stages:
        missing_inputs.append("No labour production stages recorded.")
        labour_incomplete = True

    for stage in request.labour_stages:
        if stage.hourly_rate_inr is None or stage.hourly_rate_inr <= 0:
            labour_incomplete = True
            missing_inputs.append(
                f"Labour rate for stage '{stage.stage_name}' is unrecorded. "
                f"Labour is never assumed free; an explicit rate is required."
            )
            labour_breakdown.append(CostBreakdownItem(
                name=stage.stage_name,
                amount=0.0,
                notes=f"{stage.hours:.1f} hours recorded (RATE MISSING — incomplete)",
            ))
        else:
            stage_paise = to_paise(stage.hours * stage.hourly_rate_inr)
            labour_paise += stage_paise
            notes = f"{stage.hours:.1f} hrs @ ₹{stage.hourly_rate_inr:.2f}/hr"
            if stage.rate_source:
                notes += f" ({stage.rate_source})"
            labour_breakdown.append(CostBreakdownItem(
                name=stage.stage_name,
                amount=from_paise(stage_paise),
                notes=notes,
            ))

    # 3. Packaging & Direct Production Cost
    packaging_paise = to_paise(request.packaging_inr)
    direct_production_paise = direct_materials_total_paise + labour_paise + packaging_paise

    # 4. Overhead (% of direct materials + labour)
    overhead_base_paise = direct_materials_total_paise + labour_paise
    overhead_paise = int(round(overhead_base_paise * (request.overhead_percent / 100.0)))
    total_production_paise = direct_production_paise + overhead_paise

    # 5. Pricing Mode: Margin vs Markup
    # Determine mode: markup takes precedence if explicitly supplied and margin is None
    pricing_mode = "markup" if request.markup_percent is not None and request.target_margin_percent is None else "margin"
    
    commission_pct = max(0.0, min(90.0, request.commission_percent))
    
    if labour_incomplete:
        # Incomplete labour blocks quoting a valid selling price
        is_valid = False
        is_incomplete = True
        suggested_price_paise = 0
        floor_price_paise = total_production_paise
        profit_paise = 0
        commission_paise = 0
        profit_pct = 0.0
    else:
        is_valid = True
        is_incomplete = False
        floor_price_paise = total_production_paise

        if pricing_mode == "margin":
            # Target Gross Margin on the Final Selling Price Base:
            # Formula: Selling Price = Production Cost / (1 - (margin% + commission%) / 100)
            margin_pct = request.target_margin_percent if request.target_margin_percent is not None else 25.0
            profit_pct = margin_pct
            total_deduction_ratio = (margin_pct + commission_pct) / 100.0
            
            if total_deduction_ratio >= 0.99:
                warnings.append("Combined margin and commission approach 100%; capped denominator at 0.05.")
                denom = 0.05
            else:
                denom = 1.0 - total_deduction_ratio
                
            suggested_price_paise = int(round(total_production_paise / denom))
            profit_paise = int(round(suggested_price_paise * (margin_pct / 100.0)))
            commission_paise = int(round(suggested_price_paise * (commission_pct / 100.0)))
        else:
            # Markup on Production Cost:
            # Formula: Base Price = Production Cost * (1 + markup% / 100)
            # Selling Price = Base Price / (1 - commission% / 100)
            markup_pct = request.markup_percent if request.markup_percent is not None else 30.0
            profit_pct = markup_pct
            profit_paise = int(round(total_production_paise * (markup_pct / 100.0)))
            base_price_paise = total_production_paise + profit_paise
            
            comm_denom = 1.0 - (commission_pct / 100.0) if commission_pct < 100.0 else 0.05
            suggested_price_paise = int(round(base_price_paise / comm_denom))
            commission_paise = suggested_price_paise - base_price_paise

    # 6. Direct Artisan Collective Earnings
    # Artisan earnings = agreed labour wages + profit margin share
    artisan_earnings_paise = labour_paise + profit_paise
    artisan_share_pct = (
        round((artisan_earnings_paise / suggested_price_paise) * 100.0, 1)
        if suggested_price_paise > 0 else 0.0
    )

    # 7. Quote Validity Expiry
    valid_until_dt = now + timedelta(days=request.quote_validity_days)

    return FairPriceCalculateResponse(
        is_valid=is_valid,
        is_incomplete=is_incomplete,
        pricing_mode=pricing_mode,
        currency="INR",
        materials_cost=from_paise(raw_materials_paise),
        wastage_cost=from_paise(wastage_paise),
        direct_materials_total=from_paise(direct_materials_total_paise),
        labour_cost=from_paise(labour_paise),
        packaging_cost=from_paise(packaging_paise),
        direct_production_cost=from_paise(direct_production_paise),
        overhead_cost=from_paise(overhead_paise),
        total_production_cost=from_paise(total_production_paise),
        profit_amount=from_paise(profit_paise),
        profit_percentage=profit_pct,
        commission_amount=from_paise(commission_paise),
        commission_percentage=commission_pct,
        floor_price=from_paise(floor_price_paise),
        suggested_retail_price=from_paise(suggested_price_paise),
        artisan_earnings=from_paise(artisan_earnings_paise),
        artisan_share_percent=artisan_share_pct,
        material_breakdown=material_breakdown,
        labour_breakdown=labour_breakdown,
        stale_material_flags=stale_flags,
        missing_inputs=missing_inputs,
        warnings=warnings,
        quote_validity_days=request.quote_validity_days,
        quote_valid_until=valid_until_dt.isoformat(),
        calculated_at=now.isoformat(),
    )


def calculate_fair_price(extraction, custom_hours: Optional[float] = None, hourly_rate: float = 150.0):
    """
    Convenience wrapper for WhatsApp artisan voice listing drafts.
    Produces a FairPriceEstimate from an extraction.
    """
    from app.schemas.pricing import LabourStageCostLine, MaterialCostLine
    from app.schemas.whatsapp_listing import FairPriceEstimate

    mat_lines: List[MaterialCostLine] = []
    for mat in extraction.materials:
        mat_lines.append(MaterialCostLine(
            name=mat,
            quantity=1.0,
            unit="unit",
            unit_cost_inr=220.0 if "silk" in mat.lower() else 140.0,
            wastage_percent=5.0,
            price_confirmed_at=datetime.now(timezone.utc),
        ))
    if not mat_lines:
        mat_lines.append(MaterialCostLine(
            name="Handmade craft materials",
            quantity=1.0,
            unit="unit",
            unit_cost_inr=180.0,
            wastage_percent=5.0,
            price_confirmed_at=datetime.now(timezone.utc),
        ))

    hours = custom_hours or extraction.estimated_labour_hours or 4.0
    labour_lines = [
        LabourStageCostLine(
            stage_name=f"{extraction.craft or 'Handicraft'} production",
            hours=hours,
            hourly_rate_inr=hourly_rate,
            rate_source="SHG Standard Living Wage",
        )
    ]

    req = FairPriceCalculateRequest(
        product_title=extraction.title or "Handcrafted Item",
        materials=mat_lines,
        labour_stages=labour_lines,
        packaging_inr=40.0,
        overhead_percent=10.0,
        target_margin_percent=25.0,
        commission_percent=7.0,
    )
    res = compute_fair_price(req)

    return FairPriceEstimate(
        material_cost=res.materials_cost,
        labour_cost=res.labour_cost,
        packaging_cost=res.packaging_cost,
        overhead_cost=res.overhead_cost,
        platform_fee=res.commission_amount,
        floor_price=res.floor_price,
        suggested_price=res.suggested_retail_price,
        artisan_earnings=res.artisan_earnings,
        currency="INR",
        is_complete=res.is_valid,
        breakdown_notes=[f"Calculated with {res.pricing_mode} mode."],
    )

