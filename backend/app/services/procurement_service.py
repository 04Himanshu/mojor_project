from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from typing import List, Optional
from datetime import datetime

from app.models.supplier import Supplier
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.goods_receipt import GoodsReceipt
from app.models.goods_receipt_item import GoodsReceiptItem
from app.models.inventory import Inventory
from app.models.stock_movement import StockMovement
from app.schemas.procurement import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    PurchaseOrderCreate, PurchaseOrderStatusUpdate, PurchaseOrderResponse, PurchaseOrderItemResponse,
    GoodsReceiptCreate, GoodsReceiptResponse, GoodsReceiptItemResponse,
    ProcurementStatsResponse
)

# ==========================================
# Supplier Services
# ==========================================
def get_suppliers(
    db: Session,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[SupplierResponse]:
    query = db.query(Supplier)
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Supplier.name.ilike(s),
                Supplier.contact_person.ilike(s),
                Supplier.email.ilike(s),
                Supplier.city.ilike(s),
                Supplier.gstin.ilike(s)
            )
        )
    
    suppliers = query.order_by(Supplier.name.asc()).offset(skip).limit(limit).all()
    results = []
    for sup in suppliers:
        # Calculate stats for supplier
        po_query = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == sup.id)
        total_orders = po_query.count()
        total_spend = db.query(func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0))\
            .filter(PurchaseOrder.supplier_id == sup.id, PurchaseOrder.status != "Cancelled").scalar()
        open_orders = po_query.filter(PurchaseOrder.status.in_(["Draft", "Issued", "Partially Received"])).count()

        resp = SupplierResponse.from_orm(sup)
        resp.total_orders = total_orders
        resp.total_spend = round(float(total_spend), 2)
        resp.open_orders = open_orders
        results.append(resp)
    return results

def get_supplier_by_id(db: Session, supplier_id: int) -> Optional[Supplier]:
    return db.query(Supplier).filter(Supplier.id == supplier_id).first()

def create_supplier(db: Session, data: SupplierCreate) -> Supplier:
    sup = Supplier(
        name=data.name.strip(),
        contact_person=data.contact_person.strip() if data.contact_person else None,
        email=data.email.strip() if data.email else None,
        phone=data.phone.strip() if data.phone else None,
        address=data.address.strip() if data.address else None,
        city=data.city.strip() if data.city else None,
        state=data.state.strip() if data.state else None,
        country=data.country or "India",
        postal_code=data.postal_code.strip() if data.postal_code else None,
        gstin=data.gstin.strip().upper() if data.gstin else None,
        payment_terms=data.payment_terms or "Net 30",
        bank_name=data.bank_name.strip() if data.bank_name else None,
        bank_account=data.bank_account.strip() if data.bank_account else None,
        bank_ifsc=data.bank_ifsc.strip().upper() if data.bank_ifsc else None,
        rating=data.rating if data.rating is not None else 5.0,
        notes=data.notes,
        is_active=data.is_active if data.is_active is not None else True
    )
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return sup

def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate) -> Optional[Supplier]:
    sup = get_supplier_by_id(db, supplier_id)
    if not sup:
        return None
    update_data = data.dict(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None and isinstance(val, str):
            val = val.strip()
            if field == "gstin" or field == "bank_ifsc":
                val = val.upper()
        setattr(sup, field, val)
    db.commit()
    db.refresh(sup)
    return sup

def delete_supplier(db: Session, supplier_id: int) -> bool:
    sup = get_supplier_by_id(db, supplier_id)
    if not sup:
        return False
    # Check if supplier has purchase orders
    has_pos = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == supplier_id).count() > 0
    if has_pos:
        # Soft delete by deactivating
        sup.is_active = False
        db.commit()
    else:
        db.delete(sup)
        db.commit()
    return True

