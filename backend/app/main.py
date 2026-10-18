from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import engine, Base, SessionLocal
from app.routers import customers, inventory, orders, dashboard, users, procurement, auth
import app.models  # Ensures all models are registered
from app.services import inventory_service, customer_service, order_service, procurement_service, user_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        inventory_service.seed_default_data_if_empty(db)
        customer_service.seed_default_customers_if_empty(db)
        order_service.seed_default_orders_if_empty(db)
        procurement_service.seed_default_procurement_data_if_empty(db)
        user_service.seed_default_users_and_roles_if_empty(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="Enterprise Operations Manager (EOM)",
    description="Core Inventory & Warehouse Management API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["Customers"])
app.include_router(orders.router, prefix="/api/v1/orders", tags=["Orders"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(procurement.router, prefix="/api/v1/procurement", tags=["Procurement & Vendors"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Enterprise Operations Manager API",
        "docs": "/docs",
        "version": "1.0.0"
    }