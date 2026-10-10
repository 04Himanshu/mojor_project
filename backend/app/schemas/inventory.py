from pydantic import BaseModel

class InventoryBase(BaseModel):
    product_name: str
    quantity: int
    price: float
    low_stock_threshold: int = 5

class InventoryCreate(InventoryBase):
    pass

class InventoryResponse(InventoryBase):
    id: int
    class Config:
        from_attributes = True
