import urllib.request
import json
import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

BASE_URL = "http://127.0.0.1:8000/api/v1"

def http_req(url, method="GET", data=None):
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        raise

def run_tests():
    print("=== Testing Vendor & Procurement Management Lifecycle ===")
    
    # 1. Stats
    stats = http_req(f"{BASE_URL}/procurement/stats")
    print("[1] Initial Procurement Stats:", stats)

    # 2. List suppliers
    suppliers = http_req(f"{BASE_URL}/procurement/suppliers")
    print(f"[2] Suppliers count: {len(suppliers)}")
    assert len(suppliers) >= 4, "Expected seeded suppliers"

    # 3. Create a test supplier
    test_supplier_payload = {
        "name": "TEST Alpha Tech Logistics Pvt Ltd",
        "contact_person": "Vikram Sethi",
        "email": "vikram@alphatech.com",
        "phone": "+91 99887 76655",
        "city": "Hyderabad",
        "state": "Telangana",
        "country": "India",
        "postal_code": "500081",
        "gstin": "36AAACA9988B1Z7",
        "payment_terms": "Net 30",
        "rating": 4.9,
        "notes": "Testing vendor creation"
    }
    created_sup = http_req(f"{BASE_URL}/procurement/suppliers", method="POST", data=test_supplier_payload)
    print(f"[3] Created Supplier ID {created_sup['id']} - {created_sup['name']}")

    # 4. Fetch an inventory item to purchase
    inv_data = http_req(f"{BASE_URL}/inventory/?page_size=5")
    inv_items = inv_data["items"]
    assert len(inv_items) > 0, "Inventory must contain items"
    test_item = inv_items[0]
    initial_qty = test_item["quantity"]
    initial_cost = test_item["cost_price"]
    print(f"[4] Target Inventory Item: {test_item['name']} (SKU: {test_item['sku']}) - Current Qty: {initial_qty}, Cost: INR {initial_cost}")

    # 5. Create Purchase Order with higher cost price to test cost update
    negotiated_cost = 4500.0  # Set negotiated cost
    po_payload = {
        "supplier_id": created_sup["id"],
        "status": "Issued",
        "payment_terms": "Net 30",
        "tax_rate": 0.18,
        "shipping_cost": 250.0,
        "notes": "Test Inbound PO",
        "items": [
            {
                "inventory_id": test_item["id"],
                "quantity_ordered": 20,
                "unit_cost": negotiated_cost
            }
        ]
    }
    po = http_req(f"{BASE_URL}/procurement/purchase-orders", method="POST", data=po_payload)
    print(f"[5] Created Purchase Order {po['po_number']} (ID: {po['id']}) - Total: INR {po['total_amount']}")
    assert po["status"] == "Issued"
    assert len(po["items"]) == 1
    po_item = po["items"][0]

    # 6. Receive partial goods (12 units out of 20) via GRN
    grn_payload = {
        "purchase_order_id": po["id"],
        "carrier": "Blue Dart Express",
        "tracking_number": "TRK-TEST-9988",
        "delivery_challan_number": "DC-TEST-100",
        "notes": "Inspected batch condition - Excellent",
        "items": [
            {
                "purchase_order_item_id": po_item["id"],
                "quantity_received": 12,
                "batch_lot_number": "LOT-TEST-01",
                "condition_notes": "Good Condition"
            }
        ]
    }
    grn = http_req(f"{BASE_URL}/procurement/goods-receipts", method="POST", data=grn_payload)
    print(f"[6] Received Goods: GRN #{grn['grn_number']} for {grn['items'][0]['quantity_received']} units")

    # 7. Verify Inventory Quantity incremented and Cost Price updated!
    updated_inv = http_req(f"{BASE_URL}/inventory/{test_item['id']}")
    expected_qty = initial_qty + 12
    print(f"[7] Verifying Inventory: Qty was {initial_qty} -> now {updated_inv['quantity']} (Expected {expected_qty})")
    assert updated_inv["quantity"] == expected_qty, f"Expected {expected_qty}, got {updated_inv['quantity']}"
    print(f"    Verifying Cost Price: Cost was INR {initial_cost} -> now INR {updated_inv['cost_price']} (Expected INR {negotiated_cost})")
    assert updated_inv["cost_price"] == negotiated_cost, f"Expected {negotiated_cost}, got {updated_inv['cost_price']}"

    # 8. Verify Stock Movement entry was logged
    mov_data = http_req(f"{BASE_URL}/inventory/{test_item['id']}/movements")
    movements = mov_data if isinstance(mov_data, list) else mov_data.get("movements", [])
    latest_mov = movements[0]
    print(f"[8] Latest Stock Movement: Type={latest_mov['transaction_type']}, Qty={latest_mov['quantity']}, Reason={latest_mov['reason']}")
    assert latest_mov["transaction_type"] == "STOCK_IN"
    assert latest_mov["quantity"] == 12
    assert po["po_number"] in latest_mov["reason"]

    # 9. Verify PO status updated to 'Partially Received'
    updated_po = http_req(f"{BASE_URL}/procurement/purchase-orders/{po['id']}")
    print(f"[9] PO Status: {updated_po['status']} (Received: {updated_po['items'][0]['quantity_received']}/{updated_po['items'][0]['quantity_ordered']})")
    assert updated_po["status"] == "Partially Received"

    # 10. Inward remaining 8 units to fully complete PO
    grn2_payload = {
        "purchase_order_id": po["id"],
        "carrier": "Blue Dart Express",
        "tracking_number": "TRK-TEST-9989",
        "notes": "Remaining stock accepted",
        "items": [
            {
                "purchase_order_item_id": po_item["id"],
                "quantity_received": 8,
                "condition_notes": "All Good"
            }
        ]
    }
    grn2 = http_req(f"{BASE_URL}/procurement/goods-receipts", method="POST", data=grn2_payload)
    print(f"[10] Inwarded remaining 8 units via GRN #{grn2['grn_number']}")

    # 11. Verify PO is now fully 'Received'
    completed_po = http_req(f"{BASE_URL}/procurement/purchase-orders/{po['id']}")
    print(f"[11] Final PO Status: {completed_po['status']}")
    assert completed_po["status"] == "Received"

    # Cleanup test records
    from app.core.database import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # Revert item stock & cost
        db.execute(text(f"UPDATE inventory SET quantity = {initial_qty}, cost_price = {initial_cost} WHERE id = {test_item['id']}"))
        # Delete test stock movements
        db.execute(text("DELETE FROM stock_movements WHERE reference_order LIKE 'PO-2026-000%' OR reason LIKE '%GRN #GRN-2026-000%'"))
        # Delete test GRN items and GRNs
        db.execute(text("DELETE FROM goods_receipt_items WHERE goods_receipt_id IN (SELECT id FROM goods_receipts WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST %'))"))
        db.execute(text("DELETE FROM goods_receipts WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST %')"))
        # Delete test PO items and POs
        db.execute(text("DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST %'))"))
        db.execute(text("DELETE FROM purchase_orders WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST %')"))
        # Delete test suppliers
        db.execute(text("DELETE FROM suppliers WHERE name LIKE 'TEST %'"))
        db.commit()
        print("[12] Test data cleanly reverted and restored!")
    finally:
        db.close()

    print("\n>>> ALL 12 PROCUREMENT LIFECYCLE TESTS PASSED WITH 100% SUCCESS! <<<")

if __name__ == "__main__":
    run_tests()
