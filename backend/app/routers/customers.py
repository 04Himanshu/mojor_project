from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.customer import CustomerResponse, CustomerCreate
from app.services import customer_service

router = APIRouter()

@router.get("/", response_model=List[CustomerResponse])
def get_customers(db: Session = Depends(get_db)):
    """Retrieve all registered customers."""
    return customer_service.get_customers(db)

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Retrieve a single customer by ID."""
    return customer_service.get_customer_by_id(db, customer_id)

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    """Add a new customer."""
    return customer_service.create_customer(db, payload)
