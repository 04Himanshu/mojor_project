from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.inventory import Inventory
from app.models.customer import Customer
from app.models.stock_movement import StockMovement
from app.schemas.order import OrderCreate, OrderStatusUpdate
from datetime import datetime, date
from typing import List, Optional
import uuid

COMPANY_PROFILE = {
    "name": "Enterprise Operations Manager (EOM)",
    "address": "400 Innovation Expressway, Tech Park, Suite 1200",
    "email": "billing@eom-enterprise.com",
    "phone": "+1 (800) 555-EOM1",
    "gstin": "29AAACE9921M1Z5"
}

def serialize_order_item(oi: OrderItem) -> dict:
    subtotal = round(float(oi.quantity * oi.price_at_time), 2)
    return {
        "id": oi.id,
        "inventory_id": oi.inventory_id,
        "quantity": oi.quantity,
        "price_at_time": float(oi.price_at_time),
        "item_name": oi.item.name if oi.item else "Unknown Item",
        "item_sku": oi.item.sku if oi.item else "",
        "unit_of_measurement": oi.item.unit_of_measurement if oi.item and oi.item.unit_of_measurement else "units",
        "subtotal": subtotal
    }

def serialize_order(order: Order) -> dict:
    items_serialized = [serialize_order_item(item) for item in order.items]
    subtotal = round(sum(i["subtotal"] for i in items_serialized), 2)
    
    tax_rate = float(getattr(order, "tax_rate", 0.0) or 0.0)
    tax_amount = round(subtotal * tax_rate, 2)
    discount_amount = float(getattr(order, "discount_amount", 0.0) or 0.0)
    total_amount = max(0.0, round(subtotal + tax_amount - discount_amount, 2))
    
    order_num = f"ORD-{order.id:04d}"
    
    cust_name = "Walk-in Customer"
    cust_email = None
    cust_phone = None
    shipping_addr = getattr(order, "shipping_address", None) or "In-Store Counter Handover"
    
    if order.customer:
        cust_name = order.customer.name
        cust_email = order.customer.email
        cust_phone = order.customer.phone
    
    user_name = order.user.name if order.user else "Staff Member"

    return {
        "id": order.id,
        "order_number": order_num,
        "customer_id": order.customer_id,
        "customer_name": cust_name,
        "customer_email": cust_email,
        "customer_phone": cust_phone,
        "shipping_address": shipping_addr,
        "user_id": order.user_id,
        "user_name": user_name,
        "created_at": order.created_at,
        "status": order.status,
        "stock_deducted": getattr(order, "stock_deducted", True),
        "payment_status": getattr(order, "payment_status", "Paid") or "Paid",
        "payment_method": getattr(order, "payment_method", "Cash") or "Cash",
        "notes": getattr(order, "notes", None),
        "subtotal": subtotal,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "discount_amount": discount_amount,
        "total_amount": total_amount,
        "items": items_serialized
    }

def get_orders(
    db: Session, 
    status: Optional[str] = None, 
    search: Optional[str] = None,
    payment_status: Optional[str] = None
) -> List[dict]:
    query = db.query(Order).order_by(desc(Order.created_at))
    
    if status and status.upper() != "ALL":
        query = query.filter(Order.status == status.capitalize())
        
    if payment_status and payment_status.upper() != "ALL":
        query = query.filter(Order.payment_status == payment_status.capitalize())
        
    orders = query.all()
    serialized = [serialize_order(o) for o in orders]
    
    if search:
        s = search.strip().lower()
        serialized = [
            o for o in serialized 
            if s in str(o["id"]) 
            or s in o["order_number"].lower() 
            or s in (o["customer_name"] or "").lower()
            or s in (o["customer_phone"] or "").lower()
            or s in (o["user_name"] or "").lower()
            or any(s in item["item_name"].lower() or s in item["item_sku"].lower() for item in o["items"])
        ]
        
    return serialized

def get_order_by_id(db: Session, order_id: int) -> dict:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order #{order_id} not found.")
    return serialize_order(order)

