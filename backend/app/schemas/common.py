from typing import Any, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field("healthy", examples=["healthy"])
    service: str = Field(..., examples=["Kalaswar Core Services"])
    version: str = Field(..., examples=["3.0.0"])
    environment: str = Field(..., examples=["development"])
    database_connected: bool = Field(True, examples=[True])


class ErrorDetail(BaseModel):
    code: str = Field(..., examples=["UNAUTHORIZED"])
    message: str = Field(..., examples=["Authentication required or invalid token"])
    status_code: int = Field(..., examples=[401])
    request_id: str = Field(..., examples=["req_01h7x8..."])
    details: Optional[Any] = Field(None, examples=[None])


class ErrorResponse(BaseModel):
    error: ErrorDetail


class StatusResponse(BaseModel):
    status: str = Field("success", examples=["success"])
    message: str = Field(..., examples=["Operation completed successfully"])
