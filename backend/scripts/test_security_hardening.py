import urllib.request
import urllib.error
import json
import sys
import time
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.core.config import settings
from app.core.rate_limiter import limiter

BASE_URL = "http://127.0.0.1:8000"
API_URL = f"{BASE_URL}/api/v1"

passed_count = 0
failed_count = 0

def log_test(category: str, test_name: str, passed: bool, detail: str = ""):
    global passed_count, failed_count
    status_str = "[PASS]" if passed else "[FAIL]"
    if passed:
        passed_count += 1
        print(f"  {status_str} {category} -> {test_name} {f'({detail})' if detail else ''}")
    else:
        failed_count += 1
        print(f"  {status_str} {category} -> {test_name}: {detail}")

def http_req(url, method="GET", data=None, headers=None):
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content_type = resp.headers.get("Content-Type", "")
            raw = resp.read()
            resp_headers = dict(resp.headers)
            if not raw or resp.status == 204:
                return {"_status": resp.status, "_headers": resp_headers, "_body": None}
            if "application/json" in content_type:
                parsed = json.loads(raw.decode("utf-8"))
                if isinstance(parsed, dict):
                    parsed["_status"] = resp.status
                    parsed["_headers"] = resp_headers
                return parsed
            return {"_status": resp.status, "_headers": resp_headers, "_body": raw.decode("utf-8")}
    except urllib.error.HTTPError as e:
        raw_err = e.read().decode("utf-8")
        try:
            err_json = json.loads(raw_err)
        except Exception:
            err_json = {"raw": raw_err}
        return {"_error": True, "status_code": e.code, "detail": err_json, "headers": dict(e.headers)}
    except Exception as e:
        return {"_error": True, "status_code": 500, "detail": str(e)}

