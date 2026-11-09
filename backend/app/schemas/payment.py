from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.schemas.order import OrderItemCreate, OrderResponse

class CashfreeCreateSessionRequest(BaseModel):
    customer_id: Optional[int] = Field(None, description="Customer ID if selecting existing customer")
    customer_name: Optional[str] = Field("Walk-in Customer", description="Customer Name")
    customer_phone: Optional[str] = Field(None, description="Customer Phone Number (10 digits)")
    customer_email: Optional[str] = Field(None, description="Customer Email")
    shipping_address: Optional[str] = Field("Counter Handover", description="Delivery or Handover Address")
    tax_rate: Optional[float] = Field(0.0, ge=0.0, le=1.0)
    discount_amount: Optional[float] = Field(0.0, ge=0.0)
    payment_method: Optional[str] = Field("QR Code", description="Payment channel: QR Code, UPI, or Card")
    notes: Optional[str] = None
    items: List[OrderItemCreate] = Field(..., min_length=1)

class CashfreeCreateSessionResponse(BaseModel):
    payment_session_id: str
    cf_order_id: str
    order_amount: float
    order_currency: str = "INR"
    order_status: str
    environment: str

class CashfreeVerifyResponse(BaseModel):
    success: bool
    message: str
    cf_order_id: str
    cf_payment_id: Optional[str] = None
    payment_status: str
    payment_method: Optional[str] = None
    order: Optional[OrderResponse] = None

class PaymentTransactionResponse(BaseModel):
    id: int
    order_id: Optional[int] = None
    cf_order_id: str
    cf_payment_id: Optional[str] = None
    payment_session_id: Optional[str] = None
    amount: float
    currency: str
    payment_method: Optional[str] = None
    status: str
    gateway: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

