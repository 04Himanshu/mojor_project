from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="India", nullable=False)
    postal_code = Column(String(20), nullable=True)
    gstin = Column(String(50), nullable=True) # Tax ID / GST
    payment_terms = Column(String(50), default="Net 30", nullable=False) # Advance, COD, Net 15, Net 30, Net 60
    bank_name = Column(String(100), nullable=True)
    bank_account = Column(String(100), nullable=True)
    bank_ifsc = Column(String(50), nullable=True)
    rating = Column(Float, default=5.0, nullable=False) # 1.0 - 5.0
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier", cascade="all, delete-orphan")
    goods_receipts = relationship("GoodsReceipt", back_populates="supplier")
