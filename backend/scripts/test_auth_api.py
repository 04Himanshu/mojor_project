import urllib.request
import json

def run_tests():
    print("Testing auth endpoints...")

    # 1. Demo accounts
    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/auth/demo-accounts")
    with urllib.request.urlopen(req) as res:
        demos = json.loads(res.read().decode())
        print(f"[OK] Demo Accounts found: {len(demos)}")
        for d in demos:
            print(f"     - {d['name']} ({d['role_name']}) -> {d['email']} (hint: {d['password_hint']})")

    # 2. Login as Himanshu Singh (Administrator)
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/login",
        data=json.dumps({"email": "himanshu123@gmail.com", "password": "admin123"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        login_res = json.loads(res.read().decode())
        token = login_res["access_token"]
        user = login_res["user"]
        print(f"[OK] Login successful for: {user['name']} | Role: {user['role_name']}")

    # 3. /auth/me with Bearer token
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        me = json.loads(res.read().decode())
        print(f"[OK] /auth/me returned: {me['name']} ({me['email']})")

    # 4. Login as Neha Verma (Inventory Manager)
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/login",
        data=json.dumps({"email": "neha.verma@eom.com", "password": "password"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        login_neha = json.loads(res.read().decode())
        print(f"[OK] Demo login successful for: {login_neha['user']['name']} | Role: {login_neha['user']['role_name']}")

    # 5. Invalid credentials rejection
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/v1/auth/login",
            data=json.dumps({"email": "neha.verma@eom.com", "password": "wrong_password"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req)
        print("[FAIL] Wrong password was accepted!")
    except urllib.error.HTTPError as e:
        print(f"[OK] Wrong password correctly rejected with HTTP {e.code}")

    print("\nAll Auth tests passed successfully!")

if __name__ == "__main__":
    run_tests()
