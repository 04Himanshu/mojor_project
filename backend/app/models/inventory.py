from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, index=True)
    quantity = Column(Integer, default=0)
    price = Column(Float)
    low_stock_threshold = Column(Integer, default=5)
