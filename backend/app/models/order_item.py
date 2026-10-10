from sqlalchemy import Column, Integer, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    inventory_id = Column(Integer, ForeignKey("inventory.id"))
    quantity = Column(Integer)
    price_at_time = Column(Float)
    
    order = relationship("Order", back_populates="items")
