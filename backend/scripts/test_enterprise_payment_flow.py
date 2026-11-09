import os
import sys
import unittest
import datetime
import hmac
import hashlib
import base64
from unittest.mock import patch, MagicMock, AsyncMock

# Put backend root on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.inventory import Inventory
from app.models.customer import Customer
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.stock_movement import StockMovement
from app.models.payment_transaction import PaymentTransaction
from app.schemas.order import OrderCreate, OrderItemCreate
from app.schemas.payment import CashfreeCreateSessionRequest
from app.services import order_service
from app.services.cashfree_service import CashfreeService
from app.core.config import settings

class MockAsyncClient:
    def __init__(self, *args, **kwargs):
        pass
    async def __aenter__(self):
        return self
    async def __aexit__(self, *args):
        pass
    async def post(self, *args, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = {
            "payment_session_id": "session_test_998877",
            "order_id": "CF_ORD_TEST_01",
            "order_status": "ACTIVE"
        }
        return resp
    async def get(self, *args, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = [
            {
                "cf_payment_id": 99881122,
                "payment_status": "SUCCESS",
                "payment_group": "UPI",
                "payment_amount": 10500.0,
                "payment_method": {"upi": {"channel": "qrcode"}}
            }
        ]
        return resp

class TestEnterprisePaymentArchitecture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create an in-memory SQLite test database with all models
        cls.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=cls.engine)
        cls.Session = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

    def setUp(self):
        self.db = self.Session()
        # Seed test items
        self.item1 = Inventory(
            name="Industrial Barcode Scanner",
            sku="SCAN-PRO-01",
            category="Hardware",
            quantity=50,
            reorder_level=10,
            cost_price=2000.0,
            selling_price=3500.0,
            unit_of_measurement="units",
            is_active=True
        )
        self.item2 = Inventory(
            name="Thermal Receipt Roll 80mm",
            sku="ROLL-80MM-10",
            category="Supplies",
            quantity=200,
            reorder_level=20,
            cost_price=30.0,
            selling_price=65.0,
            unit_of_measurement="rolls",
            is_active=True
        )
        self.db.add_all([self.item1, self.item2])
        self.db.commit()

    def tearDown(self):
        self.db.rollback()
        # Clean up database tables
        for table in reversed(Base.metadata.sorted_tables):
            self.db.execute(table.delete())
        self.db.commit()
        self.db.close()

    def test_01_cash_payment_flow_atomic_settlement(self):
        """Test Cash Tender Flow: verifies atomic stock deduction, stock movement audit trail, and financials."""
        payload = OrderCreate(
            customer_name="Walk-in Cash Customer",
            customer_phone="9876543210",
            shipping_address="Store POS Counter #1",
            payment_status="Paid",
            payment_method="Cash",
            tax_rate=0.18,
            discount_amount=50.0,
            notes="Counter Cash Settlement",
            items=[
                OrderItemCreate(inventory_id=self.item1.id, quantity=2),
                OrderItemCreate(inventory_id=self.item2.id, quantity=5)
            ]
        )

        initial_qty_1 = self.item1.quantity
        initial_qty_2 = self.item2.quantity

        result = order_service.create_order(
            db=self.db,
            payload=payload,
            user_id=1,
            user_name="Cashier Admin"
        )

        # 1. Order verification
        self.assertEqual(result["payment_status"], "Paid")
        self.assertEqual(result["status"], "Completed")
        self.assertTrue(result["stock_deducted"])
        self.assertEqual(result["payment_method"], "Cash")

        # 2. Financial calculation verification
        # Subtotal: (2 * 3500) + (5 * 65) = 7000 + 325 = 7325
        # Tax (18%): 7325 * 0.18 = 1318.50
        # Discount: 50.0
        # Grand Total: 7325 + 1318.50 - 50 = 8593.50
        self.assertEqual(result["subtotal"], 7325.0)
        self.assertEqual(result["tax_amount"], 1318.50)
        self.assertEqual(result["total_amount"], 8593.50)

        # 3. Inventory Stock Deduction Verification
        self.db.refresh(self.item1)
        self.db.refresh(self.item2)
        self.assertEqual(self.item1.quantity, initial_qty_1 - 2)
        self.assertEqual(self.item2.quantity, initial_qty_2 - 5)

        # 4. Stock Movement Audit Trail Verification
        movements = self.db.query(StockMovement).filter(
            StockMovement.reference_order == result["order_number"]
        ).all()
        self.assertEqual(len(movements), 2)
        for m in movements:
            self.assertEqual(m.transaction_type, "STOCK_OUT")
            self.assertEqual(m.user_name, "Cashier Admin")
            self.assertIn("Walk-in Purchase", m.reason)

    def test_02_cashfree_session_staging_preserves_stock_before_payment(self):
        """
        Enterprise Standard: Creating a digital payment session stages an UNPAID order.
        Stock must NOT be permanently deducted before payment is confirmed.
        """
        session_payload = CashfreeCreateSessionRequest(
            customer_name="Online Customer",
            customer_phone="9988776655",
            customer_email="online@test.com",
            payment_method="QR Code",
            tax_rate=0.18,
            discount_amount=0.0,
            items=[OrderItemCreate(inventory_id=self.item1.id, quantity=1)]
        )

        initial_qty = self.item1.quantity

        with patch("httpx.AsyncClient", MockAsyncClient):
            import asyncio
            session_result = asyncio.run(CashfreeService.create_order_session(
                db=self.db,
                payload=session_payload,
                user_id=1,
                user_name="POS Clerk"
            ))

        self.assertIn("payment_session_id", session_result)
        cf_order_id = session_result["cf_order_id"]

        # Assert staged Order state
        staged_order = self.db.query(Order).filter(Order.cf_order_id == cf_order_id).first()
        self.assertIsNotNone(staged_order)
        self.assertEqual(staged_order.status, "Pending")
        self.assertEqual(staged_order.payment_status, "Unpaid")
        self.assertFalse(staged_order.stock_deducted)

        # Verify stock was NOT deducted prematurely
        self.db.refresh(self.item1)
        self.assertEqual(self.item1.quantity, initial_qty)

        # Verify PaymentTransaction audit log was created
        txn = self.db.query(PaymentTransaction).filter(PaymentTransaction.cf_order_id == cf_order_id).first()
        self.assertIsNotNone(txn)
        self.assertEqual(txn.status, "PENDING")
        self.assertEqual(txn.gateway, "Cashfree")

    def test_03_payment_settlement_idempotency_and_no_double_deductions(self):
        """
        Enterprise Standard: When payment succeeds (via polling or webhook),
        stock is deducted exactly once. Repeated or duplicate webhook/verification calls
        must be completely idempotent and NEVER double-deduct stock.
        """
        # Stage order
        order = Order(
            customer_id=None,
            user_id=1,
            status="Pending",
            stock_deducted=False,
            payment_status="Unpaid",
            payment_method="QR Code",
            payment_gateway="Cashfree",
            cf_order_id="CF_ORD_IDEMPOTENT_TEST",
            tax_rate=0.18,
            discount_amount=0.0,
            created_at=datetime.datetime.utcnow()
        )
        self.db.add(order)
        self.db.flush()

        item = OrderItem(
            order_id=order.id,
            inventory_id=self.item1.id,
            quantity=3,
            price_at_time=self.item1.selling_price
        )
        self.db.add(item)

        txn = PaymentTransaction(
            order_id=order.id,
            cf_order_id="CF_ORD_IDEMPOTENT_TEST",
            payment_session_id="session_idem_123",
            amount=10500.0,
            currency="INR",
            status="PENDING",
            gateway="Cashfree"
        )
        self.db.add(txn)
        self.db.commit()

        initial_qty = self.item1.quantity

        with patch("httpx.AsyncClient", MockAsyncClient):
            import asyncio
            # First settlement trigger (e.g. User closes modal / frontend verification)
            success1, msg1, ord_data1 = asyncio.run(CashfreeService.verify_and_settle_order(
                db=self.db,
                cf_order_id="CF_ORD_IDEMPOTENT_TEST",
                user_name="Cashfree Settle"
            ))
            self.assertTrue(success1)

            # Check stock deduction
            self.db.refresh(self.item1)
            self.assertEqual(self.item1.quantity, initial_qty - 3)

            # Second settlement trigger (e.g. Asynchronous Webhook arrives 2 seconds later)
            success2, msg2, ord_data2 = asyncio.run(CashfreeService.verify_and_settle_order(
                db=self.db,
                cf_order_id="CF_ORD_IDEMPOTENT_TEST",
                user_name="Cashfree Webhook"
            ))
            self.assertTrue(success2)
            self.assertIn("already verified", msg2.lower())

            # Third settlement trigger (e.g. Cashier clicks Verify Status again)
            success3, msg3, ord_data3 = asyncio.run(CashfreeService.verify_and_settle_order(
                db=self.db,
                cf_order_id="CF_ORD_IDEMPOTENT_TEST",
                user_name="Manual Check"
            ))
            self.assertTrue(success3)

            # CRITICAL ENTERPRISE ASSERTION: Stock was deducted ONLY ONCE (-3, not -6 or -9)
            self.db.refresh(self.item1)
            self.assertEqual(self.item1.quantity, initial_qty - 3)

    def test_04_webhook_hmac_sha256_anti_tamper_security(self):
        """Enterprise Security: Validates HMAC-SHA256 signatures and detects tampering or forged payloads."""
        secret = "super_enterprise_cashfree_secret_key_87654"
        settings.CASHFREE_SECRET_KEY = secret
        timestamp = "1731195000"
        raw_body = b'{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_id":"CF_123"}}}'

        # Compute valid signature: Base64(HMAC-SHA256(timestamp + raw_body))
        data_to_sign = f"{timestamp}".encode("utf-8") + raw_body
        valid_signature = base64.b64encode(
            hmac.new(secret.encode("utf-8"), data_to_sign, hashlib.sha256).digest()
        ).decode("utf-8")

        # 1. Genuine webhook payload
        self.assertTrue(
            CashfreeService.verify_webhook_signature(
                raw_body=raw_body,
                signature=valid_signature,
                timestamp=timestamp
            )
        )

        # 2. Tampered payload with original signature
        tampered_body = b'{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_id":"CF_TAMPERED"}}}'
        self.assertFalse(
            CashfreeService.verify_webhook_signature(
                raw_body=tampered_body,
                signature=valid_signature,
                timestamp=timestamp
            )
        )

        # 3. Forged signature
        self.assertFalse(
            CashfreeService.verify_webhook_signature(
                raw_body=raw_body,
                signature="invalid_forged_base64_signature==",
                timestamp=timestamp
            )
        )

    def test_05_stock_validation_prevents_overselling(self):
        """Enterprise Resilience: Orders exceeding current available inventory are strictly rejected."""
        # Current stock is 50, customer attempts to order 999
        payload = OrderCreate(
            customer_name="Bulk Buyer",
            payment_status="Paid",
            payment_method="Cash",
            items=[OrderItemCreate(inventory_id=self.item1.id, quantity=999)]
        )

        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            order_service.create_order(
                db=self.db,
                payload=payload,
                user_id=1,
                user_name="Cashier"
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Insufficient Stock", ctx.exception.detail)

if __name__ == "__main__":
    unittest.main()