def get_order_stats(db: Session) -> dict:
    orders = db.query(Order).all()
    total_orders = len(orders)
    completed_count = 0
    cancelled_count = 0
    total_revenue = 0.0
    today_orders = 0
    today_revenue = 0.0
    paid_count = 0
    unpaid_count = 0
    total_units_sold = 0

    today = date.today()

    for o in orders:
        st = (o.status or "").capitalize()
        pay_st = (o.payment_status or "Paid").capitalize()
        is_today = o.created_at and o.created_at.date() == today

        # Calculate line item total and units
        sub = sum(float(item.quantity * item.price_at_time) for item in o.items)
        units = sum(item.quantity for item in o.items)
        tax = sub * float(getattr(o, "tax_rate", 0.0) or 0.0)
        disc = float(getattr(o, "discount_amount", 0.0) or 0.0)
        order_total = max(0.0, sub + tax - disc)

        if st == "Cancelled":
            cancelled_count += 1
        else:
            completed_count += 1
            total_revenue += order_total
            total_units_sold += units
            if pay_st == "Paid":
                paid_count += 1
            else:
                unpaid_count += 1

            if is_today:
                today_orders += 1
                today_revenue += order_total

    aov = round(total_revenue / completed_count, 2) if completed_count > 0 else 0.0
    today_aov = round(today_revenue / today_orders, 2) if today_orders > 0 else 0.0

    return {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "completed_count": completed_count,
        "cancelled_count": cancelled_count,
        "today_orders": today_orders,
        "today_revenue": round(today_revenue, 2),
        "aov": aov,
        "today_aov": today_aov,
        "paid_count": paid_count,
        "unpaid_count": unpaid_count,
        "total_units_sold": total_units_sold,
        # Retain backward-compatible fields
        "pending_count": 0,
        "confirmed_count": completed_count,
        "dispatched_count": 0,
        "delivered_count": completed_count
    }

