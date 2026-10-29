from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class RiskFlag(BaseModel):
    severity: str = Field(..., description="Risk severity: high, medium, low")
    type: str = Field(..., description="Risk category: delayed_orders, stale_inventory, low_stock, missing_qa, capacity_overload")
    title: str
    explanation: str = Field(..., description="Actionable descriptive explanation text of the risk")
    affected_ids: List[str] = Field(default_factory=list)


class DashboardCounts(BaseModel):
    active_orders: int = 0
    pending_production: int = 0
    in_production: int = 0
    ready_for_dispatch: int = 0
    delivered_orders: int = 0
    delayed_orders: int = 0
    total_artisans: int = 0
    active_artisans: int = 0
    pending_quality_checks: int = 0
    at_risk_assignments: int = 0
    low_stock_materials: int = 0
    stale_inventory_items: int = 0


class RecentActivityItem(BaseModel):
    id: str
    type: str
    title: str
    description: str
    timestamp: str


class CoordinatorDashboardResponse(BaseModel):
    shg_id: Optional[UUID] = None
    shg_name: Optional[str] = None
    cluster_name: Optional[str] = None
    generated_at: str
    counts: DashboardCounts
    risk_flags: List[RiskFlag] = Field(default_factory=list)
    recent_activity: List[RecentActivityItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
