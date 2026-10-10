from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    user_id = Column(Integer, ForeignKey("users.id")) # Staff who created it
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="Pending")
    
    items = relationship("OrderItem", back_populates="order")
