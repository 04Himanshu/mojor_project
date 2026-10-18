from sqlalchemy import Column, Integer, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    inventory_id = Column(Integer, ForeignKey("inventory.id"))
    quantity = Column(Integer, nullable=False)
    price_at_time = Column(Float, nullable=False, default=0.0)
    
    order = relationship("Order", back_populates="items")
    item = relationship("Inventory")
