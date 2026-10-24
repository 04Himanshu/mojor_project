from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.dependencies.permissions import require_permission, require_roles
from app.schemas.procurement import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    PurchaseOrderCreate, PurchaseOrderStatusUpdate, PurchaseOrderResponse,
    GoodsReceiptCreate, GoodsReceiptResponse,
    ProcurementStatsResponse
)
from app.services import procurement_service

router = APIRouter()

# ==========================================
# Procurement Analytics / Stats
# ==========================================
@router.get("/stats", response_model=ProcurementStatsResponse)
def get_procurement_statistics(
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("procurement:view"))
):
    """Retrieve high-level procurement KPIs and supplier spend. Requires 'procurement:view'."""
    return procurement_service.get_procurement_stats(db)

# ==========================================
# Suppliers / Vendor Endpoints
# ==========================================
@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("procurement:view"))
):
    """List vendors in directory. Requires 'procurement:view'."""
    return procurement_service.get_suppliers(db, search=search, is_active=is_active, skip=skip, limit=limit)

@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_new_supplier(
    data: SupplierCreate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("suppliers:manage"))
):
    """Register a new supplier profile. Requires 'suppliers:manage'."""
    sup = procurement_service.create_supplier(db, data)
    return procurement_service.get_suppliers(db, search=sup.name)[0]

@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_single_supplier(
    supplier_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("procurement:view"))
):
    """View details for a supplier. Requires 'procurement:view'."""
    sup = procurement_service.get_supplier_by_id(db, supplier_id)
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    resps = procurement_service.get_suppliers(db, search=sup.name)
    for r in resps:
        if r.id == supplier_id:
            return r
    return SupplierResponse.from_orm(sup)

@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_existing_supplier(
    supplier_id: int, 
    data: SupplierUpdate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("suppliers:manage"))
):
    """Update supplier contact, commercial, or banking information. Requires 'suppliers:manage'."""
    updated = procurement_service.update_supplier(db, supplier_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Supplier not found")
    resps = procurement_service.get_suppliers(db, search=updated.name)
    for r in resps:
        if r.id == supplier_id:
            return r
    return SupplierResponse.from_orm(updated)

@router.delete("/suppliers/{supplier_id}")
def delete_supplier_record(
    supplier_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("suppliers:manage"))
):
    """Deactivate or remove a supplier. Requires 'suppliers:manage'."""
    success = procurement_service.delete_supplier(db, supplier_id)
    if not success:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted or deactivated successfully"}

# ==========================================
# Purchase Orders Endpoints
# ==========================================
@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    status: Optional[str] = None,
    supplier_id: Optional[int] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("procurement:view"))
):
    """Retrieve purchase orders list. Requires 'procurement:view'."""
    return procurement_service.get_purchase_orders(
        db, status=status, supplier_id=supplier_id, payment_status=payment_status,
        search=search, skip=skip, limit=limit
    )

@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_new_purchase_order(
    data: PurchaseOrderCreate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("procurement:create_po"))
):
    """Issue a new purchase order to a vendor. Requires 'procurement:create_po'."""
    try:
        return procurement_service.create_purchase_order(db, data, user_id=auth["user_id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
def get_single_purchase_order(
    po_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("procurement:view"))
):
    """Retrieve details and line items for a purchase order. Requires 'procurement:view'."""
    po = procurement_service.get_purchase_order_by_id(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return procurement_service._format_po_response(po)

@router.patch("/purchase-orders/{po_id}/status", response_model=PurchaseOrderResponse)
def update_po_status(
    po_id: int, 
    data: PurchaseOrderStatusUpdate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("procurement:create_po"))
):
    """Update purchase order status or payment terms. Requires 'procurement:create_po'."""
    updated = procurement_service.update_purchase_order_status(db, po_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return updated

# ==========================================
# Goods Receipt Note (GRN) Endpoints
# ==========================================
@router.get("/goods-receipts", response_model=List[GoodsReceiptResponse])
def list_goods_receipts(
    po_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("procurement:view"))
):
    """View Goods Received Notes (GRN) history. Requires 'procurement:view'."""
    return procurement_service.get_goods_receipts(db, po_id=po_id, supplier_id=supplier_id, skip=skip, limit=limit)

@router.post("/goods-receipts", response_model=GoodsReceiptResponse, status_code=status.HTTP_201_CREATED)
def receive_goods_and_inward_stock(
    data: GoodsReceiptCreate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("procurement:grn_receive"))
):
    """Inspect and receive inbound items into warehouse stock. Requires 'procurement:grn_receive'."""
    try:
        if not data.received_by or data.received_by == "Admin User":
            data.received_by = auth["user_name"]
        return procurement_service.receive_goods(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