def create_order(
    db: Session, 
    payload: OrderCreate, 
    user_id: Optional[int] = None, 
    user_name: str = "Staff Member"
) -> dict:
    """
    Creates a Walk-in Sales Order at the counter:
    1. Resolves customer (Walk-in or registered/named customer).
    2. Validates line items and checks available inventory quantities.
    3. Atomically creates order with status 'Completed' (sale completed immediately).
    4. Automatically deducts physical stock from inventory and logs audit movements.
    """
    # 1. Resolve or register customer
    customer_id = payload.customer_id
    c_name_input = (payload.customer_name or "").strip()
    c_phone_input = (payload.customer_phone or "").strip()
    c_email_input = (payload.customer_email or "").strip().lower()

    if not customer_id and (
        (c_name_input and c_name_input.lower() != "walk-in customer")
        or c_phone_input
        or c_email_input
    ):
        c_name = c_name_input if c_name_input else "Walk-in Customer"
        c_phone = c_phone_input if c_phone_input else "N/A"
        
        # Check existing customer by email or phone
        existing_cust = None
        if c_email_input:
            existing_cust = db.query(Customer).filter(Customer.email == c_email_input).first()
        elif c_phone_input and c_phone_input != "N/A":
            existing_cust = db.query(Customer).filter(Customer.phone == c_phone_input).first()

        if existing_cust:
            customer_id = existing_cust.id
        else:
            # Generate unique placeholder email if not provided to satisfy unique constraint
            safe_email = c_email_input if c_email_input else f"walkin_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}@customer.local"
            new_cust = Customer(
                name=c_name,
                email=safe_email,
                phone=c_phone,
                address=payload.shipping_address or "Counter Customer"
            )
            db.add(new_cust)
            db.flush()
            customer_id = new_cust.id

    if customer_id is not None:
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if not cust:
            raise HTTPException(status_code=400, detail=f"Customer with ID {customer_id} does not exist.")

    # 2. Validate all ordered items and verify stock availability
    order_items_to_create = []
    for item_data in payload.items:
        inv_item = db.query(Inventory).filter(Inventory.id == item_data.inventory_id).with_for_update().first()
        if not inv_item:
            raise HTTPException(
                status_code=400, 
                detail=f"Validation Error: Inventory item #{item_data.inventory_id} does not exist."
            )
        if not inv_item.is_active:
            raise HTTPException(
                status_code=400, 
                detail=f"Validation Error: Item '{inv_item.name}' ({inv_item.sku}) is inactive and cannot be sold."
            )
        if item_data.quantity <= 0:
            raise HTTPException(status_code=400, detail="Item order quantity must be greater than 0.")
        
        # Immediate stock availability validation for counter sale
        if inv_item.quantity < item_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient Stock for '{inv_item.name}' ({inv_item.sku}): "
                    f"Customer requested {item_data.quantity} {inv_item.unit_of_measurement}, "
                    f"but only {inv_item.quantity} available in stock."
                )
            )

        order_items_to_create.append((inv_item, item_data.quantity))

    try:
        # 3. Create the walk-in sales order record
        new_order = Order(
            customer_id=customer_id,
            user_id=user_id,
            status="Completed",
            stock_deducted=True,
            shipping_address=payload.shipping_address or "In-Store Counter Handover",
            notes=payload.notes,
            payment_status=(payload.payment_status or "Paid").capitalize(),
            payment_method=payload.payment_method or "Cash",
            tax_rate=payload.tax_rate or 0.0,
            discount_amount=payload.discount_amount or 0.0,
            created_at=datetime.utcnow()
        )
        db.add(new_order)
        db.flush()

        # 4. Create OrderItems & immediately deduct stock
        for inv_item, qty in order_items_to_create:
            order_item = OrderItem(
                order_id=new_order.id,
                inventory_id=inv_item.id,
                quantity=qty,
                price_at_time=inv_item.selling_price
            )
            db.add(order_item)

            prev_qty = inv_item.quantity
            res_qty = prev_qty - qty
            inv_item.quantity = res_qty
            inv_item.updated_at = datetime.utcnow()

            # Record audit trail
            movement = StockMovement(
                inventory_id=inv_item.id,
                transaction_type="STOCK_OUT",
                quantity=qty,
                previous_quantity=prev_qty,
                resulting_quantity=res_qty,
                reason=f"Walk-in Purchase (Order #{new_order.id})",
                reference_order=f"ORD-{new_order.id:04d}",
                user_name=user_name,
                created_at=datetime.utcnow()
            )
            db.add(movement)

        db.commit()
        db.refresh(new_order)
        return serialize_order(new_order)

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process counter order: {str(exc)}"
        )

