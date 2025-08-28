import pandas as pd
import numpy as np

# number of samples
n = 2000

# generate features
data = pd.DataFrame({
    "mood_today": np.random.randint(1, 11, n),
    "stress_today": np.random.randint(1, 11, n),
    "sleep_today": np.random.uniform(4, 10, n).round(1),
    "work_hours_today": np.random.randint(4, 14, n),
    "mean_mood_last_7d": np.random.uniform(3, 9, n).round(1),
    "mean_stress_last_7d": np.random.uniform(2, 9, n).round(1),
    "mean_sleep_last_7d": np.random.uniform(5, 9, n).round(1),
    "sum_work_hours_last_7d": np.random.randint(20, 80, n),
    "meetings_last_7d": np.random.randint(0, 20, n),
    "screen_time_last_7d": np.random.uniform(10, 60, n).round(1),
})

# generate burnout labels based on rules
burnout_level = []
for i in range(n):
    stress = data.loc[i, "stress_today"]
    sleep = data.loc[i, "sleep_today"]
    work = data.loc[i, "work_hours_today"]
    mood = data.loc[i, "mood_today"]

    score = (stress * 0.4) + (work * 0.3) - (sleep * 0.2) - (mood * 0.1)

    if score < 3:
        burnout_level.append(0)  # Low
    elif 3 <= score < 6:
        burnout_level.append(1)  # Moderate
    else:
        burnout_level.append(2)  # High

data["burnout_level"] = burnout_level

# save to CSV
data.to_csv("synthetic_burnout_multiclass.csv", index=False)
print("✅ Dataset saved as synthetic_burnout_multiclass.csv")
