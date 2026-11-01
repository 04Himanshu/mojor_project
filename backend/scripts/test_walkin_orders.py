import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.inventory import Inventory
from app.models.customer import Customer
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.user import User
from app.schemas.order import OrderCreate, OrderItemCreate, OrderStatusUpdate
from app.services import order_service
from fastapi import HTTPException

def run_tests():
    db = SessionLocal()

    print("=== Testing Walk-in Counter Sale & Order Implementation ===")

    # 1. Ensure test admin user exists
    admin_user = db.query(User).filter(User.email == "admin@eom.com").first()
    if not admin_user:
        admin_user = db.query(User).first()
    assert admin_user is not None, "No user found in database!"

    # 2. Setup 2 test inventory items with known initial quantities
    item_a = db.query(Inventory).filter(Inventory.sku == "TEST-WALKIN-A").first()
    if not item_a:
        item_a = Inventory(
            sku="TEST-WALKIN-A",
            name="Walk-in Test Product A",
            category="Electronics",
            unit_of_measurement="pcs",
            cost_price=100.0,
            selling_price=150.0,
            quantity=20,
            reorder_level=5,
            is_active=True
        )
        db.add(item_a)
    else:
        item_a.quantity = 20
        item_a.is_active = True

    item_b = db.query(Inventory).filter(Inventory.sku == "TEST-WALKIN-B").first()
    if not item_b:
        item_b = Inventory(
            sku="TEST-WALKIN-B",
            name="Walk-in Test Product B",
            category="Accessories",
            unit_of_measurement="units",
            cost_price=50.0,
            selling_price=80.0,
            quantity=15,
            reorder_level=3,
            is_active=True
        )
        db.add(item_b)
    else:
        item_b.quantity = 15
        item_b.is_active = True

    db.commit()
    db.refresh(item_a)
    db.refresh(item_b)

    item_a_id = item_a.id
    item_b_id = item_b.id
    print(f"Initial Stocks: Item A={item_a.quantity}, Item B={item_b.quantity}")

    # TEST 1: Customer walks in and buys more than one item
    # Customer buys: 3x Item A and 2x Item B
    create_payload = OrderCreate(
        customer_name="Walk-in Customer",
        customer_phone="+91-9999988888",
        shipping_address="In-Store Counter Handover",
        payment_status="Paid",
        payment_method="Cash",
        tax_rate=0.18,
        discount_amount=20.0,
        notes="Counter sale 1",
        items=[
            OrderItemCreate(inventory_id=item_a_id, quantity=3),
            OrderItemCreate(inventory_id=item_b_id, quantity=2)
        ]
    )

    created_order = order_service.create_order(
        db=db,
        payload=create_payload,
        user_id=admin_user.id,
        user_name=admin_user.name
    )

    order_id = created_order["id"]
    print(f"[PASS] Order created: ID {order_id}, Number: {created_order['order_number']}")
    assert created_order["status"] == "Completed", f"Expected Completed, got {created_order['status']}"
    assert created_order["stock_deducted"] is True, "Stock should be deducted immediately"
    assert created_order["user_name"] == admin_user.name, f"Expected cashier {admin_user.name}, got {created_order['user_name']}"
    assert len(created_order["items"]) == 2, "Expected 2 items in order"

    # Verify stock decremented immediately in DB: Item A: 20-3=17, Item B: 15-2=13
    db.expire_all()
    item_a_check = db.query(Inventory).filter(Inventory.id == item_a_id).first()
    item_b_check = db.query(Inventory).filter(Inventory.id == item_b_id).first()
    assert item_a_check.quantity == 17, f"Item A stock should be 17, got {item_a_check.quantity}"
    assert item_b_check.quantity == 13, f"Item B stock should be 13, got {item_b_check.quantity}"
    print(f"[PASS] Inventory deducted immediately: Item A={item_a_check.quantity}, Item B={item_b_check.quantity}")

    # TEST 2: Stock validation - attempt to buy more than available in stock
    over_payload = OrderCreate(
        customer_name="Greedy Customer",
        items=[
            OrderItemCreate(inventory_id=item_a_id, quantity=50)  # Only 17 available
        ]
    )
    caught = False
    try:
        order_service.create_order(db=db, payload=over_payload, user_id=admin_user.id, user_name=admin_user.name)
    except HTTPException as e:
        caught = True
        assert e.status_code == 400
        print(f"[PASS] Insufficient stock correctly rejected with 400: {e.detail}")
    assert caught, "Should have raised HTTPException 400"

    # TEST 3: Invoice & Receipt generation
    inv_data = order_service.get_order_invoice(db=db, order_id=order_id)
    assert inv_data["order_id"] == order_id
    assert inv_data["user_name"] == admin_user.name
    assert len(inv_data["items"]) == 2
    assert inv_data["total_amount"] > 0
    print(f"[PASS] Sales Receipt generated: {inv_data['invoice_number']} for INR {inv_data['total_amount']}")

    # TEST 4: Stats calculation
    stats = order_service.get_order_stats(db=db)
    assert stats["total_orders"] >= 1
    assert stats["completed_count"] >= 1
    assert stats["total_revenue"] > 0
    print(f"[PASS] Stats calculation: total_orders={stats['total_orders']}, revenue={stats['total_revenue']}")

    # TEST 5: Voiding / Cancelling order restores stock
    cancel_payload = OrderStatusUpdate(status="Cancelled")
    cancel_data = order_service.update_order_status(db=db, order_id=order_id, payload=cancel_payload, user_name=admin_user.name)
    assert cancel_data["status"] == "Cancelled"
    assert cancel_data["stock_deducted"] is False

    # Verify stock restored in DB: Item A: 17+3=20, Item B: 13+2=15
    db.expire_all()
    item_a_restored = db.query(Inventory).filter(Inventory.id == item_a_id).first()
    item_b_restored = db.query(Inventory).filter(Inventory.id == item_b_id).first()
    assert item_a_restored.quantity == 20, f"Item A should be restored to 20, got {item_a_restored.quantity}"
    assert item_b_restored.quantity == 15, f"Item B should be restored to 15, got {item_b_restored.quantity}"
    print(f"[PASS] Cancelled order restored stock: Item A={item_a_restored.quantity}, Item B={item_b_restored.quantity}")

    # Clean up test order
    db.query(OrderItem).filter(OrderItem.order_id == order_id).delete()
    db.query(Order).filter(Order.id == order_id).delete()
    db.delete(item_a_restored)
    db.delete(item_b_restored)
    db.commit()
    db.close()
    print("=== All Walk-in Counter Sale Tests PASSED Successfully! ===")

if __name__ == "__main__":
    run_tests()