# ==========================================
# Purchase Order Services
# ==========================================
def generate_po_number(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"PO-{year}-"
    last_po = db.query(PurchaseOrder)\
        .filter(PurchaseOrder.po_number.like(f"{prefix}%"))\
        .order_by(desc(PurchaseOrder.id))\
        .first()
    if last_po and last_po.po_number:
        try:
            seq = int(last_po.po_number.split("-")[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"

def _format_po_response(po: PurchaseOrder) -> PurchaseOrderResponse:
    item_responses = []
    for it in po.items:
        item_responses.append(PurchaseOrderItemResponse(
            id=it.id,
            purchase_order_id=it.purchase_order_id,
            inventory_id=it.inventory_id,
            item_name=it.item.name if it.item else "Unknown Item",
            item_sku=it.item.sku if it.item else "N/A",
            unit_of_measurement=it.item.unit_of_measurement if it.item else "pcs",
            quantity_ordered=it.quantity_ordered,
            quantity_received=it.quantity_received,
            unit_cost=it.unit_cost,
            total_cost=it.total_cost,
            pending_quantity=max(0, it.quantity_ordered - it.quantity_received)
        ))

    return PurchaseOrderResponse(
        id=po.id,
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        supplier_name=po.supplier.name if po.supplier else "Unknown Supplier",
        supplier_contact=po.supplier.contact_person if po.supplier else None,
        supplier_email=po.supplier.email if po.supplier else None,
        supplier_phone=po.supplier.phone if po.supplier else None,
        supplier_gstin=po.supplier.gstin if po.supplier else None,
        user_id=po.user_id,
        user_name=po.user.username if po.user else "Admin User",
        order_date=po.order_date,
        expected_delivery_date=po.expected_delivery_date,
        status=po.status,
        payment_status=po.payment_status,
        payment_terms=po.payment_terms or (po.supplier.payment_terms if po.supplier else "Net 30"),
        notes=po.notes,
        shipping_address=po.shipping_address,
        subtotal=po.subtotal,
        tax_rate=po.tax_rate,
        tax_amount=po.tax_amount,
        shipping_cost=po.shipping_cost,
        total_amount=po.total_amount,
        items=item_responses,
        created_at=po.created_at,
        updated_at=po.updated_at
    )

def get_purchase_orders(
    db: Session,
    status: Optional[str] = None,
    supplier_id: Optional[int] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[PurchaseOrderResponse]:
    query = db.query(PurchaseOrder)
    if status and status.upper() != "ALL":
        query = query.filter(PurchaseOrder.status == status)
    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    if payment_status and payment_status.upper() != "ALL":
        query = query.filter(PurchaseOrder.payment_status == payment_status)
    if search:
        s = f"%{search.strip()}%"
        query = query.join(Supplier, isouter=True).filter(
            or_(
                PurchaseOrder.po_number.ilike(s),
                PurchaseOrder.notes.ilike(s),
                Supplier.name.ilike(s)
            )
        )

    pos = query.order_by(desc(PurchaseOrder.created_at)).offset(skip).limit(limit).all()
    return [_format_po_response(po) for po in pos]

def get_purchase_order_by_id(db: Session, po_id: int) -> Optional[PurchaseOrder]:
    return db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()

def create_purchase_order(db: Session, data: PurchaseOrderCreate, user_id: Optional[int] = None) -> PurchaseOrderResponse:
    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise ValueError(f"Supplier with ID {data.supplier_id} not found.")

    po_number = generate_po_number(db)
    
    # Calculate costs
    subtotal = 0.0
    po_items_to_add = []
    for item_data in data.items:
        inv = db.query(Inventory).filter(Inventory.id == item_data.inventory_id).first()
        if not inv:
            raise ValueError(f"Inventory item ID {item_data.inventory_id} not found.")
        
        line_cost = round(item_data.quantity_ordered * item_data.unit_cost, 2)
        subtotal += line_cost
        
        po_items_to_add.append(PurchaseOrderItem(
            inventory_id=item_data.inventory_id,
            quantity_ordered=item_data.quantity_ordered,
            quantity_received=0,
            unit_cost=item_data.unit_cost,
            total_cost=line_cost
        ))

    tax_rate = data.tax_rate if data.tax_rate is not None else 0.0
    tax_amount = round(subtotal * tax_rate, 2)
    shipping_cost = data.shipping_cost if data.shipping_cost is not None else 0.0
    total_amount = round(subtotal + tax_amount + shipping_cost, 2)

    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=data.supplier_id,
        user_id=user_id,
        order_date=data.order_date or datetime.utcnow(),
        expected_delivery_date=data.expected_delivery_date,
        status=data.status or "Draft",
        payment_status=data.payment_status or "Unpaid",
        payment_terms=data.payment_terms or supplier.payment_terms,
        notes=data.notes,
        shipping_address=data.shipping_address or "Main Central Warehouse, Dock 4",
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        shipping_cost=shipping_cost,
        total_amount=total_amount
    )
    po.items = po_items_to_add
    db.add(po)
    db.commit()
    db.refresh(po)
    return _format_po_response(po)

def update_purchase_order_status(db: Session, po_id: int, data: PurchaseOrderStatusUpdate) -> Optional[PurchaseOrderResponse]:
    po = get_purchase_order_by_id(db, po_id)
    if not po:
        return None
    if data.status:
        po.status = data.status
    if data.payment_status:
        po.payment_status = data.payment_status
    if data.notes:
        po.notes = data.notes
    db.commit()
    db.refresh(po)
    return _format_po_response(po)

# ==========================================
# Goods Receipt Note (GRN) & Stock Inward
# ==========================================
def generate_grn_number(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"GRN-{year}-"
    last_grn = db.query(GoodsReceipt)\
        .filter(GoodsReceipt.grn_number.like(f"{prefix}%"))\
        .order_by(desc(GoodsReceipt.id))\
        .first()
    if last_grn and last_grn.grn_number:
        try:
            seq = int(last_grn.grn_number.split("-")[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"

def receive_goods(db: Session, data: GoodsReceiptCreate) -> GoodsReceiptResponse:
    po = get_purchase_order_by_id(db, data.purchase_order_id)
    if not po:
        raise ValueError(f"Purchase Order with ID {data.purchase_order_id} does not exist.")
    if po.status == "Cancelled":
        raise ValueError("Cannot receive goods for a cancelled purchase order.")
    if po.status == "Received":
        raise ValueError("This purchase order is already marked fully received.")

    grn_number = generate_grn_number(db)
    grn = GoodsReceipt(
        grn_number=grn_number,
        purchase_order_id=po.id,
        supplier_id=po.supplier_id,
        received_by=data.received_by or "Admin User",
        received_date=datetime.utcnow(),
        carrier=data.carrier,
        tracking_number=data.tracking_number,
        delivery_challan_number=data.delivery_challan_number,
        notes=data.notes
    )

    po_items_map = {item.id: item for item in po.items}
    grn_items = []

    for grn_item_data in data.items:
        po_item = po_items_map.get(grn_item_data.purchase_order_item_id)
        if not po_item:
            raise ValueError(f"Purchase order item {grn_item_data.purchase_order_item_id} not part of this order.")
        
        remaining_qty = po_item.quantity_ordered - po_item.quantity_received
        if grn_item_data.quantity_received > remaining_qty:
            raise ValueError(
                f"Received quantity ({grn_item_data.quantity_received}) exceeds remaining ordered quantity "
                f"({remaining_qty}) for item '{po_item.item.name if po_item.item else 'SKU'}''."
            )

        # 1. Update PO item received quantity
        po_item.quantity_received += grn_item_data.quantity_received

        # 2. Inward stock into inventory (increments physical quantity)
        inv = db.query(Inventory).filter(Inventory.id == po_item.inventory_id).first()
        if not inv:
            raise ValueError(f"Inventory item {po_item.inventory_id} not found.")

        prev_qty = inv.quantity
        inv.quantity += grn_item_data.quantity_received
        
        # 3. Update inventory cost price to latest purchase cost (per user requirement A1)
        if po_item.unit_cost > 0:
            inv.cost_price = po_item.unit_cost

        # 4. Log detailed StockMovement record
        movement = StockMovement(
            inventory_id=inv.id,
            transaction_type="STOCK_IN",
            quantity=grn_item_data.quantity_received,
            previous_quantity=prev_qty,
            resulting_quantity=inv.quantity,
            reason=f"Goods Received (GRN #{grn_number}) for PO #{po.po_number}",
            reference_order=po.po_number,
            user_name=data.received_by or "Admin User",
            created_at=datetime.utcnow()
        )
        db.add(movement)

        # 5. Build GRN item
        grn_items.append(GoodsReceiptItem(
            purchase_order_item_id=po_item.id,
            inventory_id=inv.id,
            quantity_received=grn_item_data.quantity_received,
            unit_cost=po_item.unit_cost,
            batch_lot_number=grn_item_data.batch_lot_number,
            condition_notes=grn_item_data.condition_notes or "Good Condition"
        ))

    grn.items = grn_items
    db.add(grn)

    # 6. Recalculate PO overall status
    all_fully_received = all(it.quantity_received >= it.quantity_ordered for it in po.items)
    any_received = any(it.quantity_received > 0 for it in po.items)

    if all_fully_received:
        po.status = "Received"
    elif any_received:
        po.status = "Partially Received"

    db.commit()
    db.refresh(grn)

    # Return formatted response
    item_resps = []
    for gi in grn.items:
        item_resps.append(GoodsReceiptItemResponse(
            id=gi.id,
            purchase_order_item_id=gi.purchase_order_item_id,
            inventory_id=gi.inventory_id,
            item_name=gi.item.name if gi.item else "Unknown Item",
            item_sku=gi.item.sku if gi.item else "N/A",
            unit_of_measurement=gi.item.unit_of_measurement if gi.item else "pcs",
            quantity_received=gi.quantity_received,
            unit_cost=gi.unit_cost,
            batch_lot_number=gi.batch_lot_number,
            condition_notes=gi.condition_notes
        ))

    return GoodsReceiptResponse(
        id=grn.id,
        grn_number=grn.grn_number,
        purchase_order_id=grn.purchase_order_id,
        po_number=po.po_number,
        supplier_id=grn.supplier_id,
        supplier_name=grn.supplier.name if grn.supplier else "Unknown Supplier",
        received_by=grn.received_by,
        received_date=grn.received_date,
        carrier=grn.carrier,
        tracking_number=grn.tracking_number,
        delivery_challan_number=grn.delivery_challan_number,
        notes=grn.notes,
        created_at=grn.created_at,
        items=item_resps
    )

def get_goods_receipts(
    db: Session,
    po_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> List[GoodsReceiptResponse]:
    query = db.query(GoodsReceipt)
    if po_id:
        query = query.filter(GoodsReceipt.purchase_order_id == po_id)
    if supplier_id:
        query = query.filter(GoodsReceipt.supplier_id == supplier_id)

    grns = query.order_by(desc(GoodsReceipt.received_date)).offset(skip).limit(limit).all()
    results = []
    for grn in grns:
        item_resps = [
            GoodsReceiptItemResponse(
                id=gi.id,
                purchase_order_item_id=gi.purchase_order_item_id,
                inventory_id=gi.inventory_id,
                item_name=gi.item.name if gi.item else "Unknown Item",
                item_sku=gi.item.sku if gi.item else "N/A",
                unit_of_measurement=gi.item.unit_of_measurement if gi.item else "pcs",
                quantity_received=gi.quantity_received,
                unit_cost=gi.unit_cost,
                batch_lot_number=gi.batch_lot_number,
                condition_notes=gi.condition_notes
            )
            for gi in grn.items
        ]
        results.append(GoodsReceiptResponse(
            id=grn.id,
            grn_number=grn.grn_number,
            purchase_order_id=grn.purchase_order_id,
            po_number=grn.purchase_order.po_number if grn.purchase_order else "N/A",
            supplier_id=grn.supplier_id,
            supplier_name=grn.supplier.name if grn.supplier else "Unknown Supplier",
            received_by=grn.received_by,
            received_date=grn.received_date,
            carrier=grn.carrier,
            tracking_number=grn.tracking_number,
            delivery_challan_number=grn.delivery_challan_number,
            notes=grn.notes,
            created_at=grn.created_at,
            items=item_resps
        ))
    return results

# ==========================================
# Procurement Stats & Analytics
# ==========================================
def get_procurement_stats(db: Session) -> ProcurementStatsResponse:
    total_spend = db.query(func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0))\
        .filter(PurchaseOrder.status.in_(["Issued", "Partially Received", "Received"])).scalar()
    
    active_suppliers = db.query(Supplier).filter(Supplier.is_active == True).count()
    open_pos = db.query(PurchaseOrder).filter(PurchaseOrder.status.in_(["Draft", "Issued", "Partially Received"])).count()
    grn_count = db.query(GoodsReceipt).count()
    
    items_inwarded = db.query(func.coalesce(func.sum(GoodsReceiptItem.quantity_received), 0)).scalar()

    return ProcurementStatsResponse(
        total_procurement_spend=round(float(total_spend), 2),
        active_suppliers_count=active_suppliers,
        open_po_count=open_pos,
        goods_received_count=grn_count,
        items_inwarded_total=int(items_inwarded)
    )

# ==========================================
# Seed Default Procurement Data
# ==========================================
def seed_default_procurement_data_if_empty(db: Session):
    if db.query(Supplier).count() > 0:
        return

    default_suppliers = [
        Supplier(
            name="Apex MicroTech Components Ltd",
            contact_person="Rajesh Sharma",
            email="rajesh@apexmicrotech.com",
            phone="+91 98201 44552",
            address="Plot 42, Electronic City Phase 1",
            city="Bengaluru",
            state="Karnataka",
            country="India",
            postal_code="560100",
            gstin="29AAACA1234F1Z8",
            payment_terms="Net 30",
            bank_name="HDFC Bank",
            bank_account="50200012345678",
            bank_ifsc="HDFC0000123",
            rating=4.9,
            notes="Primary OEM tier-1 supplier for motherboards and processors."
        ),
        Supplier(
            name="Titan Industrial Hardware Pvt Ltd",
            contact_person="Priya Nair",
            email="priya@titanhardware.in",
            phone="+91 98450 78912",
            address="77 MIDC Industrial Area, Andheri East",
            city="Mumbai",
            state="Maharashtra",
            country="India",
            postal_code="400093",
            gstin="27AAACT9876E1Z5",
            payment_terms="Net 15",
            bank_name="State Bank of India",
            bank_account="301122334455",
            bank_ifsc="SBIN0001234",
            rating=4.8,
            notes="Reliable supplier of steel casings, chassis, and cooling systems."
        ),
        Supplier(
            name="Quantum Display & Optical Solutions",
            contact_person="Amitabh Sengupta",
            email="orders@quantumdisplay.com",
            phone="+91 97112 34567",
            address="Sector 62, Noida Logistics Hub",
            city="Noida",
            state="Uttar Pradesh",
            country="India",
            postal_code="201301",
            gstin="09AAACQ4567D1Z2",
            payment_terms="Net 30",
            bank_name="ICICI Bank",
            bank_account="001105009876",
            bank_ifsc="ICIC0000011",
            rating=4.7,
            notes="High grade 4K panels, optical sensors, and micro-LED components."
        ),
        Supplier(
            name="Sterling Power & Battery Systems",
            contact_person="Deepa Pillai",
            email="deepa@sterlingpower.co.in",
            phone="+91 94441 55667",
            address="Guindy Industrial Estate",
            city="Chennai",
            state="Tamil Nadu",
            country="India",
            postal_code="600032",
            gstin="33AAACS3344B1Z9",
            payment_terms="Advance",
            bank_name="Axis Bank",
            bank_account="912010044556677",
            bank_ifsc="UTIB0000234",
            rating=4.6,
            notes="Heavy duty power supplies (PSUs), lithium battery packs, and cables."
        )
    ]
    for s in default_suppliers:
        db.add(s)
    db.commit()

    # Seed sample PO and sample GRN if inventory items exist
    items = db.query(Inventory).limit(3).all()
    if len(items) >= 2:
        sup = db.query(Supplier).first()
        po_number = generate_po_number(db)
        po = PurchaseOrder(
            po_number=po_number,
            supplier_id=sup.id,
            order_date=datetime.utcnow(),
            expected_delivery_date=datetime.utcnow(),
            status="Partially Received",
            payment_status="Partially Paid",
            payment_terms="Net 30",
            notes="Urgent replenishment for low stock production run",
            shipping_address="Main Central Warehouse, Dock 4",
            subtotal=round(items[0].cost_price * 10 + items[1].cost_price * 5, 2),
            tax_rate=0.18,
            tax_amount=round((items[0].cost_price * 10 + items[1].cost_price * 5) * 0.18, 2),
            shipping_cost=500.0,
            total_amount=round((items[0].cost_price * 10 + items[1].cost_price * 5) * 1.18 + 500.0, 2)
        )
        po.items = [
            PurchaseOrderItem(
                inventory_id=items[0].id,
                quantity_ordered=10,
                quantity_received=6, # Partially received
                unit_cost=items[0].cost_price,
                total_cost=round(items[0].cost_price * 10, 2)
            ),
            PurchaseOrderItem(
                inventory_id=items[1].id,
                quantity_ordered=5,
                quantity_received=0,
                unit_cost=items[1].cost_price,
                total_cost=round(items[1].cost_price * 5, 2)
            )
        ]
        db.add(po)
        db.commit()
        db.refresh(po)

        # Create a sample GRN for the 6 items received
        grn_number = generate_grn_number(db)
        grn = GoodsReceipt(
            grn_number=grn_number,
            purchase_order_id=po.id,
            supplier_id=sup.id,
            received_by="Admin User",
            received_date=datetime.utcnow(),
            carrier="Blue Dart Express",
            tracking_number="BD-99881122",
            delivery_challan_number="DC-2026-441",
            notes="Inspected and verified batch quality"
        )
        grn.items = [
            GoodsReceiptItem(
                purchase_order_item_id=po.items[0].id,
                inventory_id=items[0].id,
                quantity_received=6,
                unit_cost=items[0].cost_price,
                batch_lot_number="LOT-2026-A1",
                condition_notes="Good Condition"
            )
        ]
        db.add(grn)
        db.commit()