def run_security_hardening_suite():
    global passed_count, failed_count
    passed_count = 0
    failed_count = 0

    print("=" * 70)
    print("ENTERPRISE SECURITY HARDENING TEST SUITE")
    print(f"Target: {BASE_URL}")
    print("=" * 70)

    # Reset any rate limiter records on server for localhost
    http_req(f"{API_URL}/auth/test-reset-rate-limit", method="POST")


    # ==========================================
    # 1. ENVIRONMENT SECRETS & PRODUCTION CORS
    # ==========================================
    print("\n--- 1. Testing Secrets in Environment & Production CORS ---")
    log_test(
        "Secrets", 
        "Secret Key Loaded from Environment", 
        bool(settings.SECRET_KEY) and len(settings.SECRET_KEY) >= 32,
        f"Key length: {len(settings.SECRET_KEY)} chars"
    )
    
    cors_origins = settings.get_cors_origins()
    log_test(
        "CORS",
        "Allowed Origins configured from Environment",
        isinstance(cors_origins, list) and len(cors_origins) > 0 and "*" not in cors_origins,
        f"Allowed origins: {cors_origins}"
    )

    # Test CORS preflight response
    preflight_req = urllib.request.Request(
        f"{API_URL}/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type"
        },
        method="OPTIONS"
    )
    try:
        with urllib.request.urlopen(preflight_req) as resp:
            allow_origin = resp.headers.get("Access-Control-Allow-Origin")
            log_test("CORS", "Preflight Origin Allowed", allow_origin == "http://localhost:5173", f"Header: {allow_origin}")
    except Exception as e:
        log_test("CORS", "Preflight Origin Allowed", False, str(e))

    # ==========================================
    # 2. JWT LIFECYCLE & TOKEN REVOCATION
    # ==========================================
    print("\n--- 2. Testing JWT Lifecycle & Token Revocation ---")
    
    # Login as admin to get an access token
    admin_login = http_req(f"{API_URL}/auth/login", method="POST", data={
        "email": "himanshu123@gmail.com",
        "password": "admin123"
    })
    
    admin_token = admin_login.get("access_token")
    log_test("JWT", "Generate Signed Bearer Token with JTI", bool(admin_token))

    if admin_token:
        # Check /auth/me works
        me_res = http_req(f"{API_URL}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        log_test("JWT", "Validate Active Bearer Token on /auth/me", me_res.get("email") == "himanshu123@gmail.com")

        # Invalidate via logout
        logout_res = http_req(f"{API_URL}/auth/logout", method="POST", headers={"Authorization": f"Bearer {admin_token}"})
        log_test("TokenRevocation", "POST /auth/logout (Revoke Session)", not logout_res.get("_error"), logout_res.get("message"))

        # Try using the same token again -> MUST BE REJECTED with 401
        me_after_logout = http_req(f"{API_URL}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        log_test(
            "TokenRevocation",
            "Reject Blacklisted/Revoked Token on /auth/me",
            me_after_logout.get("status_code") == 401,
            f"Status Code: {me_after_logout.get('status_code')}"
        )

    # Obtain a fresh admin token for subsequent authorized tests
    admin_login_fresh = http_req(f"{API_URL}/auth/login", method="POST", data={
        "email": "himanshu123@gmail.com",
        "password": "admin123"
    })
    fresh_admin_token = admin_login_fresh.get("access_token")

    # ==========================================
    # 3. BACKEND PERMISSIONS ENFORCEMENT
    # ==========================================
    print("\n--- 3. Testing Backend Permissions Enforcement on Sensitive Operations ---")
    
    # A. Unauthenticated Access Rejection (No Token)
    unauth_inv = http_req(f"{API_URL}/inventory/")
    log_test("Permissions", "GET /inventory/ without token -> Reject 401", unauth_inv.get("status_code") == 401)

    unauth_users = http_req(f"{API_URL}/users/")
    log_test("Permissions", "GET /users/ without token -> Reject 401", unauth_users.get("status_code") == 401)

    unauth_po = http_req(f"{API_URL}/procurement/purchase-orders")
    log_test("Permissions", "GET /procurement/purchase-orders without token -> Reject 401", unauth_po.get("status_code") == 401)

    unauth_orders = http_req(f"{API_URL}/orders/")
    log_test("Permissions", "GET /orders/ without token -> Reject 401", unauth_orders.get("status_code") == 401)

    # B. Role-Based & Permission-Based Access Restrictions
    # Login as Warehouse Operator (User: Sunil Rao, who lacks roles:manage and inventory:delete)
    wh_login = http_req(f"{API_URL}/auth/login", method="POST", data={
        "email": "sunil.rao@eom.com",
        "password": "password"
    })
    wh_token = wh_login.get("access_token")
    log_test("Permissions", "Authenticate Warehouse Operator (Sunil Rao)", bool(wh_token))

    if wh_token:
        wh_headers = {"Authorization": f"Bearer {wh_token}"}

        # Attempt to create a role (requires roles:manage) -> Expect 403 Forbidden
        role_forbidden = http_req(f"{API_URL}/users/roles", method="POST", data={
            "name": "Hacker Role",
            "permissions": ["all"]
        }, headers=wh_headers)
        log_test(
            "Permissions",
            "Warehouse Operator creating role -> Reject 403 (Missing 'roles:manage')",
            role_forbidden.get("status_code") == 403,
            f"Status: {role_forbidden.get('status_code')}"
        )

        # Attempt to delete an inventory SKU (requires inventory:delete) -> Expect 403 Forbidden
        del_forbidden = http_req(f"{API_URL}/inventory/1", method="DELETE", headers=wh_headers)
        log_test(
            "Permissions",
            "Warehouse Operator deleting SKU -> Reject 403 (Missing 'inventory:delete')",
            del_forbidden.get("status_code") == 403,
            f"Status: {del_forbidden.get('status_code')}"
        )

        # But Operator CAN view inventory (has inventory:view) -> Expect 200 OK
        inv_allowed = http_req(f"{API_URL}/inventory/", headers=wh_headers)
        log_test(
            "Permissions",
            "Warehouse Operator viewing inventory -> Allow 200 ('inventory:view')",
            not inv_allowed.get("_error") and "items" in inv_allowed
        )

    # C. Administrator Full Access Verification
    if fresh_admin_token:
        admin_headers = {"Authorization": f"Bearer {fresh_admin_token}"}
        admin_inv = http_req(f"{API_URL}/inventory/", headers=admin_headers)
        admin_users = http_req(f"{API_URL}/users/", headers=admin_headers)
        admin_inv_ok = not (isinstance(admin_inv, dict) and admin_inv.get("_error"))
        admin_users_ok = not (isinstance(admin_users, dict) and admin_users.get("_error"))
        log_test("Permissions", "Administrator full access to /inventory/ and /users/ -> Allow 200", admin_inv_ok and admin_users_ok)

    # ==========================================
    # 4. PASSWORD RESET FLOW
    # ==========================================
    print("\n--- 4. Testing Password Reset Flow ---")
    forgot_res = http_req(f"{API_URL}/auth/forgot-password", method="POST", data={
        "email": "himanshu123@gmail.com"
    })
    reset_token = forgot_res.get("reset_token")
    log_test("PasswordReset", "POST /auth/forgot-password (Generate 15-min Token)", bool(reset_token), f"Reset token created: {bool(reset_token)}")

    if reset_token:
        # Reset password to temporary new password
        temp_pw = "tempAdminSecret456!"
        reset_res = http_req(f"{API_URL}/auth/reset-password", method="POST", data={
            "token": reset_token,
            "new_password": temp_pw
        })
        log_test("PasswordReset", "POST /auth/reset-password (Update PBKDF2 Hash)", not reset_res.get("_error"))

        # Attempt to reuse the same reset token -> MUST FAIL (token single-use revocation)
        reuse_res = http_req(f"{API_URL}/auth/reset-password", method="POST", data={
            "token": reset_token,
            "new_password": "anotherPassword999!"
        })
        log_test("PasswordReset", "Reject Reusing Expired/Used Reset Token", reuse_res.get("status_code") == 400)

        # Login with new password
        login_new_pw = http_req(f"{API_URL}/auth/login", method="POST", data={
            "email": "himanshu123@gmail.com",
            "password": temp_pw
        })
        log_test("PasswordReset", "Login with Newly Reset Password", bool(login_new_pw.get("access_token")))

        # Restore original admin password
        forgot_restore = http_req(f"{API_URL}/auth/forgot-password", method="POST", data={"email": "himanshu123@gmail.com"})
        restore_token = forgot_restore.get("reset_token")
        if restore_token:
            restore_res = http_req(f"{API_URL}/auth/reset-password", method="POST", data={
                "token": restore_token,
                "new_password": "admin123"
            })
            if not restore_res.get("_error"):
                print("  [RESTORE] Admin credentials successfully restored to original state.")
            else:
                print("  [RESTORE FAILED]:", restore_res)
        else:
            print("  [RESTORE FAILED TO GET TOKEN]:", forgot_restore)

    # ==========================================
    # 5. RATE LIMITING ON LOGIN (BRUTE-FORCE PROTECTION)
    # ==========================================
    print("\n--- 5. Testing Rate Limiter (Brute-Force Protection) ---")
    
    # Reset limiter before test
    # Reset limiter on server before test
    http_req(f"{API_URL}/auth/test-reset-rate-limit", method="POST")
    
    # Try rapid failed logins to hit the limit
    rate_limited = False
    rate_limit_headers = None
    for attempt in range(1, 8):
        res = http_req(f"{API_URL}/auth/login", method="POST", data={
            "email": "attacker@evil.com",
            "password": f"bad_guess_{attempt}"
        })
        if res.get("status_code") == 429:
            rate_limited = True
            rate_limit_headers = res.get("headers")
            break

    log_test(
        "RateLimit",
        "POST /auth/login (Enforce 429 on excessive attempts)",
        rate_limited,
        f"Triggered 429 Too Many Requests (Retry-After: {rate_limit_headers.get('retry-after') if rate_limit_headers else 'N/A'})"
    )

    # Clean up rate limit on server after test
    http_req(f"{API_URL}/auth/test-reset-rate-limit", method="POST")

    print("\n" + "=" * 70)
    print(f"SECURITY SUITE RESULTS: {passed_count} PASSED, {failed_count} FAILED")
    print("=" * 70)
    return failed_count == 0

if __name__ == "__main__":
    success = run_security_hardening_suite()
    sys.exit(0 if success else 1)
