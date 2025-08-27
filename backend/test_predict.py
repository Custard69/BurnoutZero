import requests

url = "http://127.0.0.1:5000/predict"
data = {
    "user_id": "NPMZGKWPbjMRuBgec8rf65euU012",
    "features": {
        "mood": 10,
        "stress": 1,
        "sleep": 8,
        "work_hours": 8,
        "meetings": 2,      # example synthetic value
        "screen_time": 5.5  # example synthetic value
    }
}


response = requests.post(url, json=data)
print(response.status_code)
print(response.json())

