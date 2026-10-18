from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False) # Administrator, Inventory Manager, etc.
    description = Column(String(255), nullable=True)
    color = Column(String(50), default="blue", nullable=False) # Visual badge styling (blue, purple, emerald, etc.)
    permissions = Column(Text, nullable=True) # JSON-encoded list of permission codes
    is_system = Column(Boolean, default=False, nullable=False) # Built-in system roles cannot be deleted
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    
    users = relationship("User", back_populates="role")
