import requests

uid = "NPMZGKWPbjMRuBgec8rf65euU012"  # Replace with actual UID
response = requests.get(f"http://127.0.0.1:5000/checkins?user_id={uid}")

print("Status Code:", response.status_code)
print("Response:", response.json())
