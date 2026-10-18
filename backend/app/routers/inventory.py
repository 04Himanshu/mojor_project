from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.permissions import require_roles
from app.schemas.inventory import (
    InventoryCreate, 
    InventoryUpdate, 
    InventoryResponse, 
    PaginatedInventoryResponse,
    StockInRequest, 
    StockOutRequest, 
    StockAdjustmentRequest,
    StockMovementResponse,
    PaginatedMovementsResponse,
    InventorySummaryStats
)
from app.services import inventory_service
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=PaginatedInventoryResponse)
def list_inventory(
    search: Optional[str] = Query(None, description="Search by product name, SKU or category"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by stock status (ALL, IN_STOCK, LOW_STOCK, OUT_OF_STOCK, INACTIVE)"),
    sort_by: str = Query("id", description="Field to sort by (name, sku, category, quantity, unit_price, stock_value, status, created_at)"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """1. Inventory List - Search, filter, sort and paginate."""
    return inventory_service.get_inventory_items(
        db=db,
        search=search,
        category=category,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )

@router.get("/stats", response_model=InventorySummaryStats)
def get_inventory_statistics(db: Session = Depends(get_db)):
    """Summary metrics: total SKUs, valuation, in-stock, low-stock, out-of-stock counts."""
    return inventory_service.get_inventory_stats(db)

@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    """List distinct inventory categories."""
    stats = inventory_service.get_inventory_stats(db)
    return stats["categories"]

@router.get("/alerts/low-stock", response_model=List[InventoryResponse])
def get_replenishment_alerts(db: Session = Depends(get_db)):
    """4. Stock Monitoring - Retrieve items requiring replenishment."""
    return inventory_service.get_low_stock_alerts(db)

@router.get("/movements/all", response_model=PaginatedMovementsResponse)
def get_all_stock_movements(
    search: Optional[str] = Query(None, description="Search by item name, SKU, reason, order, or user"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type: STOCK_IN, STOCK_OUT, ADJUSTMENT"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """5. Stock Movement History - Global movements across all items."""
    return inventory_service.get_all_movements(
        db=db,
        search=search,
        transaction_type=transaction_type,
        page=page,
        page_size=page_size
    )

@router.get("/{item_id}", response_model=InventoryResponse)
def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    """View single inventory item details."""
    return inventory_service.get_item_by_id(db, item_id)

@router.post("/", response_model=InventoryResponse, status_code=201)
def create_inventory_item(
    payload: InventoryCreate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_roles(["Admin", "Manager"]))
):
    """
    2. Add new inventory item with unique SKU, pricing, reorder level, and initial stock.
    Rule 6: Restricted to Admin and Manager.
    """
    return inventory_service.create_item(db, payload, user_name=auth["user_name"])

@router.put("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(
    item_id: int, 
    payload: InventoryUpdate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_roles(["Admin", "Manager"]))
):
    """
    2. Edit item details (name, description, category, UOM, prices, reorder level, status).
    Rule 6: Restricted to Admin and Manager.
    """
    return inventory_service.update_item(db, item_id, payload, user_name=auth["user_name"])

@router.delete("/{item_id}")
def delete_inventory_item(
    item_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_roles(["Admin"]))
):
    """
    Delete or deactivate an inventory item.
    Rule 6: Restricted to Admin role only.
    Rule 7: Preserves audit trail if movements exist.
    """
    return inventory_service.delete_item(db, item_id)

@router.post("/{item_id}/stock-in")
def record_stock_in(
    item_id: int, 
    payload: StockInRequest, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_roles(["Admin", "Manager", "Staff"]))
):
    """3. Stock In: record received or added stock and update quantity."""
    user = payload.user_name if payload.user_name and payload.user_name != "Admin User" else auth["user_name"]
    return inventory_service.stock_in(db, item_id, payload, user_name=user)

@router.post("/{item_id}/stock-out")
def record_stock_out(
    item_id: int, 
    payload: StockOutRequest, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_roles(["Admin", "Manager", "Staff"]))
):
    """3. Stock Out: manual removal, prevents stock from becoming negative."""
    user = payload.user_name if payload.user_name and payload.user_name != "Admin User" else auth["user_name"]
    return inventory_service.stock_out(db, item_id, payload, user_name=user)

@router.post("/{item_id}/adjustment")
def record_stock_adjustment(
    item_id: int, 
    payload: StockAdjustmentRequest, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_roles(["Admin", "Manager"]))
):
    """
    3. Stock Adjustment: correct quantities after a physical count.
    Rule 6: Strictly restricted to Admin and Manager roles.
    """
    user = payload.user_name if payload.user_name and payload.user_name != "Admin User" else auth["user_name"]
    return inventory_service.stock_adjustment(db, item_id, payload, user_name=user)

@router.get("/{item_id}/movements", response_model=List[StockMovementResponse])
def get_item_stock_movements(item_id: int, db: Session = Depends(get_db)):
    """5. Stock Movement History for a specific item."""
    return inventory_service.get_item_movements(db, item_id)
