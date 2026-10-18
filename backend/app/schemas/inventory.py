from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re

class InventoryBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=100, description="Unique SKU code")
    name: str = Field(..., min_length=1, max_length=255, description="Item name")
    description: Optional[str] = None
    category: str = Field("General", min_length=1, max_length=100)
    unit_of_measurement: str = Field("pcs", min_length=1, max_length=50)
    cost_price: float = Field(0.0, ge=0.0, description="Cost price must be >= 0")
    selling_price: float = Field(0.0, ge=0.0, description="Selling price must be >= 0")
    reorder_level: int = Field(5, ge=0, description="Reorder level must be >= 0")
    is_active: bool = True

    @field_validator('sku')
    @classmethod
    def validate_sku(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if not cleaned:
            raise ValueError("SKU cannot be empty or pure whitespace.")
        if not re.match(r'^[A-Z0-9_\-\.]+$', cleaned):
            raise ValueError("SKU may only contain letters, numbers, dashes (-), dots (.), and underscores (_).")
        return cleaned

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Item name cannot be empty or pure whitespace.")
        return cleaned

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Category cannot be empty or pure whitespace.")
        return cleaned

    @field_validator('unit_of_measurement')
    @classmethod
    def validate_uom(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Unit of measurement cannot be empty.")
        return cleaned

class InventoryCreate(InventoryBase):
    initial_quantity: int = Field(0, ge=0, description="Initial quantity must be >= 0")

class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measurement: Optional[str] = None
    cost_price: Optional[float] = Field(None, ge=0.0)
    selling_price: Optional[float] = Field(None, ge=0.0)
    reorder_level: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Item name cannot be empty or whitespace.")
            return cleaned
        return v

class StockMovementResponse(BaseModel):
    id: int
    inventory_id: int
    item_name: Optional[str] = None
    item_sku: Optional[str] = None
    transaction_type: str
    quantity: int
    previous_quantity: int
    resulting_quantity: int
    reason: str
    reference_order: Optional[str] = None
    user_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class InventoryResponse(InventoryBase):
    id: int
    quantity: int
    unit_price: float
    stock_value: float
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PaginatedInventoryResponse(BaseModel):
    items: List[InventoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class PaginatedMovementsResponse(BaseModel):
    movements: List[StockMovementResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class StockInRequest(BaseModel):
    quantity: int = Field(..., gt=0, description="Quantity to add must be strictly greater than 0")
    reason: str = Field(..., min_length=1, description="Reason for stock in is required")
    reference_order: Optional[str] = None
    user_name: Optional[str] = "Admin User"

    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Reason for stock in cannot be empty.")
        return cleaned

class StockOutRequest(BaseModel):
    quantity: int = Field(..., gt=0, description="Quantity to remove must be strictly greater than 0")
    reason: str = Field(..., min_length=1, description="Reason for stock out is required")
    reference_order: Optional[str] = None
    user_name: Optional[str] = "Admin User"

    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Reason for stock out cannot be empty.")
        return cleaned

class StockAdjustmentRequest(BaseModel):
    new_quantity: int = Field(..., ge=0, description="New physical count must be >= 0")
    reason: str = Field(..., min_length=1, description="Reason for physical count adjustment is required")
    reference_order: Optional[str] = None
    user_name: Optional[str] = "Admin User"

    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Reason for adjustment cannot be empty.")
        return cleaned

class InventorySummaryStats(BaseModel):
    total_skus: int
    total_stock_value: float
    in_stock_count: int
    low_stock_count: int
    out_of_stock_count: int
    inactive_count: int
    categories: List[str]
