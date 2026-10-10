from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_customers: int
    total_orders: int
    total_inventory_items: int
    low_stock_items: int
