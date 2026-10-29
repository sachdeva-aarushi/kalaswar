from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MaterialCostLine(BaseModel):
    name: str = Field(..., examples=["Mulberry Silk Fabric"])
    quantity: float = Field(..., gt=0, examples=[2.5])
    unit: str = Field("meters", examples=["meters"])
    unit_cost_inr: float = Field(..., ge=0, examples=[450.0])
    wastage_percent: float = Field(0.0, ge=0, le=100, examples=[10.0])
    price_confirmed_at: Optional[datetime] = Field(None, examples=["2026-09-01T00:00:00Z"])
    supplier: Optional[str] = Field(None, examples=["Murshidabad Weavers Cooperative"])


class LabourStageCostLine(BaseModel):
    stage_name: str = Field(..., examples=["Pattern Tracing & Hand Embroidery"])
    hours: float = Field(..., gt=0, examples=[6.0])
    hourly_rate_inr: Optional[float] = Field(None, gt=0, examples=[150.0])
    rate_source: Optional[str] = Field(None, examples=["SHG Standard Living Wage Rate"])


class FairPriceCalculateRequest(BaseModel):
    product_title: Optional[str] = Field("Handcrafted Artisan Item", examples=["Pure Silk Kantha Stole"])
    materials: List[MaterialCostLine] = Field(default_factory=list)
    labour_stages: List[LabourStageCostLine] = Field(default_factory=list)
    packaging_inr: float = Field(40.0, ge=0, examples=[40.0])
    overhead_percent: float = Field(10.0, ge=0, le=100, examples=[10.0])
    commission_percent: float = Field(7.0, ge=0, le=100, examples=[7.0])
    
    # Mutually exclusive profit parameters: supply target_margin_percent OR markup_percent
    target_margin_percent: Optional[float] = Field(None, ge=0, lt=100, examples=[25.0])
    markup_percent: Optional[float] = Field(None, ge=0, examples=[None])
    
    # Stale threshold in days (e.g. materials not updated in > 30 days are flagged)
    stale_price_threshold_days: int = Field(30, ge=1, examples=[30])
    quote_validity_days: int = Field(30, ge=1, examples=[30])

    model_config = ConfigDict(extra="ignore")


class CostBreakdownItem(BaseModel):
    name: str
    amount: float
    notes: Optional[str] = None
    stale: bool = False


class FairPriceCalculateResponse(BaseModel):
    is_valid: bool = Field(True, description="True if all necessary labour and material inputs exist")
    is_incomplete: bool = Field(False, description="True if any labour rate or critical input is missing")
    pricing_mode: str = Field("margin", description="'margin' (on selling price) or 'markup' (on cost)")
    currency: str = Field("INR")
    
    # Cost component build-up
    materials_cost: float
    wastage_cost: float
    direct_materials_total: float
    labour_cost: float
    packaging_cost: float
    direct_production_cost: float
    overhead_cost: float
    total_production_cost: float
    
    # Margin / Markup & Commission
    profit_amount: float
    profit_percentage: float
    commission_amount: float
    commission_percentage: float
    
    # Final prices
    floor_price: float = Field(..., description="Cost recovery price with 0 profit")
    suggested_retail_price: float = Field(..., description="Final selling price with margin and commission")
    artisan_earnings: float = Field(..., description="Direct income to artisan collective (labour + profit)")
    artisan_share_percent: float = Field(..., description="Percentage of final price going directly to collective")
    
    # Line breakdowns
    material_breakdown: List[CostBreakdownItem]
    labour_breakdown: List[CostBreakdownItem]
    
    # Warnings, Stale Flags & Validity
    stale_material_flags: List[str] = Field(default_factory=list)
    missing_inputs: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    quote_validity_days: int
    quote_valid_until: str
    calculated_at: str
