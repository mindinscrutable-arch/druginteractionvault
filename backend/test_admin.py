import requests
import json
import os

# Use the admin email from .env
EMAIL = "shrutiraina828@gmail.com"

# We need a token. We'll use the master OTP '123456' to get one.
BASE_URL = "http://localhost:8000/api/v1"

def get_token():
    # 1. Request OTP
    requests.post(f"{BASE_URL}/auth/login-otp-request", json={"email": EMAIL})
    # 2. Verify OTP
    res = requests.post(f"{BASE_URL}/auth/login-otp-verify", json={"email": EMAIL, "code": "123456"})
    return res.json().get("access_token")

def test_endpoints():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    print("--- TESTING /admin/users ---")
    res = requests.get(f"{BASE_URL}/admin/users", headers=headers)
    print(f"Status: {res.status_code}")
    try:
        print(json.dumps(res.json(), indent=2))
    except:
        print(f"Raw Text: {res.text}")
    
    print("\n--- TESTING /admin/all-patients ---")
    res = requests.get(f"{BASE_URL}/admin/all-patients", headers=headers)
    print(f"Status: {res.status_code}")
    try:
        print(json.dumps(res.json(), indent=2))
    except:
        print(f"Raw Text: {res.text}")

if __name__ == "__main__":
    test_endpoints()
