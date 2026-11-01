from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.inventory import Inventory
from app.models.customer import Customer
from app.services import inventory_service, order_service
from datetime import datetime, date, timedelta
from typing import Dict, Any, List

def calculate_order_total(order: Order) -> float:
    subtotal = sum(float(item.quantity * item.price_at_time) for item in order.items)
    tax_rate = float(getattr(order, "tax_rate", 0.0) or 0.0)
    tax_amount = subtotal * tax_rate
    discount_amount = float(getattr(order, "discount_amount", 0.0) or 0.0)
    return max(0.0, round(subtotal + tax_amount - discount_amount, 2))

def get_dashboard_analytics(db: Session) -> Dict[str, Any]:
    """
    Computes comprehensive sales insights, revenue trends, top-selling items,
    payment channel distributions, and inventory KPIs directly from live DB.
    """
    today = date.today()
    all_orders = (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.item),
            joinedload(Order.customer),
            joinedload(Order.user)
        )
        .order_by(desc(Order.created_at))
        .all()
    )
    active_orders = [o for o in all_orders if (o.status or "").capitalize() != "Cancelled"]

    # 1. High-level Sales & Operations KPIs
    today_orders_list = [o for o in active_orders if o.created_at and o.created_at.date() == today]
    today_revenue = round(sum(calculate_order_total(o) for o in today_orders_list), 2)
    today_orders_count = len(today_orders_list)

    total_revenue = round(sum(calculate_order_total(o) for o in active_orders), 2)
    total_orders_count = len(active_orders)
    aov = round(total_revenue / total_orders_count, 2) if total_orders_count > 0 else 0.0

    total_units_sold = sum(
        sum(item.quantity for item in o.items)
        for o in active_orders
    )

    inv_stats = inventory_service.get_inventory_stats(db)
    low_stock_alerts = inventory_service.get_low_stock_alerts(db)

    # 2. Daily Sales Trend (Last 7 Days)
    # Build 7-day calendar window up to today
    days_window = [today - timedelta(days=i) for i in range(6, -1, -1)]
    trend_map = {d: {"revenue": 0.0, "orders": 0, "units": 0} for d in days_window}

    for order in active_orders:
        if order.created_at:
            o_date = order.created_at.date()
            if o_date in trend_map:
                tot = calculate_order_total(order)
                units = sum(item.quantity for item in order.items)
                trend_map[o_date]["revenue"] = round(trend_map[o_date]["revenue"] + tot, 2)
                trend_map[o_date]["orders"] += 1
                trend_map[o_date]["units"] += units

    sales_trend = []
    for d in days_window:
        sales_trend.append({
            "name": d.strftime("%d %b"), # e.g. "26 Oct"
            "day": d.strftime("%a"),    # e.g. "Mon"
            "full_date": d.isoformat(),
            "revenue": trend_map[d]["revenue"],
            "orders": trend_map[d]["orders"],
            "units": trend_map[d]["units"]
        })

    # If all 7 days have 0 (e.g. seed data is from prior dates), populate with actual order dates
    if all(t["revenue"] == 0 for t in sales_trend) and active_orders:
        # Group by all actual dates from existing orders
        date_groups: Dict[date, Dict[str, Any]] = {}
        for order in active_orders:
            if order.created_at:
                od = order.created_at.date()
                if od not in date_groups:
                    date_groups[od] = {"revenue": 0.0, "orders": 0, "units": 0}
                tot = calculate_order_total(order)
                date_groups[od]["revenue"] = round(date_groups[od]["revenue"] + tot, 2)
                date_groups[od]["orders"] += 1
                date_groups[od]["units"] += sum(i.quantity for i in order.items)
        
        sorted_dates = sorted(date_groups.keys())
        sales_trend = [
            {
                "name": d.strftime("%d %b"),
                "day": d.strftime("%a"),
                "full_date": d.isoformat(),
                "revenue": date_groups[d]["revenue"],
                "orders": date_groups[d]["orders"],
                "units": date_groups[d]["units"]
            }
            for d in sorted_dates
        ]

    # 3. Top-Selling Products (Ranked by Quantity Sold & Revenue)
    top_items_query = (
        db.query(
            Inventory.id,
            Inventory.name,
            Inventory.sku,
            Inventory.category,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.quantity * OrderItem.price_at_time).label("revenue")
        )
        .join(OrderItem, Inventory.id == OrderItem.inventory_id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status != "Cancelled")
        .group_by(Inventory.id, Inventory.name, Inventory.sku, Inventory.category)
        .order_by(desc("units_sold"), desc("revenue"))
        .limit(5)
        .all()
    )

    top_products = [
        {
            "id": row.id,
            "name": row.name,
            "sku": row.sku,
            "category": row.category or "General",
            "units_sold": int(row.units_sold or 0),
            "revenue": round(float(row.revenue or 0.0), 2)
        }
        for row in top_items_query
    ]

    # 4. Payment Method Distribution (Cash, Card, UPI, etc.)
    payment_map: Dict[str, Dict[str, Any]] = {}
    for o in active_orders:
        method = (o.payment_method or "Cash").strip()
        if method not in payment_map:
            payment_map[method] = {"name": method, "count": 0, "value": 0.0}
        payment_map[method]["count"] += 1
        payment_map[method]["value"] = round(payment_map[method]["value"] + calculate_order_total(o), 2)

    payment_distribution = list(payment_map.values())
    # Sort by total value descending
    payment_distribution.sort(key=lambda x: x["value"], reverse=True)

    # 5. Sales by Category
    category_sales_query = (
        db.query(
            Inventory.category,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.quantity * OrderItem.price_at_time).label("revenue")
        )
        .join(OrderItem, Inventory.id == OrderItem.inventory_id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status != "Cancelled")
        .group_by(Inventory.category)
        .order_by(desc("revenue"))
        .all()
    )

    category_sales = [
        {
            "category": row.category or "General",
            "units_sold": int(row.units_sold or 0),
            "revenue": round(float(row.revenue or 0.0), 2)
        }
        for row in category_sales_query
    ]

    # 6. Recent Walk-in Transactions (Last 5)
    recent_transactions = []
    for o in all_orders[:6]:
        cust_name = o.customer.name if o.customer else "Walk-in Customer"
        cashier = o.user.name if o.user else "Staff"
        items_summary = ", ".join(f"{i.quantity}x {i.item.name if i.item else 'Item'}" for i in o.items[:2])
        if len(o.items) > 2:
            items_summary += f" +{len(o.items) - 2} more"

        recent_transactions.append({
            "id": o.id,
            "order_number": f"ORD-{o.id:04d}",
            "customer_name": cust_name,
            "user_name": cashier,
            "created_at": o.created_at.isoformat() if o.created_at else datetime.utcnow().isoformat(),
            "total_amount": calculate_order_total(o),
            "payment_method": o.payment_method or "Cash",
            "payment_status": o.payment_status or "Paid",
            "status": o.status or "Completed",
            "items_count": sum(i.quantity for i in o.items),
            "items_summary": items_summary
        })

    # 7. Inventory Stock by Category (aggregated via SQL)
    category_stock_rows = (
        db.query(
            Inventory.category,
            func.sum(Inventory.quantity).label("total_qty")
        )
        .filter(Inventory.is_active == True)
        .group_by(Inventory.category)
        .all()
    )
    category_distribution = [
        {"name": row.category or "Other", "value": int(row.total_qty or 0)}
        for row in category_stock_rows
    ]

    return {
        # Sales KPIs
        "sales_kpis": {
            "today_revenue": today_revenue,
            "today_orders": today_orders_count,
            "total_revenue": total_revenue,
            "total_orders": total_orders_count,
            "aov": aov,
            "total_units_sold": total_units_sold,
        },
        # Inventory KPIs
        "stock_value": inv_stats["total_stock_value"],
        "total_skus": inv_stats["total_skus"],
        "in_stock_count": inv_stats["in_stock_count"],
        "low_stock_count": inv_stats["low_stock_count"],
        "out_of_stock_count": inv_stats["out_of_stock_count"],
        "critical_alert_count": inv_stats["low_stock_count"] + inv_stats["out_of_stock_count"],
        
        # Charts Data
        "sales_trend": sales_trend,
        "top_products": top_products,
        "payment_distribution": payment_distribution,
        "category_sales": category_sales,
        "category_distribution": category_distribution,
        
        # Lists
        "recent_transactions": recent_transactions,
        "replenishment_alerts": low_stock_alerts
    }
