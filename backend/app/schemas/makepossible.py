from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SkillRecord(BaseModel):
    skill: str = Field(..., examples=["Kantha hand embroidery"])
    level: str = Field("core", examples=["expert", "core", "apprentice"])
    notes: Optional[str] = None


class MaterialRecord(BaseModel):
    name: str = Field(..., examples=["Tussar silk fabric"])
    unit: str = Field("meters", examples=["meters"])
    quantity: float = Field(..., ge=0, examples=[45.0])
    low_stock_threshold: Optional[float] = Field(None, examples=[10.0])
    updated_at: Optional[datetime] = None


class ComparablePriceStats(BaseModel):
    min: float = 0.0
    avg: float = 0.0
    max: float = 0.0
    count: int = 0


class CollectiveSnapshot(BaseModel):
    shg_id: str = Field(..., examples=["bbbbbbbb-0001-0000-0000-000000000001"])
    shg_name: str = Field(..., examples=["Bolpur Shantiniketan Mahila Samiti"])
    monthly_capacity: Optional[int] = Field(None, examples=[120])
    skills: List[SkillRecord] = Field(default_factory=list)
    materials: List[MaterialRecord] = Field(default_factory=list)
    active_workload_units: int = Field(0, ge=0, examples=[30])
    comparable_prices: ComparablePriceStats = Field(default_factory=ComparablePriceStats)


class CustomRequestSpec(BaseModel):
    quantity: int = Field(..., gt=0, examples=[50])
    craft_preference: Optional[str] = Field(None, examples=["Kantha hand embroidery"])
    materials: Optional[str] = Field(None, examples=["Tussar silk fabric"])
    category: Optional[str] = Field(None, examples=["Scarves & Stoles"])
    budget_inr_per_unit: Optional[float] = Field(None, gt=0, examples=[1200.0])
    budget_inr_total: Optional[float] = Field(None, gt=0, examples=[60000.0])
    deadline_in_days: Optional[int] = Field(None, gt=0, examples=[25])
    customisation_notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class MakePossibleEvaluationRequest(BaseModel):
    request: CustomRequestSpec
    snapshot: Optional[CollectiveSnapshot] = None
    shg_id: Optional[str] = None
    inventory_freshness_threshold_days: int = Field(60, ge=1, examples=[60])


class MakePossibleEvaluationResult(BaseModel):
    status: str = Field(..., description="'feasible' | 'uncertain' | 'not_feasible'")
    evidence: List[str] = Field(default_factory=list)
    missing_info: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    suggested_changes: List[str] = Field(default_factory=list)
    summary: str = Field(...)
    data_used: Dict[str, Any] = Field(default_factory=dict)
    evaluated_at: str
