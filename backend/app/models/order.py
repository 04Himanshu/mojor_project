from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Staff who created it
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="Pending", nullable=False) # Pending, Confirmed, Dispatched, Delivered, Cancelled
    stock_deducted = Column(Boolean, default=False, nullable=False)
    shipping_address = Column(String(255), nullable=True)
    notes = Column(String(255), nullable=True)
    payment_status = Column(String(50), default="Unpaid", nullable=False) # Unpaid, Paid, Partially Paid
    payment_method = Column(String(50), default="Cash", nullable=False) # Cash, Card, Bank Transfer, UPI, Credit
    tax_rate = Column(Float, default=0.0, nullable=False) # e.g. 0.18 for 18%
    discount_amount = Column(Float, default=0.0, nullable=False)
    
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    customer = relationship("Customer")
    user = relationship("User")
