import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.core.database import engine
from sqlalchemy import text

def clean_test_records():
    """Removes test orders and test inventory items created during verification."""
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM stock_movements WHERE reference_order LIKE 'ORD-%' OR reference_order LIKE 'PO-%' OR reason LIKE '%Test%'"))
        conn.execute(text("DELETE FROM goods_receipt_items WHERE goods_receipt_id IN (SELECT id FROM goods_receipts WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST %'))"))
        conn.execute(text("DELETE FROM goods_receipts WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST %')"))
        conn.execute(text("DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST %'))"))
        conn.execute(text("DELETE FROM purchase_orders WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST %')"))
        conn.execute(text("DELETE FROM suppliers WHERE name LIKE 'TEST %'"))
        conn.execute(text("DELETE FROM stock_movements WHERE inventory_id IN (SELECT id FROM inventory WHERE sku LIKE 'TEST-%')"))
        conn.execute(text("DELETE FROM inventory WHERE sku LIKE 'TEST-%'"))
        conn.commit()
        print("Test database records cleaned up successfully.")

if __name__ == "__main__":
    clean_test_records()
