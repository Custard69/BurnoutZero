import pandas as pd
import numpy as np

np.random.seed(42)  # reproducibility
n_samples = 1000

# -----------------------------
# Features (names match backend exactly)
# -----------------------------
data = pd.DataFrame()

# Active check-in features
data['mood'] = np.random.randint(1, 11, size=n_samples)           # 1-10 scale
data['stress'] = np.random.randint(1, 11, size=n_samples)         # 1-10 scale
data['sleep'] = np.random.randint(1, 11, size=n_samples)          # 1-10 scale
data['work_hours'] = np.random.randint(0, 13, size=n_samples)     # hours
data['had_meeting_today'] = np.random.randint(0, 2, size=n_samples)  # binary

# Passive features
data['meeting_count_last_7d'] = np.random.randint(0, 15, size=n_samples)
data['screen_time_last_7d'] = np.random.randint(0, 4000, size=n_samples)  # minutes

# Aggregated rolling features
data['mean_mood_last_7d'] = np.random.uniform(1, 10, size=n_samples)
data['mean_stress_last_7d'] = np.random.uniform(1, 10, size=n_samples)
data['mean_sleep_last_7d'] = np.random.uniform(1, 10, size=n_samples)
data['mean_work_hours_last_7d'] = np.random.uniform(0, 12, size=n_samples)

# -----------------------------
# Create burnout_level (0=Low, 1=Medium, 2=High)
# Weighted formula to ensure all classes appear
# -----------------------------
score = (
    data['stress'] * 0.4 +
    (10 - data['sleep']) * 0.3 +
    data['work_hours'] * 0.2 +
    data['mean_stress_last_7d'] * 0.1
)

# Map to 3 classes
data['burnout_level'] = pd.cut(score,
                               bins=[-np.inf, 5, 8, np.inf],
                               labels=[0, 1, 2]).astype(int)

# -----------------------------
# Inspect
# -----------------------------
print("Burnout class distribution:")
print(data['burnout_level'].value_counts())
print(data.head())

# -----------------------------
# Save CSV for retraining
# -----------------------------
data.to_csv("synthetic_burnout_multiclass_updated.csv", index=False)
