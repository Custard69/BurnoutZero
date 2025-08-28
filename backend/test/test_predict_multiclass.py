import requests

# Your backend URL
BASE_URL = "http://127.0.0.1:5000/predict"

# Simulated user inputs with varying stress, sleep, work_hours, and meetings
test_inputs = [
    {
        "user_id": "user_low",
        "features": {
            "mood": 5,
            "stress": 1,
            "sleep": 9,
            "work_hours": 2,
            "had_meeting_today": 0,
            "meeting_count_last_7d": 1,
            "screen_time_last_7d": 1800,
            "mean_mood_last_7d": 5,
            "mean_stress_last_7d": 1,
            "mean_sleep_last_7d": 8,
            "mean_work_hours_last_7d": 3
        }
    },
    {
        "user_id": "user_medium",
        "features": {
            "mood": 3,
            "stress": 4,
            "sleep": 6,
            "work_hours": 6,
            "had_meeting_today": 1,
            "meeting_count_last_7d": 5,
            "screen_time_last_7d": 3000,
            "mean_mood_last_7d": 3,
            "mean_stress_last_7d": 4,
            "mean_sleep_last_7d": 6,
            "mean_work_hours_last_7d": 6
        }
    },
    {
        "user_id": "user_high",
        "features": {
            "mood": 1,
            "stress": 9,
            "sleep": 3,
            "work_hours": 12,
            "had_meeting_today": 1,
            "meeting_count_last_7d": 10,
            "screen_time_last_7d": 4000,
            "mean_mood_last_7d": 2,
            "mean_stress_last_7d": 5,
            "mean_sleep_last_7d": 4,
            "mean_work_hours_last_7d": 10
        }
    }
]

# Iterate through each test input
for test in test_inputs:
    response = requests.post(BASE_URL, json=test)
    if response.status_code == 200:
        data = response.json()
        print(f"\nUser ID: {test['user_id']}")
        print("Predicted class probabilities:", data["predicted_class_probs"])
        print("Weighted burnout probability:", data["burnout_probability"])
    else:
        print(f"Error for user {test['user_id']}: {response.status_code}")
        print(response.json())
