from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.dependencies.permissions import require_permission
from app.schemas.customer import CustomerResponse, CustomerCreate
from app.services import customer_service

router = APIRouter()

@router.get("/", response_model=List[CustomerResponse])
def get_customers(
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:view"))
):
    """Retrieve all registered customers. Requires 'orders:view'."""
    return customer_service.get_customers(db)

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:view"))
):
    """Retrieve a single customer by ID. Requires 'orders:view'."""
    return customer_service.get_customer_by_id(db, customer_id)

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("orders:create"))
):
    """Add a new customer. Requires 'orders:create'."""
    return customer_service.create_customer(db, payload)
