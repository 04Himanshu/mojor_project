from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.inventory import Inventory
from app.models.stock_movement import StockMovement
from app.schemas.inventory import (
    InventoryCreate, 
    InventoryUpdate, 
    StockInRequest, 
    StockOutRequest, 
    StockAdjustmentRequest
)
from datetime import datetime
import math

def calculate_status(item: Inventory) -> str:
    if not item.is_active:
        return "Inactive"
    if item.quantity <= 0:
        return "Out of Stock"
    if item.quantity <= item.reorder_level:
        return "Low Stock"
    return "In Stock"

def calculate_stock_value(item: Inventory) -> float:
    base_price = item.cost_price if item.cost_price > 0 else item.selling_price
    return round(float(item.quantity * base_price), 2)

def serialize_item(item: Inventory) -> dict:
    return {
        "id": item.id,
        "sku": item.sku,
        "name": item.name,
        "description": item.description,
        "category": item.category,
        "unit_of_measurement": item.unit_of_measurement,
        "cost_price": float(item.cost_price),
        "selling_price": float(item.selling_price),
        "unit_price": float(item.selling_price),
        "quantity": item.quantity,
        "reorder_level": item.reorder_level,
        "is_active": item.is_active,
        "stock_value": calculate_stock_value(item),
        "status": calculate_status(item),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }

def serialize_movement(mov: StockMovement) -> dict:
    return {
        "id": mov.id,
        "inventory_id": mov.inventory_id,
        "item_name": mov.item.name if mov.item else "Unknown Item",
        "item_sku": mov.item.sku if mov.item else "",
        "transaction_type": mov.transaction_type,
        "quantity": mov.quantity,
        "previous_quantity": mov.previous_quantity,
        "resulting_quantity": mov.resulting_quantity,
        "reason": mov.reason,
        "reference_order": mov.reference_order,
        "user_name": mov.user_name,
        "created_at": mov.created_at
    }

