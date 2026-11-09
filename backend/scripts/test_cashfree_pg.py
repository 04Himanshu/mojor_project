import os
import sys
import unittest
import base64
import hmac
import hashlib

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.services.cashfree_service import CashfreeService
from app.schemas.payment import (
    CashfreeCreateSessionRequest,
    CashfreeCreateSessionResponse,
    CashfreeVerifyResponse
)
from app.main import app

class TestCashfreeIntegration(unittest.TestCase):
    def test_cashfree_config_and_headers(self):
        headers = CashfreeService.get_headers()
        self.assertIn("x-client-id", headers)
        self.assertIn("x-client-secret", headers)
        self.assertIn("x-api-version", headers)
        self.assertEqual(headers["x-api-version"], "2023-08-01")
        self.assertEqual(headers["Content-Type"], "application/json")

    def test_webhook_signature_verification(self):
        secret = "test_merchant_secret_12345"
        settings.CASHFREE_SECRET_KEY = secret
        timestamp = "1731165000"
        payload = b'{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_id":"CF_ORD_TEST"}}}'

        data_to_sign = f"{timestamp}".encode("utf-8") + payload
        valid_signature = base64.b64encode(
            hmac.new(secret.encode("utf-8"), data_to_sign, hashlib.sha256).digest()
        ).decode("utf-8")

        # Valid signature
        self.assertTrue(
            CashfreeService.verify_webhook_signature(
                raw_body=payload,
                signature=valid_signature,
                timestamp=timestamp
            )
        )

        # Tampered body signature
        self.assertFalse(
            CashfreeService.verify_webhook_signature(
                raw_body=b'{"tampered":true}',
                signature=valid_signature,
                timestamp=timestamp
            )
        )

    def test_registered_api_routes(self):
        paths = list(app.openapi()["paths"].keys())
        self.assertIn("/api/v1/payments/cashfree/create-session", paths)
        self.assertIn("/api/v1/payments/cashfree/verify/{cf_order_id}", paths)
        self.assertIn("/api/v1/payments/cashfree/webhook", paths)
        self.assertIn("/api/v1/payments/transactions", paths)

    def test_schema_serialization(self):
        session_res = CashfreeCreateSessionResponse(
            payment_session_id="session_dummy_123",
            cf_order_id="CF_ORD_TEST_99",
            order_amount=450.0,
            order_currency="INR",
            order_status="ACTIVE",
            environment="sandbox"
        )
        self.assertEqual(session_res.payment_session_id, "session_dummy_123")
        self.assertEqual(session_res.order_amount, 450.0)

        verify_res = CashfreeVerifyResponse(
            success=True,
            message="Payment completed",
            cf_order_id="CF_ORD_TEST_99",
            payment_status="SUCCESS"
        )
        self.assertTrue(verify_res.success)
        self.assertEqual(verify_res.payment_status, "SUCCESS")

if __name__ == "__main__":
    unittest.main()
