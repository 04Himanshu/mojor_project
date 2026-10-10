from fastapi import FastAPI
from app.routers import customers, inventory, orders, dashboard, users

app = FastAPI(title="Enterprise Operations Manager")

app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["inventory"])
app.include_router(orders.router, prefix="/api/v1/orders", tags=["orders"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Enterprise Operations Manager API"}