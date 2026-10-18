from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    department = Column(String(100), default="Operations", nullable=False) # Operations, Logistics, Sales, Executive
    status = Column(String(50), default="Active", nullable=False) # Active, Suspended, Inactive
    is_active = Column(Boolean, default=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    avatar_color = Column(String(50), default="blue", nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    
    role = relationship("Role", back_populates="users")
