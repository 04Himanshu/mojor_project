import urllib.request
import urllib.error
import json
import sys
import time
from pathlib import Path

# Ensure app package is importable for direct DB cleanup
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

BASE_URL = "http://127.0.0.1:8000"
API_URL = f"{BASE_URL}/api/v1"

passed_count = 0
failed_count = 0

def is_error(res):
    if isinstance(res, dict) and res.get("_error") is True:
        return True
    return False

def get_field(res, key, default=None):
    if isinstance(res, dict):
        return res.get(key, default)
    return default

def log_test(module: str, test_name: str, passed: bool, detail: str = ""):
    global passed_count, failed_count
    status_str = "[PASS]" if passed else "[FAIL]"
    if passed:
        passed_count += 1
        print(f"  {status_str} {module} -> {test_name} {f'({detail})' if detail else ''}")
    else:
        failed_count += 1
        print(f"  {status_str} {module} -> {test_name}: {detail}")

CURRENT_AUTH_TOKEN = None

def http_req(url, method="GET", data=None, headers=None):
    req_headers = {"Content-Type": "application/json"}
    if CURRENT_AUTH_TOKEN:
        req_headers["Authorization"] = f"Bearer {CURRENT_AUTH_TOKEN}"
    if headers:
        for k, v in headers.items():
            if v == "" and k in req_headers:
                del req_headers[k]
            else:
                req_headers[k] = v
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content_type = resp.headers.get("Content-Type", "")
            raw = resp.read()
            if not raw or resp.status == 204:
                return None
            if "application/json" in content_type:
                return json.loads(raw.decode("utf-8"))
            return raw.decode("utf-8")
    except urllib.error.HTTPError as e:
        raw_err = e.read().decode("utf-8")
        try:
            err_json = json.loads(raw_err)
        except Exception:
            err_json = {"raw": raw_err}
        return {"_error": True, "status_code": e.code, "detail": err_json}
    except Exception as e:
        return {"_error": True, "status_code": 500, "detail": str(e)}

