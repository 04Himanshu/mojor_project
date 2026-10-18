from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, CheckConstraint
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        CheckConstraint('quantity >= 0', name='ck_inventory_quantity_non_negative'),
        CheckConstraint('cost_price >= 0', name='ck_inventory_cost_price_non_negative'),
        CheckConstraint('selling_price >= 0', name='ck_inventory_selling_price_non_negative'),
        CheckConstraint('reorder_level >= 0', name='ck_inventory_reorder_level_non_negative'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), index=True, nullable=False, default="General")
    unit_of_measurement = Column(String(50), nullable=False, default="pcs")
    cost_price = Column(Float, nullable=False, default=0.0)
    selling_price = Column(Float, nullable=False, default=0.0)
    quantity = Column(Integer, nullable=False, default=0)
    reorder_level = Column(Integer, nullable=False, default=5)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    movements = relationship(
        "StockMovement", 
        back_populates="item", 
        cascade="all, delete-orphan", 
        order_by="desc(StockMovement.created_at)"
    )
