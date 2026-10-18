from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    grn_number = Column(String(100), unique=True, index=True, nullable=False) # e.g. GRN-2026-0001
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    received_by = Column(String(100), default="Admin User", nullable=False)
    received_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    carrier = Column(String(100), nullable=True) # Shipping carrier / transporter
    tracking_number = Column(String(100), nullable=True)
    delivery_challan_number = Column(String(100), nullable=True) # Supplier DC / bill number
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    purchase_order = relationship("PurchaseOrder", back_populates="goods_receipts")
    supplier = relationship("Supplier", back_populates="goods_receipts")
    items = relationship("GoodsReceiptItem", back_populates="goods_receipt", cascade="all, delete-orphan")
