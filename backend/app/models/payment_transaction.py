from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    cf_order_id = Column(String(100), nullable=False, unique=True, index=True)
    cf_payment_id = Column(String(100), nullable=True, index=True)
    payment_session_id = Column(String(255), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    payment_method = Column(String(50), nullable=True) # upi, card, netbanking, etc.
    status = Column(String(50), default="PENDING", nullable=False) # PENDING, SUCCESS, FAILED, USER_DROPPED
    gateway = Column(String(50), default="Cashfree", nullable=False)
    customer_name = Column(String(150), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    customer_email = Column(String(150), nullable=True)
    payment_time = Column(DateTime, nullable=True)
    error_description = Column(String(255), nullable=True)
    raw_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    order = relationship("Order", back_populates="transactions")

