from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class StockMovement(Base):
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False)  # "STOCK_IN", "STOCK_OUT", "ADJUSTMENT"
    quantity = Column(Integer, nullable=False)             # Quantity changed (+ or - or count)
    previous_quantity = Column(Integer, nullable=False)
    resulting_quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    reference_order = Column(String(100), nullable=True)   # Linked order or PO/SO number
    user_name = Column(String(100), nullable=False, default="Admin User")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    
    item = relationship("Inventory", back_populates="movements")