def run_suite():
    global passed_count, failed_count
    passed_count = 0
    failed_count = 0

    print("=" * 70)
    print("STARTING FULL END-TO-END BACKEND TEST SUITE")
    print(f"Target: {BASE_URL}")
    print("=" * 70)

    # ==========================================
    # 1. CORE / SYSTEM HEALTH
    # ==========================================
    print("\n--- 1. Testing Core & Health Endpoints ---")
    root_res = http_req(f"{BASE_URL}/")
    log_test("Core", "GET / (Root API info)", not is_error(root_res) and "version" in root_res, f"Version: {get_field(root_res, 'version')}")

    # ==========================================
    # 2. AUTHENTICATION MODULE
    # ==========================================
    print("\n--- 2. Testing Authentication Module (/api/v1/auth) ---")
    # Reset test rate limit in dev mode
    http_req(f"{API_URL}/auth/test-reset-rate-limit", method="POST")
    # Demo accounts
    demos = http_req(f"{API_URL}/auth/demo-accounts")
    log_test("Auth", "GET /auth/demo-accounts", not is_error(demos) and isinstance(demos, list) and len(demos) > 0, f"Found {len(demos)} demo accounts")

    # Valid Login
    login_res = http_req(f"{API_URL}/auth/login", method="POST", data={
        "email": "himanshu123@gmail.com",
        "password": "admin123"
    })
    admin_token = None
    if not is_error(login_res) and "access_token" in login_res:
        admin_token = login_res["access_token"]
        global CURRENT_AUTH_TOKEN
        CURRENT_AUTH_TOKEN = admin_token
        log_test("Auth", "POST /auth/login (Admin Credentials)", True, f"Logged in as {login_res['user']['name']} ({login_res['user']['role_name']})")
    else:
        log_test("Auth", "POST /auth/login (Admin Credentials)", False, str(login_res))

    # Invalid Password Rejection
    bad_login = http_req(f"{API_URL}/auth/login", method="POST", data={
        "email": "himanshu123@gmail.com",
        "password": "wrong_password_999"
    })
    log_test("Auth", "POST /auth/login (Reject Invalid Password)", is_error(bad_login) and get_field(bad_login, "status_code") == 401)

    # GET /me with Bearer Token
    if admin_token:
        me_res = http_req(f"{API_URL}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        log_test("Auth", "GET /auth/me (Valid Bearer Token)", not is_error(me_res) and get_field(me_res, "email") == "himanshu123@gmail.com")

    # GET /me without Token (Expect 401)
    no_token_res = http_req(f"{API_URL}/auth/me", headers={"Authorization": ""})
    log_test("Auth", "GET /auth/me (Reject Missing Token)", is_error(no_token_res) and get_field(no_token_res, "status_code") == 401)

    # ==========================================
    # 3. USERS & RBAC MODULE
    # ==========================================
    print("\n--- 3. Testing Users & RBAC Module (/api/v1/users) ---")
    user_stats = http_req(f"{API_URL}/users/stats")
    log_test("Users", "GET /users/stats", not is_error(user_stats) and "total_users" in user_stats, f"Total Users: {get_field(user_stats, 'total_users')}, Active: {get_field(user_stats, 'active_users')}")

    perms = http_req(f"{API_URL}/users/permissions")
    log_test("Users", "GET /users/permissions", not is_error(perms) and "all_permissions" in perms, f"{len(get_field(perms, 'all_permissions', []))} permissions cataloged")

    roles = http_req(f"{API_URL}/users/roles")
    log_test("Users", "GET /users/roles", not is_error(roles) and isinstance(roles, list) and len(roles) > 0, f"Found {len(roles)} roles")

    # Create Custom Role
    test_role_name = f"Test QA Auditor {int(time.time())}"
    create_role_res = http_req(f"{API_URL}/users/roles", method="POST", data={
        "name": test_role_name,
        "description": "Automated test role for QA auditing",
        "color": "purple",
        "permissions": ["view_inventory", "view_audit_trail"]
    })
    test_role_id = get_field(create_role_res, "id")
    log_test("Users", "POST /users/roles (Create Role)", bool(test_role_id), f"Created Role ID: {test_role_id}")

    # Update Custom Role
    if test_role_id:
        update_role_res = http_req(f"{API_URL}/users/roles/{test_role_id}", method="PUT", data={
            "description": "Updated QA auditor description",
            "permissions": ["view_inventory", "view_audit_trail", "export_reports"]
        })
        log_test("Users", f"PUT /users/roles/{test_role_id} (Update Role)", not is_error(update_role_res) and len(get_field(update_role_res, "permissions", [])) == 3)

    # Create Staff User
    test_user_email = f"test_staff_{int(time.time())}@eom.com"
    first_role_id = roles[0]["id"] if isinstance(roles, list) and len(roles) > 0 else 1
    create_user_res = http_req(f"{API_URL}/users/", method="POST", data={
        "name": "Karan Malhotra",
        "email": test_user_email,
        "phone": "+91 98765 11223",
        "role_id": test_role_id if test_role_id else first_role_id,
        "department": "Quality Assurance",
        "avatar_color": "green",
        "password": "password123"
    })
    test_user_id = get_field(create_user_res, "id")
    log_test("Users", "POST /users/ (Create Staff User)", bool(test_user_id), f"Created User ID: {test_user_id} ({test_user_email})")

    # Get single user
    if test_user_id:
        get_user_res = http_req(f"{API_URL}/users/{test_user_id}")
        log_test("Users", f"GET /users/{test_user_id}", not is_error(get_user_res) and get_field(get_user_res, "name") == "Karan Malhotra")

        # Update User details
        update_user_res = http_req(f"{API_URL}/users/{test_user_id}", method="PUT", data={
            "phone": "+91 99999 88888",
            "department": "Operations & QA"
        })
        log_test("Users", f"PUT /users/{test_user_id} (Update Profile)", not is_error(update_user_res) and get_field(update_user_res, "phone") == "+91 99999 88888")

        # Patch User Status (Toggle Suspended)
        patch_status_res = http_req(f"{API_URL}/users/{test_user_id}/status", method="PATCH", data={"status": "Suspended"})
        log_test("Users", f"PATCH /users/{test_user_id}/status (Suspend)", not is_error(patch_status_res) and get_field(patch_status_res, "status") == "Suspended")

        # Patch User Status back to Active
        patch_status_res2 = http_req(f"{API_URL}/users/{test_user_id}/status", method="PATCH", data={"status": "Active"})
        log_test("Users", f"PATCH /users/{test_user_id}/status (Reactivate)", not is_error(patch_status_res2) and get_field(patch_status_res2, "status") == "Active")

        # Delete test user
        del_user_res = http_req(f"{API_URL}/users/{test_user_id}", method="DELETE")
        log_test("Users", f"DELETE /users/{test_user_id}", del_user_res is None or not is_error(del_user_res))

    # Delete custom test role
    if test_role_id:
        del_role_res = http_req(f"{API_URL}/users/roles/{test_role_id}", method="DELETE")
        log_test("Users", f"DELETE /users/roles/{test_role_id}", del_role_res is None or not is_error(del_role_res))

    # ==========================================
    # 4. CUSTOMERS MODULE
    # ==========================================
    print("\n--- 4. Testing Customers Module (/api/v1/customers) ---")
    customers_res = http_req(f"{API_URL}/customers/")
    log_test("Customers", "GET /customers/", not is_error(customers_res) and isinstance(customers_res, list), f"Found {len(customers_res)} customers")

    # Create new customer
    test_cust_email = f"customer_{int(time.time())}@enterprise.com"
    create_cust_res = http_req(f"{API_URL}/customers/", method="POST", data={
        "name": "Apex Global Solutions",
        "email": test_cust_email,
        "phone": "+91 91234 56789",
        "address": "Floor 7, Cyber City, Gurugram, India"
    })
    test_cust_id = get_field(create_cust_res, "id")
    log_test("Customers", "POST /customers/ (Create Customer)", bool(test_cust_id), f"Created Customer ID: {test_cust_id}")

    if test_cust_id:
        single_cust = http_req(f"{API_URL}/customers/{test_cust_id}")
        log_test("Customers", f"GET /customers/{test_cust_id}", not is_error(single_cust) and get_field(single_cust, "email") == test_cust_email)

    # ==========================================
    # 5. INVENTORY & STOCK MOVEMENTS MODULE
    # ==========================================
    print("\n--- 5. Testing Inventory & Stock Management Module (/api/v1/inventory) ---")
    inv_stats = http_req(f"{API_URL}/inventory/stats")
    log_test("Inventory", "GET /inventory/stats", not is_error(inv_stats) and "total_skus" in inv_stats, f"Total SKUs: {get_field(inv_stats, 'total_skus')}, Value: INR {get_field(inv_stats, 'total_stock_value')}")

    categories = http_req(f"{API_URL}/inventory/categories")
    log_test("Inventory", "GET /inventory/categories", not is_error(categories) and isinstance(categories, list), f"Categories: {categories}")

    low_stock = http_req(f"{API_URL}/inventory/alerts/low-stock")
    log_test("Inventory", "GET /inventory/alerts/low-stock", not is_error(low_stock) and isinstance(low_stock, list), f"Alerts count: {len(low_stock)}")

    inv_list = http_req(f"{API_URL}/inventory/?page=1&page_size=5")
    log_test("Inventory", "GET /inventory/ (Paginated List)", not is_error(inv_list) and "items" in inv_list, f"Total count: {get_field(inv_list, 'total')}")

    # Create new Inventory Item
    test_sku = f"TEST-ITEM-{int(time.time())}"
    create_inv_res = http_req(f"{API_URL}/inventory/", method="POST", data={
        "sku": test_sku,
        "name": "High-Density Storage Box (Heavy Duty)",
        "description": "Rugged stackable 60L storage container",
        "category": "Warehouse Supplies",
        "unit_of_measurement": "box",
        "cost_price": 450.0,
        "selling_price": 799.0,
        "initial_quantity": 50,
        "reorder_level": 15
    }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
    test_item_id = get_field(create_inv_res, "id")
    log_test("Inventory", "POST /inventory/ (Create Item with Initial Stock)", bool(test_item_id), f"Created Item ID: {test_item_id} (SKU: {test_sku})")

    if test_item_id:
        # GET single item
        single_item = http_req(f"{API_URL}/inventory/{test_item_id}")
        log_test("Inventory", f"GET /inventory/{test_item_id}", not is_error(single_item) and get_field(single_item, "quantity") == 50)

        # PUT update item
        update_inv_res = http_req(f"{API_URL}/inventory/{test_item_id}", method="PUT", data={
            "description": "Updated container specs with reinforced handles",
            "selling_price": 799.0,
            "reorder_level": 20
        }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
        log_test("Inventory", f"PUT /inventory/{test_item_id} (Update Details)", not is_error(update_inv_res) and get_field(update_inv_res, "selling_price") == 799.0)

        # Stock In (+20 units) -> 50 + 20 = 70
        stock_in_res = http_req(f"{API_URL}/inventory/{test_item_id}/stock-in", method="POST", data={
            "quantity": 20,
            "reason": "Replenishment shipment received",
            "user_name": "Himanshu Singh"
        }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
        in_qty = get_field(get_field(stock_in_res, "item"), "quantity")
        log_test("Inventory", f"POST /inventory/{test_item_id}/stock-in (+20)", not is_error(stock_in_res) and in_qty == 70, f"New Qty: {in_qty}")

        # Stock Out (-15 units) -> 70 - 15 = 55
        stock_out_res = http_req(f"{API_URL}/inventory/{test_item_id}/stock-out", method="POST", data={
            "quantity": 15,
            "reason": "Internal branch dispatch",
            "user_name": "Himanshu Singh"
        }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
        out_qty = get_field(get_field(stock_out_res, "item"), "quantity")
        log_test("Inventory", f"POST /inventory/{test_item_id}/stock-out (-15)", not is_error(stock_out_res) and out_qty == 55, f"New Qty: {out_qty}")

        # Stock Out exceeding quantity (should fail with 400)
        stock_out_excess = http_req(f"{API_URL}/inventory/{test_item_id}/stock-out", method="POST", data={
            "quantity": 9999,
            "reason": "Invalid excessive withdrawal",
            "user_name": "Himanshu Singh"
        }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
        log_test("Inventory", "POST /inventory/.../stock-out (Prevent Negative Stock)", is_error(stock_out_excess) and get_field(stock_out_excess, "status_code") == 400)

        # Stock Adjustment (Physical audit: reconcile to 60 units)
        adj_res = http_req(f"{API_URL}/inventory/{test_item_id}/adjustment", method="POST", data={
            "new_quantity": 60,
            "reason": "Monthly cycle count audit reconciliation",
            "user_name": "Himanshu Singh"
        }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
        adj_qty = get_field(get_field(adj_res, "item"), "quantity")
        log_test("Inventory", f"POST /inventory/{test_item_id}/adjustment (Set to 60)", not is_error(adj_res) and adj_qty == 60, f"Reconciled Qty: {adj_qty}")

        # Item Movements
        item_movs = http_req(f"{API_URL}/inventory/{test_item_id}/movements")
        log_test("Inventory", f"GET /inventory/{test_item_id}/movements", not is_error(item_movs) and isinstance(item_movs, list) and len(item_movs) >= 4, f"Found {len(item_movs)} movements")

        # Global movements
        all_movs = http_req(f"{API_URL}/inventory/movements/all?page=1&page_size=10")
        log_test("Inventory", "GET /inventory/movements/all", not is_error(all_movs) and "movements" in all_movs, f"Total Movements: {get_field(all_movs, 'total')}")

    # ==========================================
    # 6. ORDERS & INVOICING MODULE
    # ==========================================
    print("\n--- 6. Testing Orders & Invoicing Module (/api/v1/orders) ---")
    order_stats = http_req(f"{API_URL}/orders/stats")
    log_test("Orders", "GET /orders/stats", not is_error(order_stats) and "total_orders" in order_stats, f"Total Orders: {get_field(order_stats, 'total_orders')}, Revenue: INR {get_field(order_stats, 'total_revenue')}")

    orders_list = http_req(f"{API_URL}/orders/")
    log_test("Orders", "GET /orders/", not is_error(orders_list) and isinstance(orders_list, list), f"Found {len(orders_list)} existing orders")

    # Create Sales Order using the test customer and test inventory item
    order_payload = {
        "customer_id": test_cust_id,
        "shipping_address": "Floor 7, Cyber City, Gurugram, India",
        "payment_status": "Unpaid",
        "payment_method": "Net Banking",
        "tax_rate": 0.18,
        "discount_amount": 100.0,
        "notes": "Automated regression test sales order",
        "items": [
            {
                "inventory_id": test_item_id,
                "quantity": 10
            }
        ]
    }
    create_ord_res = http_req(f"{API_URL}/orders/", method="POST", data=order_payload, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
    test_order_id = get_field(create_ord_res, "id")
    log_test("Orders", "POST /orders/ (Create Order in 'Pending' state)", bool(test_order_id), f"Created Order ID: {test_order_id} ({get_field(create_ord_res, 'order_number')})")

    ord2_id = None
    if test_order_id:
        # GET single order
        single_ord = http_req(f"{API_URL}/orders/{test_order_id}")
        log_test("Orders", f"GET /orders/{test_order_id}", not is_error(single_ord) and get_field(single_ord, "status") == "Pending")

        # GET invoice
        invoice = http_req(f"{API_URL}/orders/{test_order_id}/invoice")
        log_test("Orders", f"GET /orders/{test_order_id}/invoice", not is_error(invoice) and "invoice_number" in invoice, f"Invoice #: {get_field(invoice, 'invoice_number')}, Total: INR {get_field(invoice, 'total_amount')}")

        # Transition Pending -> Confirmed (Deducts 10 units from test item: 60 -> 50)
        confirm_ord = http_req(f"{API_URL}/orders/{test_order_id}/status", method="PUT", data={
            "status": "Confirmed",
            "payment_status": "Paid"
        }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
        log_test("Orders", f"PUT /orders/{test_order_id}/status (Pending -> Confirmed)", not is_error(confirm_ord) and get_field(confirm_ord, "status") == "Confirmed")

        # Verify stock deducted: 60 - 10 = 50
        inv_after_confirm = http_req(f"{API_URL}/inventory/{test_item_id}")
        log_test("Orders", "Verify Inventory Decremented on Order Confirmation", not is_error(inv_after_confirm) and get_field(inv_after_confirm, "quantity") == 50, f"Quantity was 60 -> now {get_field(inv_after_confirm, 'quantity')}")

        # Transition Confirmed -> Dispatched
        dispatch_ord = http_req(f"{API_URL}/orders/{test_order_id}/status", method="PUT", data={
            "status": "Dispatched"
        }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
        log_test("Orders", f"PUT /orders/{test_order_id}/status (Confirmed -> Dispatched)", not is_error(dispatch_ord) and get_field(dispatch_ord, "status") == "Dispatched")

        # Transition Dispatched -> Delivered
        deliver_ord = http_req(f"{API_URL}/orders/{test_order_id}/status", method="PUT", data={
            "status": "Delivered"
        }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
        log_test("Orders", f"PUT /orders/{test_order_id}/status (Dispatched -> Delivered)", not is_error(deliver_ord) and get_field(deliver_ord, "status") == "Delivered")

        # Test Order Cancellation Stock Restoration:
        # Create second order to cancel and test restoration
        ord2_res = http_req(f"{API_URL}/orders/", method="POST", data={
            "customer_id": test_cust_id,
            "items": [{"inventory_id": test_item_id, "quantity": 5}]
        }, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
        ord2_id = get_field(ord2_res, "id")

        if ord2_id:
            # Confirm ord2 (stock 50 -> 45)
            http_req(f"{API_URL}/orders/{ord2_id}/status", method="PUT", data={"status": "Confirmed"}, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
            # Cancel ord2 (stock restored 45 -> 50)
            cancel_ord = http_req(f"{API_URL}/orders/{ord2_id}/status", method="PUT", data={"status": "Cancelled"}, headers={"X-User-Role": "Admin", "X-User-Name": "Himanshu Singh"})
            inv_after_cancel = http_req(f"{API_URL}/inventory/{test_item_id}")
            log_test("Orders", "Order Cancellation Restores Stock", not is_error(cancel_ord) and get_field(inv_after_cancel, "quantity") == 50, f"Stock restored to {get_field(inv_after_cancel, 'quantity')}")

    # ==========================================
    # 7. PROCUREMENT & VENDORS MODULE
    # ==========================================
    print("\n--- 7. Testing Procurement & Vendors Module (/api/v1/procurement) ---")
    proc_stats = http_req(f"{API_URL}/procurement/stats")
    log_test("Procurement", "GET /procurement/stats", not is_error(proc_stats) and "total_procurement_spend" in proc_stats, f"Total Spend: INR {get_field(proc_stats, 'total_procurement_spend')}")

    suppliers = http_req(f"{API_URL}/procurement/suppliers")
    log_test("Procurement", "GET /procurement/suppliers", not is_error(suppliers) and isinstance(suppliers, list), f"Found {len(suppliers)} suppliers")

    # Create Supplier
    sup_payload = {
        "name": f"Zenith Industrial Spares Ltd {int(time.time())}",
        "contact_person": "Pooja Hegde",
        "email": f"pooja_{int(time.time())}@zenithspares.com",
        "phone": "+91 98888 11111",
        "city": "Pune",
        "state": "Maharashtra",
        "country": "India",
        "postal_code": "411001",
        "gstin": "27AABCT9988C1ZR",
        "payment_terms": "Net 30",
        "rating": 4.8
    }
    create_sup_res = http_req(f"{API_URL}/procurement/suppliers", method="POST", data=sup_payload)
    test_sup_id = get_field(create_sup_res, "id")
    log_test("Procurement", "POST /procurement/suppliers (Create Vendor)", bool(test_sup_id), f"Created Supplier ID: {test_sup_id}")

    test_po_id = None
    if test_sup_id:
        # GET single supplier
        single_sup = http_req(f"{API_URL}/procurement/suppliers/{test_sup_id}")
        log_test("Procurement", f"GET /procurement/suppliers/{test_sup_id}", not is_error(single_sup) and get_field(single_sup, "city") == "Pune")

        # Update supplier
        update_sup = http_req(f"{API_URL}/procurement/suppliers/{test_sup_id}", method="PUT", data={"notes": "Preferred vendor for warehouse containers"})
        log_test("Procurement", f"PUT /procurement/suppliers/{test_sup_id}", not is_error(update_sup))

        # Create Purchase Order in Draft
        po_payload = {
            "supplier_id": test_sup_id,
            "status": "Draft",
            "payment_terms": "Net 30",
            "tax_rate": 0.18,
            "shipping_cost": 500.0,
            "notes": "Automated procurement batch test",
            "items": [
                {
                    "inventory_id": test_item_id,
                    "quantity_ordered": 25,
                    "unit_cost": 480.0
                }
            ]
        }
        create_po_res = http_req(f"{API_URL}/procurement/purchase-orders", method="POST", data=po_payload)
        test_po_id = get_field(create_po_res, "id")
        log_test("Procurement", "POST /procurement/purchase-orders", bool(test_po_id), f"Created PO ID: {test_po_id} ({get_field(create_po_res, 'po_number')})")

        po_items = get_field(create_po_res, "items")
        if test_po_id and po_items and len(po_items) > 0:
            po_item_id = po_items[0]["id"]

            # GET single PO
            single_po = http_req(f"{API_URL}/procurement/purchase-orders/{test_po_id}")
            log_test("Procurement", f"GET /procurement/purchase-orders/{test_po_id}", not is_error(single_po) and get_field(single_po, "status") == "Draft")

            # Update PO status to Issued
            patch_po = http_req(f"{API_URL}/procurement/purchase-orders/{test_po_id}/status", method="PATCH", data={"status": "Issued"})
            log_test("Procurement", f"PATCH /purchase-orders/{test_po_id}/status (Draft -> Issued)", not is_error(patch_po) and get_field(patch_po, "status") == "Issued")

            # Inward Goods via GRN (Receive 25 units)
            grn_payload = {
                "purchase_order_id": test_po_id,
                "carrier": "DHL Express Cargo",
                "tracking_number": "DHL-INW-7788",
                "delivery_challan_number": "DC-7788-01",
                "notes": "All 25 units passed physical quality inspection",
                "items": [
                    {
                        "purchase_order_item_id": po_item_id,
                        "quantity_received": 25,
                        "batch_lot_number": "LOT-ZEN-2026",
                        "condition_notes": "Mint condition"
                    }
                ]
            }
            grn_res = http_req(f"{API_URL}/procurement/goods-receipts", method="POST", data=grn_payload)
            log_test("Procurement", "POST /procurement/goods-receipts (GRN Inwarding)", not is_error(grn_res) and "grn_number" in grn_res, f"GRN #: {get_field(grn_res, 'grn_number')}")

            # Verify inventory increased by 25 (50 -> 75) and cost price updated to 480.0
            inv_after_grn = http_req(f"{API_URL}/inventory/{test_item_id}")
            qty_ok = get_field(inv_after_grn, "quantity") == 75
            cost_ok = get_field(inv_after_grn, "cost_price") == 480.0
            log_test("Procurement", "Inventory Stock & Cost Price Updated via GRN", not is_error(inv_after_grn) and qty_ok and cost_ok, f"Qty: {get_field(inv_after_grn, 'quantity')}, Cost: INR {get_field(inv_after_grn, 'cost_price')}")

            # Verify PO automatically marked Received
            po_after_grn = http_req(f"{API_URL}/procurement/purchase-orders/{test_po_id}")
            log_test("Procurement", "PO Auto-Transitioned to 'Received'", not is_error(po_after_grn) and get_field(po_after_grn, "status") == "Received")

            # List GRNs
            grns_list = http_req(f"{API_URL}/procurement/goods-receipts?po_id={test_po_id}")
            log_test("Procurement", "GET /procurement/goods-receipts", not is_error(grns_list) and isinstance(grns_list, list) and len(grns_list) > 0)

    # ==========================================
    # 8. DASHBOARD ANALYTICS MODULE
    # ==========================================
    print("\n--- 8. Testing Dashboard Module (/api/v1/dashboard) ---")
    dash = http_req(f"{API_URL}/dashboard/")
    dash_ok = not is_error(dash) and "stock_value" in dash and "category_distribution" in dash
    log_test("Dashboard", "GET /dashboard/", dash_ok, f"Total SKUs: {get_field(dash, 'total_skus')}, Distribution Slices: {len(get_field(dash, 'category_distribution', []))}")

    # ==========================================
    # CLEANUP TEST FIXTURES
    # ==========================================
    print("\n--- Cleaning up temporary test records from DB ---")
    try:
        from app.core.database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        # Clean GRNs
        if test_sup_id:
            db.execute(text(f"DELETE FROM goods_receipt_items WHERE goods_receipt_id IN (SELECT id FROM goods_receipts WHERE supplier_id = {test_sup_id})"))
            db.execute(text(f"DELETE FROM goods_receipts WHERE supplier_id = {test_sup_id}"))
            db.execute(text(f"DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id = {test_sup_id})"))
            db.execute(text(f"DELETE FROM purchase_orders WHERE supplier_id = {test_sup_id}"))
            db.execute(text(f"DELETE FROM suppliers WHERE id = {test_sup_id}"))
        if test_order_id:
            db.execute(text(f"DELETE FROM order_items WHERE order_id = {test_order_id}"))
            db.execute(text(f"DELETE FROM orders WHERE id = {test_order_id}"))
        if ord2_id:
            db.execute(text(f"DELETE FROM order_items WHERE order_id = {ord2_id}"))
            db.execute(text(f"DELETE FROM orders WHERE id = {ord2_id}"))
        if test_cust_id:
            db.execute(text(f"DELETE FROM customers WHERE id = {test_cust_id}"))
        if test_item_id:
            db.execute(text(f"DELETE FROM stock_movements WHERE inventory_id = {test_item_id}"))
            db.execute(text(f"DELETE FROM inventory WHERE id = {test_item_id}"))
        db.commit()
        db.close()
        print("  [OK] Test records cleaned up successfully.")
    except Exception as e:
        print(f"  [WARN] Cleanup exception: {e}")

    # ==========================================
    # FINAL SUMMARY REPORT
    # ==========================================
    print("\n" + "=" * 70)
    print(f"FINAL TEST RESULTS: {passed_count} PASSED | {failed_count} FAILED")
    print("=" * 70)
    return failed_count == 0

if __name__ == "__main__":
    success = run_suite()
    sys.exit(0 if success else 1)
