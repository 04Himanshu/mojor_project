import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.core.database import SessionLocal
from sqlalchemy import text

def clean_test_records():
    """Removes test records created during verification runs."""
    db = SessionLocal()
    try:
        # Suppliers and POs/GRNs
        db.execute(text("DELETE FROM goods_receipt_items WHERE goods_receipt_id IN (SELECT id FROM goods_receipts WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST%' OR name LIKE 'Zenith%'))"))
        db.execute(text("DELETE FROM goods_receipts WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST%' OR name LIKE 'Zenith%')"))
        db.execute(text("DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST%' OR name LIKE 'Zenith%'))"))
        db.execute(text("DELETE FROM purchase_orders WHERE supplier_id IN (SELECT id FROM suppliers WHERE name LIKE 'TEST%' OR name LIKE 'Zenith%')"))
        db.execute(text("DELETE FROM suppliers WHERE name LIKE 'TEST%' OR name LIKE 'Zenith%'"))

        # Inventory and Movements
        db.execute(text("DELETE FROM order_items WHERE inventory_id IN (SELECT id FROM inventory WHERE sku LIKE 'TEST-%')"))
        db.execute(text("DELETE FROM stock_movements WHERE inventory_id IN (SELECT id FROM inventory WHERE sku LIKE 'TEST-%')"))
        db.execute(text("DELETE FROM inventory WHERE sku LIKE 'TEST-%'"))

        # Orders and Customers
        db.execute(text("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE notes LIKE '%test%' OR customer_id IN (SELECT id FROM customers WHERE name LIKE 'Apex Global%' OR name LIKE 'Automated Test%' OR email LIKE 'customer_%@enterprise.com'))"))
        db.execute(text("DELETE FROM orders WHERE notes LIKE '%test%' OR customer_id IN (SELECT id FROM customers WHERE name LIKE 'Apex Global%' OR name LIKE 'Automated Test%' OR email LIKE 'customer_%@enterprise.com')"))
        db.execute(text("DELETE FROM customers WHERE name LIKE 'Apex Global%' OR name LIKE 'Automated Test%' OR email LIKE 'customer_%@enterprise.com'"))

        # Users and Roles
        db.execute(text("DELETE FROM users WHERE email LIKE 'test_staff%' OR name LIKE 'Karan Malhotra'"))
        db.execute(text("DELETE FROM roles WHERE name LIKE 'Test QA Auditor%'"))

        db.commit()
        print("Test database records cleaned up successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    clean_test_records()
