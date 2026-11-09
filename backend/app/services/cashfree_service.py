import httpx
import hmac
import hashlib
import base64
import json
import uuid
import datetime
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.inventory import Inventory
from app.models.customer import Customer
from app.models.stock_movement import StockMovement
from app.models.payment_transaction import PaymentTransaction
from app.schemas.payment import CashfreeCreateSessionRequest
from app.services import order_service

class CashfreeService:
    @staticmethod
    def get_headers() -> Dict[str, str]:
        return {
            "x-client-id": settings.CASHFREE_APP_ID,
            "x-client-secret": settings.CASHFREE_SECRET_KEY,
            "x-api-version": settings.CASHFREE_API_VERSION,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    @staticmethod
    async def create_order_session(
        db: Session,
        payload: CashfreeCreateSessionRequest,
        user_id: Optional[int] = None,
        user_name: str = "Staff Member"
    ) -> Dict[str, Any]:
        """
        1. Validates stock availability for requested items without deducting yet.
        2. Resolves or provisions customer.
        3. Creates a 'Pending' / 'Unpaid' Order in the database.
        4. Calls Cashfree PG API to create an order session.
        5. Saves PaymentTransaction record and returns payment_session_id to frontend.
        """
        # Validate stock availability
        order_items_to_stage = []
        subtotal = 0.0
        for item_data in payload.items:
            inv_item = db.query(Inventory).filter(Inventory.id == item_data.inventory_id).first()
            if not inv_item:
                raise HTTPException(
                    status_code=400,
                    detail=f"Inventory item #{item_data.inventory_id} does not exist."
                )
            if not inv_item.is_active:
                raise HTTPException(
                    status_code=400,
                    detail=f"Item '{inv_item.name}' ({inv_item.sku}) is inactive."
                )
            if item_data.quantity <= 0:
                raise HTTPException(status_code=400, detail="Item quantity must be greater than 0.")
            if inv_item.quantity < item_data.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient Stock for '{inv_item.name}': only {inv_item.quantity} available."
                )
            line_subtotal = round(float(item_data.quantity * inv_item.selling_price), 2)
            subtotal += line_subtotal
            order_items_to_stage.append((inv_item, item_data.quantity, inv_item.selling_price))

        tax_rate = payload.tax_rate or 0.0
        tax_amount = round(subtotal * tax_rate, 2)
        discount_amount = float(payload.discount_amount or 0.0)
        total_amount = max(1.0, round(subtotal + tax_amount - discount_amount, 2))

        # Resolve or create Customer
        customer_id = payload.customer_id
        c_name = (payload.customer_name or "").strip() or "Walk-in Customer"
        c_phone = (payload.customer_phone or "").strip() or "9999999999"
        c_email = (payload.customer_email or "").strip().lower() or f"walkin_{int(datetime.datetime.utcnow().timestamp())}@pos.local"

        if not customer_id and (payload.customer_phone or payload.customer_email):
            existing_cust = None
            if payload.customer_email:
                existing_cust = db.query(Customer).filter(Customer.email == payload.customer_email.strip().lower()).first()
            elif payload.customer_phone:
                existing_cust = db.query(Customer).filter(Customer.phone == payload.customer_phone.strip()).first()

            if existing_cust:
                customer_id = existing_cust.id
            else:
                new_cust = Customer(
                    name=c_name,
                    email=c_email,
                    phone=c_phone,
                    address=payload.shipping_address or "Counter Handover"
                )
                db.add(new_cust)
                db.flush()
                customer_id = new_cust.id

        # Unique Cashfree Order ID (alphanumeric, max 45 chars)
        timestamp_str = datetime.datetime.utcnow().strftime("%y%m%d%H%M%S")
        unique_suffix = uuid.uuid4().hex[:6].upper()
        cf_order_id = f"CF_ORD_{timestamp_str}_{unique_suffix}"

        # Create staged Order in DB with status 'Pending' and payment_status 'Unpaid'
        chosen_method = payload.payment_method or "QR Code"
        staged_order = Order(
            customer_id=customer_id,
            user_id=user_id,
            status="Pending",
            stock_deducted=False,
            shipping_address=payload.shipping_address or "Counter Handover",
            notes=payload.notes,
            payment_status="Unpaid",
            payment_method=chosen_method,
            payment_gateway="Cashfree",
            cf_order_id=cf_order_id,
            tax_rate=tax_rate,
            discount_amount=discount_amount,
            created_at=datetime.datetime.utcnow()
        )
        db.add(staged_order)
        db.flush()

        for inv_item, qty, price in order_items_to_stage:
            oi = OrderItem(
                order_id=staged_order.id,
                inventory_id=inv_item.id,
                quantity=qty,
                price_at_time=price
            )
            db.add(oi)

        # Call Cashfree PG API
        base_url = settings.get_cashfree_base_url()
        clean_phone = "".join(filter(str.isdigit, c_phone))
        if len(clean_phone) < 10:
            clean_phone = "9999999999"
        else:
            clean_phone = clean_phone[-10:]

        cf_request_payload = {
            "order_id": cf_order_id,
            "order_amount": float(total_amount),
            "order_currency": "INR",
            "customer_details": {
                "customer_id": f"CUST_{customer_id or staged_order.id}",
                "customer_name": c_name[:100],
                "customer_email": c_email[:100],
                "customer_phone": clean_phone
            },
            "order_meta": {
                "return_url": f"{settings.CASHFREE_RETURN_URL}?cf_order_id={cf_order_id}",
                "payment_methods": "upi,cc,dc"
            },
            "order_note": f"Counter Order #{staged_order.id} POS Checkout ({chosen_method})"
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"{base_url}/orders",
                    headers=CashfreeService.get_headers(),
                    json=cf_request_payload
                )

            if response.status_code not in (200, 201):
                err_msg = response.text
                try:
                    err_json = response.json()
                    err_msg = err_json.get("message", response.text)
                except Exception:
                    pass
                db.rollback()
                if "authentication" in err_msg.lower():
                    err_msg = f"{err_msg}. Please ensure uvicorn backend server is restarted so the latest CASHFREE_APP_ID & CASHFREE_SECRET_KEY in .env are active."
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Cashfree Gateway Error: {err_msg}"
                )

            cf_data = response.json()
            payment_session_id = cf_data.get("payment_session_id")

            # Create PaymentTransaction record
            txn = PaymentTransaction(
                order_id=staged_order.id,
                cf_order_id=cf_order_id,
                payment_session_id=payment_session_id,
                amount=float(total_amount),
                currency="INR",
                status="PENDING",
                gateway="Cashfree",
                customer_name=c_name,
                customer_phone=clean_phone,
                customer_email=c_email,
                raw_response=json.dumps(cf_data)[:1000]
            )
            db.add(txn)
            db.commit()
            db.refresh(staged_order)

            return {
                "payment_session_id": payment_session_id,
                "cf_order_id": cf_order_id,
                "order_amount": float(total_amount),
                "order_currency": "INR",
                "order_status": cf_data.get("order_status", "ACTIVE"),
                "environment": settings.CASHFREE_ENVIRONMENT.lower()
            }

        except HTTPException:
            raise
        except Exception as exc:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initiate Cashfree payment session: {str(exc)}"
            )

    @staticmethod
    async def verify_and_settle_order(
        db: Session,
        cf_order_id: str,
        user_name: str = "Cashfree Gateway"
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Checks payment status with Cashfree:
        1. Fetches payment attempts from Cashfree GET /orders/{cf_order_id}/payments.
        2. If SUCCESS, idempotently deducts stock and marks Order as Paid & Completed.
        3. Updates PaymentTransaction record.
        """
        order = db.query(Order).filter(Order.cf_order_id == cf_order_id).first()
        if not order:
            return False, f"Order with Cashfree ID '{cf_order_id}' was not found.", None

        # If already finalized and stock deducted, return immediately (Idempotency)
        if order.payment_status == "Paid" and order.stock_deducted:
            return True, "Payment already verified and settled.", order_service.serialize_order(order)

        base_url = settings.get_cashfree_base_url()
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                # Query Cashfree for payment attempts on this order
                pay_resp = await client.get(
                    f"{base_url}/orders/{cf_order_id}/payments",
                    headers=CashfreeService.get_headers()
                )

            if pay_resp.status_code != 200:
                return False, f"Unable to fetch payment details from Cashfree: {pay_resp.text}", None

            payments = pay_resp.json()
            if not isinstance(payments, list) or len(payments) == 0:
                return False, "No payment attempts recorded for this order yet.", None

            # Find successful payment attempt
            success_pay = next(
                (p for p in payments if str(p.get("payment_status", "")).upper() == "SUCCESS"),
                None
            )

            txn = db.query(PaymentTransaction).filter(PaymentTransaction.cf_order_id == cf_order_id).first()

            if not success_pay:
                # Latest payment failed or user dropped
                latest = payments[-1]
                latest_status = latest.get("payment_status", "PENDING")
                if txn:
                    txn.status = latest_status
                    txn.raw_response = json.dumps(latest)[:1000]
                    db.commit()
                return False, f"Payment has not succeeded yet (Current status: {latest_status}).", None

            # Settle Order and Deduct Stock Atomically
            cf_payment_id = str(success_pay.get("cf_payment_id", ""))
            payment_group = success_pay.get("payment_group", "Online")
            payment_method_data = success_pay.get("payment_method", {})
            method_desc = payment_group
            if isinstance(payment_method_data, dict) and payment_method_data:
                method_desc = list(payment_method_data.keys())[0].upper()

            order.cf_payment_id = cf_payment_id
            order.payment_method = f"Cashfree ({method_desc})"
            order.payment_status = "Paid"
            order.status = "Completed"

            if not order.stock_deducted:
                # Deduct inventory stock and write audit movements
                for item in order.items:
                    inv_item = db.query(Inventory).filter(Inventory.id == item.inventory_id).with_for_update().first()
                    if inv_item:
                        prev_qty = inv_item.quantity
                        res_qty = max(0, prev_qty - item.quantity)
                        inv_item.quantity = res_qty
                        inv_item.updated_at = datetime.datetime.utcnow()

                        movement = StockMovement(
                            inventory_id=inv_item.id,
                            transaction_type="STOCK_OUT",
                            quantity=item.quantity,
                            previous_quantity=prev_qty,
                            resulting_quantity=res_qty,
                            reason=f"Cashfree POS Sale (Order #{order.id})",
                            reference_order=f"ORD-{order.id:04d}",
                            user_name=user_name,
                            created_at=datetime.datetime.utcnow()
                        )
                        db.add(movement)

                order.stock_deducted = True

            # Update PaymentTransaction
            if txn:
                txn.cf_payment_id = cf_payment_id
                txn.status = "SUCCESS"
                txn.payment_method = method_desc
                txn.payment_time = datetime.datetime.utcnow()
                txn.raw_response = json.dumps(success_pay)[:1000]

            db.commit()
            db.refresh(order)
            return True, "Payment verified and inventory stock deducted successfully.", order_service.serialize_order(order)

        except Exception as exc:
            db.rollback()
            return False, f"Settlement processing failed: {str(exc)}", None

    @staticmethod
    def verify_webhook_signature(
        raw_body: bytes,
        signature: str,
        timestamp: str
    ) -> bool:
        """
        Verifies Cashfree webhook signature using HMAC-SHA256:
        signature = Base64(HMAC-SHA256(timestamp + raw_body, secret_key))
        """
        if not signature or not timestamp or not settings.CASHFREE_SECRET_KEY:
            return False
        try:
            secret = settings.CASHFREE_SECRET_KEY.encode("utf-8")
            data_to_sign = f"{timestamp}".encode("utf-8") + raw_body
            computed = base64.b64encode(
                hmac.new(secret, data_to_sign, hashlib.sha256).digest()
            ).decode("utf-8")
            return hmac.compare_digest(computed, signature)
        except Exception:
            return False

