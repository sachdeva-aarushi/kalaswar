from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class MaterialInventoryCreate(BaseModel):
    shg_id: UUID
    name: str = Field(..., description="Raw material name (e.g. Tussar Silk, Indigo Dye)")
    unit: str = Field(default="meters", description="Unit of measurement (meters, kg, skeins, units)")
    quantity: float = Field(default=0.0, ge=0)
    low_stock_threshold: Optional[float] = Field(default=None, ge=0)
    updated_by: Optional[str] = "Coordinator"


class MaterialInventoryUpdate(BaseModel):
    quantity: Optional[float] = Field(None, ge=0)
    low_stock_threshold: Optional[float] = Field(None, ge=0)
    name: Optional[str] = None
    unit: Optional[str] = None
    updated_by: Optional[str] = None


class MaterialInventoryResponse(BaseModel):
    id: UUID
    shg_id: UUID
    shg_name: Optional[str] = None
    name: str
    unit: str
    quantity: float
    low_stock_threshold: Optional[float] = None
    updated_at: str
    updated_by: Optional[str] = None
    is_low_stock: bool = False
    is_stale: bool = False
    age_in_days: int = 0

    model_config = ConfigDict(from_attributes=True)


class InventorySummaryResponse(BaseModel):
    total_materials: int
    low_stock_count: int
    stale_materials_count: int
    total_finished_products: int
    active_shgs_count: int
