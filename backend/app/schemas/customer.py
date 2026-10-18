from pydantic import BaseModel
from typing import Optional

class CustomerBase(BaseModel):
    name: str
    email: str
    phone: str
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    class Config:
        from_attributes = True