def update_order_status(
    db: Session, 
    order_id: int, 
    payload: OrderStatusUpdate, 
    user_name: str = "Staff Member"
) -> dict:
    """
    Updates order status (e.g., Voiding / Cancelling a sale):
    - When Cancelled: Restores deducted inventory units back to warehouse counts.
    - When Completed from Cancelled: Validates stock and re-deducts.
    """
    new_status = payload.status.capitalize()
    
    order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order #{order_id} not found.")

    try:
        # Case A: Cancelling / Voiding a sale -> Restore deducted stock
        if new_status == "Cancelled" and order.stock_deducted:
            for order_item in order.items:
                inv_item = db.query(Inventory).filter(
                    Inventory.id == order_item.inventory_id
                ).with_for_update().first()

                if inv_item:
                    prev_qty = inv_item.quantity
                    res_qty = prev_qty + order_item.quantity
                    inv_item.quantity = res_qty
                    inv_item.updated_at = datetime.utcnow()

                    movement = StockMovement(
                        inventory_id=inv_item.id,
                        transaction_type="STOCK_IN",
                        quantity=order_item.quantity,
                        previous_quantity=prev_qty,
                        resulting_quantity=res_qty,
                        reason=f"Walk-in Order #{order.id} Cancelled / Voided - Stock Restored",
                        reference_order=f"ORD-{order.id:04d}",
                        user_name=user_name,
                        created_at=datetime.utcnow()
                    )
                    db.add(movement)

            order.stock_deducted = False
            order.status = "Cancelled"
            order.payment_status = (payload.payment_status or "Refunded").capitalize()

        # Case B: Re-activating a cancelled order -> Re-deduct stock
        elif new_status in ["Completed", "Confirmed"] and not order.stock_deducted:
            for order_item in order.items:
                inv_item = db.query(Inventory).filter(
                    Inventory.id == order_item.inventory_id
                ).with_for_update().first()

                if not inv_item:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Inventory item ID {order_item.inventory_id} no longer exists."
                    )

                if inv_item.quantity < order_item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Stock Validation Failed for '{inv_item.name}' ({inv_item.sku}): "
                            f"Order requires {order_item.quantity} {inv_item.unit_of_measurement}, "
                            f"but only {inv_item.quantity} available."
                        )
                    )

                prev_qty = inv_item.quantity
                res_qty = prev_qty - order_item.quantity
                inv_item.quantity = res_qty
                inv_item.updated_at = datetime.utcnow()

                movement = StockMovement(
                    inventory_id=inv_item.id,
                    transaction_type="STOCK_OUT",
                    quantity=order_item.quantity,
                    previous_quantity=prev_qty,
                    resulting_quantity=res_qty,
                    reason=f"Walk-in Order #{order.id} Restored / Completed",
                    reference_order=f"ORD-{order.id:04d}",
                    user_name=user_name,
                    created_at=datetime.utcnow()
                )
                db.add(movement)

            order.stock_deducted = True
            order.status = "Completed"
            if payload.payment_status:
                order.payment_status = payload.payment_status.capitalize()
        else:
            order.status = new_status
            if payload.payment_status:
                order.payment_status = payload.payment_status.capitalize()

        if payload.notes:
            order.notes = payload.notes.strip()

        db.commit()
        db.refresh(order)
        return serialize_order(order)

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update order status: {str(exc)}"
        )

def get_order_invoice(db: Session, order_id: int) -> dict:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order #{order_id} not found.")

    ord_dict = serialize_order(order)
    invoice_num = f"REC-{order.created_at.strftime('%Y%m')}-{order.id:04d}"

    return {
        "invoice_number": invoice_num,
        "invoice_date": datetime.utcnow(),
        "order_id": order.id,
        "order_number": ord_dict["order_number"],
        "order_date": order.created_at,
        "company_name": COMPANY_PROFILE["name"],
        "company_address": COMPANY_PROFILE["address"],
        "company_email": COMPANY_PROFILE["email"],
        "company_phone": COMPANY_PROFILE["phone"],
        "company_gstin": COMPANY_PROFILE["gstin"],
        "customer_name": ord_dict["customer_name"],
        "customer_email": ord_dict["customer_email"],
        "customer_phone": ord_dict["customer_phone"],
        "shipping_address": ord_dict["shipping_address"] or "In-Store Counter Handover",
        "user_name": ord_dict["user_name"],
        "status": ord_dict["status"],
        "payment_status": ord_dict["payment_status"],
        "payment_method": ord_dict["payment_method"],
        "notes": ord_dict["notes"],
        "items": ord_dict["items"],
        "subtotal": ord_dict["subtotal"],
        "tax_rate": ord_dict["tax_rate"],
        "tax_amount": ord_dict["tax_amount"],
        "discount_amount": ord_dict["discount_amount"],
        "total_amount": ord_dict["total_amount"]
    }

def seed_default_orders_if_empty(db: Session):
    if db.query(Order).count() > 0:
        return

    items = db.query(Inventory).filter(Inventory.quantity > 5).limit(2).all()
    if len(items) < 2:
        return

    # Create sample Completed Walk-in Counter Sale
    ord1 = Order(
        customer_id=None,
        status="Completed",
        stock_deducted=True,
        shipping_address="In-Store Counter Handover",
        payment_status="Paid",
        payment_method="Cash",
        tax_rate=0.18,
        discount_amount=50.0,
        notes="Walk-in counter sale",
        created_at=datetime.utcnow()
    )
    db.add(ord1)
    db.flush()

    for itm in items:
        oi = OrderItem(
            order_id=ord1.id,
            inventory_id=itm.id,
            quantity=1,
            price_at_time=itm.selling_price
        )
        db.add(oi)

    db.commit()
