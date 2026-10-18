from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.inventory import Inventory
from app.services import inventory_service

router = APIRouter()

@router.get("/")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Calculate dashboard summary and low-stock alerts dynamically from current database quantities."""
    stats = inventory_service.get_inventory_stats(db)
    low_stock_items = inventory_service.get_low_stock_alerts(db)

    # Category breakdown for charts
    items = db.query(Inventory).filter(Inventory.is_active == True).all()
    category_map = {}
    for item in items:
        cat = item.category or "Other"
        category_map[cat] = category_map.get(cat, 0) + item.quantity

    category_data = [{"name": cat, "value": qty} for cat, qty in category_map.items()]

    return {
        "stock_value": stats["total_stock_value"],
        "total_skus": stats["total_skus"],
        "in_stock_count": stats["in_stock_count"],
        "low_stock_count": stats["low_stock_count"],
        "out_of_stock_count": stats["out_of_stock_count"],
        "critical_alert_count": stats["low_stock_count"] + stats["out_of_stock_count"],
        "category_distribution": category_data,
        "replenishment_alerts": low_stock_items
    }
