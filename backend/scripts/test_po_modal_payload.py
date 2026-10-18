import urllib.request
import json
import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.core.database import SessionLocal
from sqlalchemy import text

payload = {
    "supplier_id": 1,
    "order_date": "2026-10-19T01:40:00.000Z",
    "status": "Issued",
    "payment_status": "Unpaid",
    "payment_terms": "Net 30",
    "notes": "Testing PO modal payload",
    "shipping_address": "Main Central Warehouse, Dock 4",
    "tax_rate": 0.18,
    "shipping_cost": 500.0,
    "items": [
        {
            "inventory_id": 1,
            "quantity_ordered": 10,
            "unit_cost": 120.0
        }
    ]
}

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/procurement/purchase-orders",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req) as res:
        po = json.loads(res.read().decode("utf-8"))
        print("PO Created successfully:", po["po_number"], "ID:", po["id"], "Total:", po["total_amount"])
        
        # Cleanup
        db = SessionLocal()
        db.execute(text(f"DELETE FROM purchase_order_items WHERE purchase_order_id = {po['id']}"))
        db.execute(text(f"DELETE FROM purchase_orders WHERE id = {po['id']}"))
        db.commit()
        db.close()
        print("PO Test Cleaned successfully.")
except Exception as e:
    print("Error creating PO:", e)
    raise
