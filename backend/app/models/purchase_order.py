from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(100), unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Staff/procurement manager who placed it
    order_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    expected_delivery_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="Draft", nullable=False, index=True) # Draft, Issued, Partially Received, Received, Cancelled
    payment_status = Column(String(50), default="Unpaid", nullable=False) # Unpaid, Partially Paid, Paid
    payment_terms = Column(String(50), default="Net 30", nullable=False)
    notes = Column(Text, nullable=True)
    shipping_address = Column(String(255), nullable=True)
    
    # Financial breakdown
    subtotal = Column(Float, default=0.0, nullable=False)
    tax_rate = Column(Float, default=0.0, nullable=False) # e.g. 0.18 for 18%
    tax_amount = Column(Float, default=0.0, nullable=False)
    shipping_cost = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    
    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    goods_receipts = relationship("GoodsReceipt", back_populates="purchase_order", cascade="all, delete-orphan")
    user = relationship("User")
