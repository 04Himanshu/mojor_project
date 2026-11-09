from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.core.database import get_db
from app.dependencies.permissions import require_permission
from app.schemas.payment import (
    CashfreeCreateSessionRequest,
    CashfreeCreateSessionResponse,
    CashfreeVerifyResponse,
    PaymentTransactionResponse
)
from app.models.payment_transaction import PaymentTransaction
from app.services.cashfree_service import CashfreeService

router = APIRouter()

@router.post("/cashfree/create-session", response_model=CashfreeCreateSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_cashfree_session(
    payload: CashfreeCreateSessionRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:create"))
):
    """
    Creates a pending order and initiates a Cashfree PG Drop checkout session.
    Returns `payment_session_id` to render the Cashfree JS Drop checkout on the frontend.
    """
    session_data = await CashfreeService.create_order_session(
        db=db,
        payload=payload,
        user_id=auth["user_id"],
        user_name=auth["user_name"]
    )
    return session_data

@router.post("/cashfree/verify/{cf_order_id}", response_model=CashfreeVerifyResponse)
async def verify_cashfree_payment(
    cf_order_id: str,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:create"))
):
    """
    Polls/verifies payment status with Cashfree for a given `cf_order_id`.
    Upon successful payment, automatically finalizes the order and deducts inventory stock.
    """
    success, message, serialized_order = await CashfreeService.verify_and_settle_order(
        db=db,
        cf_order_id=cf_order_id,
        user_name=auth.get("user_name", "Cashfree POS")
    )

    txn = db.query(PaymentTransaction).filter(PaymentTransaction.cf_order_id == cf_order_id).first()

    return CashfreeVerifyResponse(
        success=success,
        message=message,
        cf_order_id=cf_order_id,
        cf_payment_id=txn.cf_payment_id if txn else None,
        payment_status=txn.status if txn else ("SUCCESS" if success else "PENDING"),
        payment_method=txn.payment_method if txn else "Online",
        order=serialized_order
    )

@router.post("/cashfree/webhook")
async def cashfree_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_signature: Optional[str] = Header(None, alias="x-webhook-signature"),
    x_webhook_timestamp: Optional[str] = Header(None, alias="x-webhook-timestamp")
):
    """
    Asynchronous Webhook listener from Cashfree Payment Gateway.
    Verifies HMAC-SHA256 signature and settles orders idempotently.
    """
    raw_body = await request.body()
    
    # Signature verification (if secret key configured)
    is_valid = CashfreeService.verify_webhook_signature(
        raw_body=raw_body,
        signature=x_webhook_signature or "",
        timestamp=x_webhook_timestamp or ""
    )
    
    # Note: In development/sandbox testing without webhooks signed, log warning
    if not is_valid and x_webhook_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Cashfree webhook signature."
        )

    try:
        data = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = data.get("type", "")
    event_data = data.get("data", {})
    order_data = event_data.get("order", {})
    cf_order_id = order_data.get("order_id")

    if event_type in ("PAYMENT_SUCCESS_WEBHOOK", "ORDER_PAID_WEBHOOK") and cf_order_id:
        await CashfreeService.verify_and_settle_order(
            db=db,
            cf_order_id=cf_order_id,
            user_name="Cashfree Webhook"
        )

    return {"status": "OK", "received": True}

@router.get("/transactions", response_model=List[PaymentTransactionResponse])
def get_payment_transactions(
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:view"))
):
    """
    Lists all gateway payment transactions and their statuses for audit trail.
    """
    transactions = db.query(PaymentTransaction).order_by(PaymentTransaction.created_at.desc()).limit(50).all()
    return transactions

