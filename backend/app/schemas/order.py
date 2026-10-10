from pydantic import BaseModel
from typing import List
from datetime import datetime

class OrderItemBase(BaseModel):
    inventory_id: int
    quantity: int

class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemBase]

class OrderItemResponse(OrderItemBase):
    id: int
    price_at_time: float
    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    user_id: int
    created_at: datetime
    status: str
    items: List[OrderItemResponse]
    class Config:
        from_attributes = True
