from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.permissions import get_current_user
from app.models.user import User
from app.services import dashboard_service
from typing import Dict, Any

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate live operations & sales analytics metrics dynamically from database:
    - Today's sales, revenue, orders, AOV, and units sold
    - Daily revenue trend analysis
    - Top-selling products
    - Payment channel breakdown (Cash, UPI, Card)
    - Sales by category
    - Live recent transactions
    - Inventory stock distribution & low-stock replenishment alerts
    """
    return dashboard_service.get_dashboard_analytics(db)

@router.get("/sales-analytics", response_model=Dict[str, Any])
def get_sales_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dedicated sales analytics endpoint."""
    return dashboard_service.get_dashboard_analytics(db)
