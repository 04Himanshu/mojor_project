from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime

VALID_ORDER_STATUSES = ["Pending", "Confirmed", "Dispatched", "Delivered", "Cancelled"]
VALID_PAYMENT_STATUSES = ["Unpaid", "Paid", "Partially Paid", "Refunded"]
VALID_PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "UPI", "Credit Net 30"]

class OrderItemBase(BaseModel):
    inventory_id: int = Field(..., gt=0, description="Valid inventory ID required")
    quantity: int = Field(..., gt=0, description="Quantity must be strictly greater than 0")

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemResponse(OrderItemBase):
    id: int
    price_at_time: float
    item_name: Optional[str] = None
    item_sku: Optional[str] = None
    unit_of_measurement: Optional[str] = "units"
    subtotal: float = 0.0

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_id: Optional[int] = Field(None, description="Customer ID if selecting existing customer")
    customer_name: Optional[str] = Field(None, description="Direct customer name if not selecting ID")
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    payment_status: Optional[str] = Field("Unpaid", description="Payment status: Unpaid, Paid, Partially Paid")
    payment_method: Optional[str] = Field("Cash", description="Payment method: Cash, Card, Bank Transfer, UPI, Credit Net 30")
    notes: Optional[str] = None
    tax_rate: Optional[float] = Field(0.0, ge=0.0, le=1.0, description="Tax rate, e.g. 0.18 for 18%")
    discount_amount: Optional[float] = Field(0.0, ge=0.0, description="Discount amount")
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Order must contain at least one item")

    @field_validator('items')
    @classmethod
    def validate_items_non_empty(cls, v: List[OrderItemCreate]) -> List[OrderItemCreate]:
        if not v:
            raise ValueError("An order must contain at least one line item.")
        item_ids = [item.inventory_id for item in v]
        if len(item_ids) != len(set(item_ids)):
            raise ValueError("Duplicate inventory item detected in order. Consolidate quantities into a single line.")
        return v

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status: Pending, Confirmed, Dispatched, Delivered, Cancelled")
    payment_status: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        clean = v.strip().capitalize()
        if clean not in VALID_ORDER_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Allowed values: {', '.join(VALID_ORDER_STATUSES)}")
        return clean

class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: Optional[int] = None
    customer_name: Optional[str] = "Walk-in Customer"
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = "Admin User"
    created_at: datetime
    status: str
    stock_deducted: bool
    payment_status: str
    payment_method: str
    notes: Optional[str] = None
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True

class OrderStatsResponse(BaseModel):
    total_orders: int
    total_revenue: float
    pending_count: int
    confirmed_count: int
    dispatched_count: int
    delivered_count: int
    cancelled_count: int

class InvoiceDataResponse(BaseModel):
    invoice_number: str
    invoice_date: datetime
    order_id: int
    order_number: str
    order_date: datetime
    company_name: str
    company_address: str
    company_email: str
    company_phone: str
    company_gstin: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    status: str
    payment_status: str
    payment_method: str
    notes: Optional[str] = None
    items: List[OrderItemResponse]
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount_amount: float
    total_amount: float