def get_inventory_items(
    db: Session, 
    search: str = None, 
    category: str = None, 
    status: str = None,
    sort_by: str = "id", 
    sort_order: str = "desc", 
    page: int = 1, 
    page_size: int = 10
):
    query = db.query(Inventory)

    # 1. Search by name, SKU or category
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Inventory.name.ilike(search_filter),
                Inventory.sku.ilike(search_filter),
                Inventory.category.ilike(search_filter)
            )
        )

    # 2. Filter by Category
    if category and category.upper() != "ALL":
        query = query.filter(Inventory.category == category)

    all_items = query.all()

    # 3. Filter by Stock Status
    filtered_items = []
    for item in all_items:
        item_status = calculate_status(item)
        if not status or status.upper() == "ALL":
            filtered_items.append(item)
        elif status.upper() in ["IN_STOCK", "IN STOCK"] and item_status == "In Stock":
            filtered_items.append(item)
        elif status.upper() in ["LOW_STOCK", "LOW STOCK"] and item_status == "Low Stock":
            filtered_items.append(item)
        elif status.upper() in ["OUT_OF_STOCK", "OUT OF STOCK"] and item_status == "Out of Stock":
            filtered_items.append(item)
        elif status.upper() in ["INACTIVE"] and item_status == "Inactive":
            filtered_items.append(item)

    # 4. Sort
    is_desc = (sort_order.lower() == "desc")
    def get_sort_key(item: Inventory):
        if sort_by == "name":
            return (item.name or "").lower()
        elif sort_by == "sku":
            return (item.sku or "").lower()
        elif sort_by == "category":
            return (item.category or "").lower()
        elif sort_by == "quantity":
            return item.quantity
        elif sort_by in ["unit_price", "selling_price"]:
            return item.selling_price
        elif sort_by == "cost_price":
            return item.cost_price
        elif sort_by == "stock_value":
            return calculate_stock_value(item)
        elif sort_by == "status":
            return calculate_status(item)
        elif sort_by == "created_at":
            return item.created_at or datetime.min
        return item.id

    filtered_items.sort(key=get_sort_key, reverse=is_desc)

    total = len(filtered_items)
    total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1
    start_idx = (page - 1) * page_size
    paged_items = filtered_items[start_idx : start_idx + page_size]

    return {
        "items": [serialize_item(item) for item in paged_items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

def get_item_by_id(db: Session, item_id: int):
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Inventory item with ID {item_id} not found.")
    return serialize_item(item)

def create_item(db: Session, data: InventoryCreate, user_name: str = "Admin User"):
    # Rule 1 & Rule 8: Reject duplicate SKUs & Validate backend fields
    clean_sku = data.sku.strip().upper()
    existing = db.query(Inventory).filter(func.lower(Inventory.sku) == clean_sku.lower()).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Unique SKU Violation: Item with SKU '{clean_sku}' already exists."
        )

    # Rule 2: Stock validation
    if data.initial_quantity < 0:
        raise HTTPException(status_code=400, detail="Initial stock quantity cannot be negative.")

    try:
        new_item = Inventory(
            sku=clean_sku,
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            category=data.category.strip(),
            unit_of_measurement=data.unit_of_measurement.strip(),
            cost_price=data.cost_price,
            selling_price=data.selling_price,
            quantity=data.initial_quantity,
            reorder_level=data.reorder_level,
            is_active=data.is_active,
            created_at=datetime.utcnow()
        )
        db.add(new_item)
        db.flush()

        # Rule 7: Audit trail - Record initial stock setup movement if quantity > 0
        if data.initial_quantity > 0:
            init_mov = StockMovement(
                inventory_id=new_item.id,
                transaction_type="STOCK_IN",
                quantity=data.initial_quantity,
                previous_quantity=0,
                resulting_quantity=data.initial_quantity,
                reason="Initial Stock Setup",
                user_name=user_name,
                created_at=datetime.utcnow()
            )
            db.add(init_mov)

        # Rule 4: Transaction safety
        db.commit()
        db.refresh(new_item)
        return serialize_item(new_item)

    except IntegrityError as ie:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database integrity constraint violated: {str(ie)}")
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Transaction failed while creating item: {str(exc)}")

def update_item(db: Session, item_id: int, data: InventoryUpdate, user_name: str = "Admin User"):
    # Rule 5: Concurrency locking
    item = db.query(Inventory).filter(Inventory.id == item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    try:
        if data.name is not None:
            item.name = data.name.strip()
        if data.description is not None:
            item.description = data.description.strip() if data.description else None
        if data.category is not None:
            item.category = data.category.strip()
        if data.unit_of_measurement is not None:
            item.unit_of_measurement = data.unit_of_measurement.strip()
        if data.cost_price is not None:
            if data.cost_price < 0:
                raise HTTPException(status_code=400, detail="Cost price cannot be negative.")
            item.cost_price = data.cost_price
        if data.selling_price is not None:
            if data.selling_price < 0:
                raise HTTPException(status_code=400, detail="Selling price cannot be negative.")
            item.selling_price = data.selling_price
        if data.reorder_level is not None:
            if data.reorder_level < 0:
                raise HTTPException(status_code=400, detail="Reorder level cannot be negative.")
            item.reorder_level = data.reorder_level
        if data.is_active is not None:
            item.is_active = data.is_active

        item.updated_at = datetime.utcnow()

        # Rule 4: Transaction safety
        db.commit()
        db.refresh(item)
        return serialize_item(item)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update item: {str(exc)}")

def delete_item(db: Session, item_id: int):
    # Rule 7: Preserve audit trail instead of silently destroying stock history
    item = db.query(Inventory).filter(Inventory.id == item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    movement_count = db.query(StockMovement).filter(StockMovement.inventory_id == item_id).count()

    try:
        if movement_count > 0:
            # Item has audit records: perform soft-deactivation to preserve full audit trail
            item.is_active = False
            item.updated_at = datetime.utcnow()
            
            # Log audit trail deactivation
            deact_mov = StockMovement(
                inventory_id=item.id,
                transaction_type="ADJUSTMENT",
                quantity=0,
                previous_quantity=item.quantity,
                resulting_quantity=item.quantity,
                reason="Item Deactivated (Audit Trail Preserved)",
                user_name="Admin User",
                created_at=datetime.utcnow()
            )
            db.add(deact_mov)
            db.commit()
            return {"message": f"Item '{item.name}' ({item.sku}) has historical stock movements. It has been deactivated to preserve audit compliance."}
        else:
            # No movements recorded: safe to delete physically
            db.delete(item)
            db.commit()
            return {"message": f"Item '{item.name}' ({item.sku}) deleted successfully."}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Transaction failed during item deletion: {str(exc)}")

def stock_in(db: Session, item_id: int, req: StockInRequest, user_name: str = "Admin User"):
    # Rule 8: Validation
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Stock In quantity must be strictly greater than zero.")

    # Rule 5: Concurrency locking (Pessimistic row lock with_for_update)
    item = db.query(Inventory).filter(Inventory.id == item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    prev_qty = item.quantity
    new_qty = prev_qty + req.quantity

    try:
        # Update stock
        item.quantity = new_qty
        item.updated_at = datetime.utcnow()

        # Rule 7: Record audit trail movement
        movement = StockMovement(
            inventory_id=item.id,
            transaction_type="STOCK_IN",
            quantity=req.quantity,
            previous_quantity=prev_qty,
            resulting_quantity=new_qty,
            reason=req.reason.strip(),
            reference_order=req.reference_order.strip() if req.reference_order else None,
            user_name=req.user_name or user_name,
            created_at=datetime.utcnow()
        )
        db.add(movement)

        # Rule 4: Transaction safety
        db.commit()
        db.refresh(item)

        return {
            "item": serialize_item(item),
            "movement": serialize_movement(movement)
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Stock In transaction failed: {str(exc)}")

def stock_out(db: Session, item_id: int, req: StockOutRequest, user_name: str = "Admin User"):
    # Rule 8: Validation
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Stock Out quantity must be strictly greater than zero.")

    # Rule 5: Concurrency locking (Pessimistic row lock with_for_update)
    # Prevents two concurrent users from removing the same available stock
    item = db.query(Inventory).filter(Inventory.id == item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    # Rule 2: Stock validation - Never allow negative stock
    if req.quantity > item.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Stock Validation Error: Insufficient stock. Cannot remove {req.quantity} units. Only {item.quantity} {item.unit_of_measurement} available."
        )

    prev_qty = item.quantity
    new_qty = prev_qty - req.quantity

    try:
        item.quantity = new_qty
        item.updated_at = datetime.utcnow()

        # Rule 7: Record audit trail movement
        movement = StockMovement(
            inventory_id=item.id,
            transaction_type="STOCK_OUT",
            quantity=req.quantity,
            previous_quantity=prev_qty,
            resulting_quantity=new_qty,
            reason=req.reason.strip(),
            reference_order=req.reference_order.strip() if req.reference_order else None,
            user_name=req.user_name or user_name,
            created_at=datetime.utcnow()
        )
        db.add(movement)

        # Rule 4: Transaction safety
        db.commit()
        db.refresh(item)

        return {
            "item": serialize_item(item),
            "movement": serialize_movement(movement)
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Stock Out transaction failed: {str(exc)}")

def stock_adjustment(db: Session, item_id: int, req: StockAdjustmentRequest, user_name: str = "Admin User"):
    # Rule 2: Stock validation
    if req.new_quantity < 0:
        raise HTTPException(status_code=400, detail="Adjusted physical quantity cannot be negative.")

    # Rule 5: Concurrency locking (Pessimistic row lock with_for_update)
    item = db.query(Inventory).filter(Inventory.id == item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    prev_qty = item.quantity
    new_qty = req.new_quantity
    delta = new_qty - prev_qty

    try:
        item.quantity = new_qty
        item.updated_at = datetime.utcnow()

        # Rule 7: Record audit trail movement
        movement = StockMovement(
            inventory_id=item.id,
            transaction_type="ADJUSTMENT",
            quantity=delta,
            previous_quantity=prev_qty,
            resulting_quantity=new_qty,
            reason=req.reason.strip(),
            reference_order=req.reference_order.strip() if req.reference_order else None,
            user_name=req.user_name or user_name,
            created_at=datetime.utcnow()
        )
        db.add(movement)

        # Rule 4: Transaction safety
        db.commit()
        db.refresh(item)

        return {
            "item": serialize_item(item),
            "movement": serialize_movement(movement)
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Adjustment transaction failed: {str(exc)}")

def get_item_movements(db: Session, item_id: int):
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    movements = db.query(StockMovement).filter(
        StockMovement.inventory_id == item_id
    ).order_by(desc(StockMovement.created_at)).all()

    return [serialize_movement(m) for m in movements]

def get_all_movements(
    db: Session, 
    search: str = None, 
    transaction_type: str = None, 
    page: int = 1, 
    page_size: int = 20
):
    query = db.query(StockMovement).join(Inventory)

    if transaction_type and transaction_type.upper() != "ALL":
        query = query.filter(StockMovement.transaction_type == transaction_type.upper())

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Inventory.name.ilike(search_filter),
                Inventory.sku.ilike(search_filter),
                StockMovement.reason.ilike(search_filter),
                StockMovement.reference_order.ilike(search_filter),
                StockMovement.user_name.ilike(search_filter)
            )
        )

    query = query.order_by(desc(StockMovement.created_at))
    total = query.count()
    total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1
    
    start_idx = (page - 1) * page_size
    movements = query.offset(start_idx).limit(page_size).all()

    return {
        "movements": [serialize_movement(m) for m in movements],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

def get_inventory_stats(db: Session):
    items = db.query(Inventory).all()
    total_skus = len(items)
    total_stock_value = sum(calculate_stock_value(item) for item in items if item.is_active)
    
    in_stock_count = 0
    low_stock_count = 0
    out_of_stock_count = 0
    inactive_count = 0
    categories = set()

    for item in items:
        if item.category:
            categories.add(item.category)
        status = calculate_status(item)
        if status == "In Stock":
            in_stock_count += 1
        elif status == "Low Stock":
            low_stock_count += 1
        elif status == "Out of Stock":
            out_of_stock_count += 1
        elif status == "Inactive":
            inactive_count += 1

    return {
        "total_skus": total_skus,
        "total_stock_value": round(total_stock_value, 2),
        "in_stock_count": in_stock_count,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "inactive_count": inactive_count,
        "categories": sorted(list(categories))
    }

def get_low_stock_alerts(db: Session):
    items = db.query(Inventory).filter(
        Inventory.is_active == True,
        Inventory.quantity <= Inventory.reorder_level
    ).order_by(asc(Inventory.quantity)).all()

    return [serialize_item(item) for item in items]

def seed_default_data_if_empty(db: Session):
    count = db.query(Inventory).count()
    if count > 0:
        return

    sample_items = [
        {
            "sku": "DESK-L01",
            "name": "Corner Executive Desk",
            "description": "Ergonomic L-shaped wooden executive office desk with cable organizer",
            "category": "Furniture",
            "unit_of_measurement": "units",
            "cost_price": 12500.0,
            "selling_price": 18999.0,
            "quantity": 14,
            "reorder_level": 5,
            "is_active": True,
            "movements": [
                {"type": "STOCK_IN", "qty": 20, "prev": 0, "res": 20, "reason": "Initial Purchase Order", "ref": "PO-1001", "user": "Admin User"},
                {"type": "STOCK_OUT", "qty": 6, "prev": 20, "res": 14, "reason": "Client Office Furnishing", "ref": "SO-2041", "user": "Admin User"}
            ]
        },
        {
            "sku": "CHAIR-ERG02",
            "name": "High-Back Mesh Chair",
            "description": "Breathable mesh ergonomic desk chair with lumbar support",
            "category": "Furniture",
            "unit_of_measurement": "units",
            "cost_price": 4200.0,
            "selling_price": 6800.0,
            "quantity": 4,
            "reorder_level": 6,
            "is_active": True,
            "movements": [
                {"type": "STOCK_IN", "qty": 15, "prev": 0, "res": 15, "reason": "Factory Shipment Received", "ref": "PO-1002", "user": "Admin User"},
                {"type": "STOCK_OUT", "qty": 11, "prev": 15, "res": 4, "reason": "Corporate Bulk Sale", "ref": "SO-2045", "user": "Admin User"}
            ]
        },
        {
            "sku": "KB-MECH-RGB",
            "name": "Mechanical Gaming Keyboard",
            "description": "Tenkeyless mechanical keyboard with hot-swappable linear switches",
            "category": "Electronics",
            "unit_of_measurement": "pcs",
            "cost_price": 2800.0,
            "selling_price": 4499.0,
            "quantity": 48,
            "reorder_level": 10,
            "is_active": True,
            "movements": [
                {"type": "STOCK_IN", "qty": 50, "prev": 0, "res": 50, "reason": "Direct Import Shipment", "ref": "PO-1003", "user": "Admin User"},
                {"type": "STOCK_OUT", "qty": 2, "prev": 50, "res": 48, "reason": "Retail customer orders", "ref": "SO-2048", "user": "Admin User"}
            ]
        },
        {
            "sku": "MON-4K-27",
            "name": "Ultra-Sharp 27-inch 4K Monitor",
            "description": "IPS panel 99% sRGB color accurate display with USB-C 90W charging",
            "category": "Electronics",
            "unit_of_measurement": "pcs",
            "cost_price": 18500.0,
            "selling_price": 26900.0,
            "quantity": 0,
            "reorder_level": 3,
            "is_active": True,
            "movements": [
                {"type": "STOCK_IN", "qty": 8, "prev": 0, "res": 8, "reason": "Supplier Delivery Batch #1", "ref": "PO-1004", "user": "Admin User"},
                {"type": "STOCK_OUT", "qty": 8, "prev": 8, "res": 0, "reason": "Urgent enterprise deployment dispatch", "ref": "SO-2050", "user": "Admin User"}
            ]
        },
        {
            "sku": "BOX-HVY-C1",
            "name": "Heavy Duty Corrugated Box (50x40x30)",
            "description": "5-ply double wall corrugated shipping carton for fragile transit",
            "category": "Packaging",
            "unit_of_measurement": "bundle",
            "cost_price": 450.0,
            "selling_price": 720.0,
            "quantity": 120,
            "reorder_level": 25,
            "is_active": True,
            "movements": [
                {"type": "STOCK_IN", "qty": 150, "prev": 0, "res": 150, "reason": "Local Packaging Mill Delivery", "ref": "PO-1005", "user": "Admin User"},
                {"type": "STOCK_OUT", "qty": 30, "prev": 150, "res": 120, "reason": "Warehouse Dispatch packing usage", "ref": "INT-901", "user": "Admin User"}
            ]
        },
        {
            "sku": "PAPER-A4-75G",
            "name": "Multipurpose A4 Copier Paper (500 sheets)",
            "description": "Premium 75 GSM brightness ream for laser and inkjet printing",
            "category": "Stationery",
            "unit_of_measurement": "reams",
            "cost_price": 210.0,
            "selling_price": 340.0,
            "quantity": 3,
            "reorder_level": 15,
            "is_active": True,
            "movements": [
                {"type": "STOCK_IN", "qty": 100, "prev": 0, "res": 100, "reason": "Quarterly Stationery Inflow", "ref": "PO-1006", "user": "Admin User"},
                {"type": "STOCK_OUT", "qty": 97, "prev": 100, "res": 3, "reason": "Internal Distribution to branch offices", "ref": "SO-2055", "user": "Admin User"}
            ]
        },
        {
            "sku": "USB-C-DOCK9",
            "name": "9-in-1 Aluminium USB-C Hub",
            "description": "Multiport adapter featuring HDMI 4K, Gigabit Ethernet, SD card slot",
            "category": "Electronics",
            "unit_of_measurement": "pcs",
            "cost_price": 1600.0,
            "selling_price": 2799.0,
            "quantity": 32,
            "reorder_level": 8,
            "is_active": True,
            "movements": [
                {"type": "STOCK_IN", "qty": 40, "prev": 0, "res": 40, "reason": "Supplier Order Delivery", "ref": "PO-1007", "user": "Admin User"},
                {"type": "STOCK_OUT", "qty": 8, "prev": 40, "res": 32, "reason": "Customer Orders", "ref": "SO-2060", "user": "Admin User"}
            ]
        },
        {
            "sku": "PEN-GEL-BLU",
            "name": "Quick-Dry 0.5mm Gel Pen (Pack of 12)",
            "description": "Smudge-proof archival blue ink gel pens with rubberized grip",
            "category": "Stationery",
            "unit_of_measurement": "pack",
            "cost_price": 120.0,
            "selling_price": 240.0,
            "quantity": 85,
            "reorder_level": 20,
            "is_active": True,
            "movements": [
                {"type": "STOCK_IN", "qty": 100, "prev": 0, "res": 100, "reason": "Stationery Restock", "ref": "PO-1008", "user": "Admin User"},
                {"type": "STOCK_OUT", "qty": 15, "prev": 100, "res": 85, "reason": "Office Admin Supply", "ref": "INT-905", "user": "Admin User"}
            ]
        }
    ]

    for item_data in sample_items:
        movements_data = item_data.pop("movements", [])
        inv = Inventory(**item_data, created_at=datetime.utcnow())
        db.add(inv)
        db.flush()

        for m in movements_data:
            mov = StockMovement(
                inventory_id=inv.id,
                transaction_type=m["type"],
                quantity=m["qty"],
                previous_quantity=m["prev"],
                resulting_quantity=m["res"],
                reason=m["reason"],
                reference_order=m.get("ref"),
                user_name=m.get("user", "Admin User"),
                created_at=datetime.utcnow()
            )
            db.add(mov)
        db.commit()