from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.order import (
    OrderCreate, 
    OrderStatusUpdate, 
    OrderResponse, 
    OrderStatsResponse, 
    InvoiceDataResponse
)
from app.services import order_service
from app.dependencies.permissions import require_permission
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[OrderResponse])
def list_orders(
    status: Optional[str] = Query(None, description="Filter by status: Completed, Cancelled, etc."),
    search: Optional[str] = Query(None, description="Search by Order ID, Customer name/phone, Staff or Item"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status: Paid, Unpaid, Partially Paid, Refunded"),
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:view"))
):
    """Retrieve all walk-in and counter sales orders with search and filtering. Requires 'orders:view'."""
    return order_service.get_orders(db, status=status, search=search, payment_status=payment_status)

@router.get("/stats", response_model=OrderStatsResponse)
def get_order_stats(
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:view"))
):
    """Retrieve counter sales metrics, revenue, and daily order KPIs. Requires 'orders:view'."""
    return order_service.get_order_stats(db)

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:view"))
):
    """Retrieve details for a single walk-in order. Requires 'orders:view'."""
    return order_service.get_order_by_id(db, order_id)

@router.get("/{order_id}/invoice", response_model=InvoiceDataResponse)
def get_order_invoice(
    order_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:invoice"))
):
    """Generate receipt and tax invoice for a walk-in purchase. Requires 'orders:invoice'."""
    return order_service.get_order_invoice(db, order_id)

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:create"))
):
    """
    Staff creates a walk-in counter sales order for a customer purchasing one or more items.
    Deducts stock immediately upon purchase. Requires 'orders:create'.
    """
    return order_service.create_order(
        db=db,
        payload=payload,
        user_id=auth["user_id"],
        user_name=auth["user_name"]
    )

@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:status_change"))
):
    """Void or update counter order status, restoring stock if cancelled. Requires 'orders:status_change'."""
    return order_service.update_order_status(
        db=db,
        order_id=order_id,
        payload=payload,
        user_name=auth["user_name"]
    )
