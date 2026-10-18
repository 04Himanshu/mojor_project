from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime

VALID_PO_STATUSES = ["Draft", "Issued", "Partially Received", "Received", "Cancelled"]
VALID_PO_PAYMENT_STATUSES = ["Unpaid", "Partially Paid", "Paid"]
VALID_PAYMENT_TERMS = ["Advance", "COD", "Net 15", "Net 30", "Net 60"]

# ==========================================
# Supplier Schemas
# ==========================================
class SupplierBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Supplier company or vendor name")
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field("India", max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    gstin: Optional[str] = Field(None, max_length=50, description="GST / Tax Identification Number")
    payment_terms: Optional[str] = Field("Net 30", description="Net 15, Net 30, Net 60, Advance, COD")
    bank_name: Optional[str] = Field(None, max_length=100)
    bank_account: Optional[str] = Field(None, max_length=100)
    bank_ifsc: Optional[str] = Field(None, max_length=50)
    rating: Optional[float] = Field(5.0, ge=1.0, le=5.0)
    notes: Optional[str] = None
    is_active: Optional[bool] = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    gstin: Optional[str] = None
    payment_terms: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    rating: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_orders: int = 0
    total_spend: float = 0.0
    open_orders: int = 0

    class Config:
        from_attributes = True

# ==========================================
# Purchase Order Item Schemas
# ==========================================
class PurchaseOrderItemCreate(BaseModel):
    inventory_id: int = Field(..., gt=0, description="ID of inventory item to purchase")
    quantity_ordered: int = Field(..., gt=0, description="Quantity to purchase")
    unit_cost: float = Field(..., ge=0.0, description="Agreed purchase cost per unit")

class PurchaseOrderItemResponse(BaseModel):
    id: int
    purchase_order_id: int
    inventory_id: int
    item_name: Optional[str] = None
    item_sku: Optional[str] = None
    unit_of_measurement: Optional[str] = "pcs"
    quantity_ordered: int
    quantity_received: int
    unit_cost: float
    total_cost: float
    pending_quantity: int = 0

    class Config:
        from_attributes = True

# ==========================================
# Purchase Order Schemas
# ==========================================
class PurchaseOrderCreate(BaseModel):
    supplier_id: int = Field(..., gt=0, description="Valid supplier ID")
    order_date: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    status: Optional[str] = Field("Draft", description="Draft or Issued")
    payment_status: Optional[str] = Field("Unpaid", description="Unpaid, Partially Paid, Paid")
    payment_terms: Optional[str] = Field("Net 30", description="Payment terms")
    notes: Optional[str] = None
    shipping_address: Optional[str] = None
    tax_rate: Optional[float] = Field(0.0, ge=0.0, le=1.0, description="e.g. 0.18 for 18% GST")
    shipping_cost: Optional[float] = Field(0.0, ge=0.0)
    items: List[PurchaseOrderItemCreate] = Field(..., min_length=1, description="At least one item required")

    @field_validator('items')
    @classmethod
    def validate_unique_items(cls, v: List[PurchaseOrderItemCreate]) -> List[PurchaseOrderItemCreate]:
        if not v:
            raise ValueError("A purchase order must contain at least one item.")
        ids = [item.inventory_id for item in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate item in purchase order. Combine quantities into a single line.")
        return v

class PurchaseOrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip().title()
            if clean not in VALID_PO_STATUSES:
                raise ValueError(f"Invalid PO status '{v}'. Allowed: {', '.join(VALID_PO_STATUSES)}")
            return clean
        return v

class PurchaseOrderResponse(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    supplier_email: Optional[str] = None
    supplier_phone: Optional[str] = None
    supplier_gstin: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = "Admin User"
    order_date: datetime
    expected_delivery_date: Optional[datetime] = None
    status: str
    payment_status: str
    payment_terms: str
    notes: Optional[str] = None
    shipping_address: Optional[str] = None
    subtotal: float
    tax_rate: float
    tax_amount: float
    shipping_cost: float
    total_amount: float
    items: List[PurchaseOrderItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# Goods Receipt (GRN) Schemas
# ==========================================
class GoodsReceiptItemCreate(BaseModel):
    purchase_order_item_id: int = Field(..., gt=0)
    quantity_received: int = Field(..., gt=0, description="Quantity being accepted and inwarded into warehouse")
    batch_lot_number: Optional[str] = None
    condition_notes: Optional[str] = Field("Good Condition", max_length=255)

class GoodsReceiptCreate(BaseModel):
    purchase_order_id: int = Field(..., gt=0)
    received_by: Optional[str] = Field("Admin User", max_length=100)
    carrier: Optional[str] = Field(None, max_length=100)
    tracking_number: Optional[str] = Field(None, max_length=100)
    delivery_challan_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    items: List[GoodsReceiptItemCreate] = Field(..., min_length=1, description="Items to receive")

class GoodsReceiptItemResponse(BaseModel):
    id: int
    purchase_order_item_id: int
    inventory_id: int
    item_name: Optional[str] = None
    item_sku: Optional[str] = None
    unit_of_measurement: Optional[str] = "pcs"
    quantity_received: int
    unit_cost: float
    batch_lot_number: Optional[str] = None
    condition_notes: str

    class Config:
        from_attributes = True

class GoodsReceiptResponse(BaseModel):
    id: int
    grn_number: str
    purchase_order_id: int
    po_number: Optional[str] = None
    supplier_id: int
    supplier_name: Optional[str] = None
    received_by: str
    received_date: datetime
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    delivery_challan_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    items: List[GoodsReceiptItemResponse]

    class Config:
        from_attributes = True

# ==========================================
# Procurement Stats & Analytics
# ==========================================
class ProcurementStatsResponse(BaseModel):
    total_procurement_spend: float
    active_suppliers_count: int
    open_po_count: int
    goods_received_count: int
    items_inwarded_total: int
