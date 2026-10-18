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
from app.dependencies.permissions import require_roles
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[OrderResponse])
def list_orders(
    status: Optional[str] = Query(None, description="Filter by status: Pending, Confirmed, Dispatched, Delivered, Cancelled"),
    search: Optional[str] = Query(None, description="Search by Order ID, Customer name or Item"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status: Unpaid, Paid, Partially Paid, Refunded"),
    db: Session = Depends(get_db)
):
    """Retrieve all sales orders with search and filtering."""
    return order_service.get_orders(db, status=status, search=search, payment_status=payment_status)

@router.get("/stats", response_model=OrderStatsResponse)
def get_order_stats(db: Session = Depends(get_db)):
    """Retrieve high-level order metrics and sales KPIs."""
    return order_service.get_order_stats(db)

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Retrieve single order details."""
    return order_service.get_order_by_id(db, order_id)

@router.get("/{order_id}/invoice", response_model=InvoiceDataResponse)
def get_order_invoice(order_id: int, db: Session = Depends(get_db)):
    """Generate invoice data for printing or PDF export."""
    return order_service.get_order_invoice(db, order_id)

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_roles(["Admin", "Manager", "Staff"]))
):
    """
    Create a new sales order.
    - Validates active inventory items.
    - Captures current selling price.
    - Records customer and financial details.
    """
    return order_service.create_order(
        db=db,
        payload=payload,
        user_name=auth["user_name"]
    )

@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_roles(["Admin", "Manager"]))
):
    """
    Update order status with automatic stock transitions:
    - Moving to Confirmed / Dispatched locks items and deducts stock (STOCK_OUT).
    - Moving to Cancelled restores previously deducted stock (STOCK_IN).
    - Concurrency row locking prevents overselling.
    """
    return order_service.update_order_status(
        db=db,
        order_id=order_id,
        payload=payload,
        user_name=auth["user_name"]
    )
