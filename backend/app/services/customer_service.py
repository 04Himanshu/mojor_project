from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate
from typing import List

def get_customers(db: Session) -> List[Customer]:
    return db.query(Customer).order_by(Customer.name.asc()).all()

def get_customer_by_id(db: Session, customer_id: int) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer #{customer_id} not found.")
    return customer

def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    existing = db.query(Customer).filter(Customer.email == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Customer with email '{payload.email}' already exists.")
    
    new_customer = Customer(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone.strip(),
        address=payload.address.strip() if payload.address else None
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

def seed_default_customers_if_empty(db: Session):
    if db.query(Customer).count() > 0:
        return
    
    samples = [
        Customer(name="Acme Corporation (Alice Johnson)", email="alice@acmecorp.com", phone="+1-555-0192", address="100 Tech Blvd, Suite 400, San Jose, CA"),
        Customer(name="Nexus Logistics (Rahul Sharma)", email="rahul@nexuslogistics.in", phone="+91-98765-43210", address="Plot 42, Sector 18, Gurugram, India"),
        Customer(name="Global Workspace Solutions (John Miller)", email="john@globalworkspace.com", phone="+44-20-7946-0912", address="14 Baker Street, London, UK"),
        Customer(name="BlueSky Enterprises (Priya Patel)", email="priya@bluesky.com", phone="+91-98111-22334", address="45 Residency Road, Bengaluru, India")
    ]
    db.add_all(samples)
    db.commit()