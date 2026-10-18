from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class GoodsReceiptItem(Base):
    __tablename__ = "goods_receipt_items"
    
    id = Column(Integer, primary_key=True, index=True)
    goods_receipt_id = Column(Integer, ForeignKey("goods_receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    purchase_order_item_id = Column(Integer, ForeignKey("purchase_order_items.id", ondelete="CASCADE"), nullable=False, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity_received = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False, default=0.0)
    batch_lot_number = Column(String(100), nullable=True)
    condition_notes = Column(String(255), default="Good Condition", nullable=False)
    
    goods_receipt = relationship("GoodsReceipt", back_populates="items")
    item = relationship("Inventory")
    po_item = relationship("PurchaseOrderItem")
