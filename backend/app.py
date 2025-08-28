from flask import Flask, request, jsonify
import pandas as pd
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import datetime
import joblib

app = Flask(__name__)
CORS(app)

# ---------------------------
# Load the scaler and model
# ---------------------------
scaler = joblib.load("artifacts/burnout_scaler_final.pkl")
model = joblib.load("artifacts/burnout_model_multiclass_final.pkl")

# ---------------------------
# Initialize Firebase
# ---------------------------
cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()


# ---------------------------
# Home route
# ---------------------------
@app.route("/")
def home():
    return jsonify({"message": "BOZ Backend Running!"})


# ---------------------------
# Check-in route (now saves burnout_probability too)
# ---------------------------
@app.route("/checkin", methods=["POST"])
def checkin():
    data = request.json
    mood = data.get("mood")
    stress = data.get("stress")
    sleep = data.get("sleep")
    work_hours = data.get("work_hours_today")
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"success": False, "message": "Missing user_id"}), 400

    # ---------------------------
    # Build features for prediction
    # ---------------------------
    features = {
        "mood": mood,
        "stress": stress,
        "sleep": sleep,
        "work_hours": work_hours,
        "had_meeting_today": data.get("had_meeting_today", 0),
        "meeting_count_last_7d": data.get("meeting_count_last_7d", 0),
        "screen_time_last_7d": data.get("screen_time_last_7d", 0),
        "mean_mood_last_7d": data.get("mean_mood_last_7d", 0),
        "mean_stress_last_7d": data.get("mean_stress_last_7d", 0),
        "mean_sleep_last_7d": data.get("mean_sleep_last_7d", 0),
        "mean_work_hours_last_7d": data.get("mean_work_hours_last_7d", 0),
    }

    try:
        # Scale + predict
        X_input = pd.DataFrame([features])
        X_input_scaled = scaler.transform(X_input)
        probs = model.predict_proba(X_input_scaled)[0]

        # Weighted burnout probability (Low=0, Medium=0.5, High=1)
        weights = {0: 0.0, 1: 0.5, 2: 1.0}
        burnout_probability = sum([weights[i] * prob for i, prob in enumerate(probs)])

        # ---------------------------
        # Save check-in with burnout prob
        # ---------------------------
        checkin_data = {
            "mood": int(mood),
            "stress": int(stress),
            "sleep": int(sleep),
            "work_hours_today": float(work_hours) if work_hours is not None else 0.0,
            "burnout_probability": float(burnout_probability),
            "user_id": user_id,
            "timestamp": datetime.datetime.now()
        }

        db.collection("checkins").add(checkin_data)

        return jsonify({"success": True, "message": "Check-in saved!", "data": checkin_data})

    except Exception as e:
        print("🔥 Error in /checkin:", e)
        return jsonify({"success": False, "message": str(e)}), 500


# ---------------------------
# Get all check-ins route
# ---------------------------
@app.route("/checkins", methods=["GET"])
def get_checkins():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "Missing user_id"}), 400

    entries = []
    try:
        query = db.collection("checkins").where("user_id", "==", user_id).order_by(
            "timestamp", direction=firestore.Query.DESCENDING
        )
        docs = query.stream()
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            if "timestamp" in data and isinstance(data["timestamp"], datetime.datetime):
                data["timestamp"] = data["timestamp"].isoformat()
            entries.append(data)
        return jsonify(entries)
    except Exception as e:
        print("🔥 Error in /checkins:", e)
        return jsonify({"success": False, "message": str(e)}), 500


# ---------------------------
# Predict burnout route
# ---------------------------
# ---------------------------
# Predict burnout route (now also saves to Firestore)
# ---------------------------
@app.route("/predict", methods=["POST"])
def predict_burnout():
    try:
        data = request.json
        user_id = data.get("user_id")
        features = data.get("features")

        if not user_id or not features:
            return jsonify({"success": False, "message": "Missing user_id or features"}), 400

        expected_cols = [
            'mood', 'stress', 'sleep', 'work_hours', 'had_meeting_today',
            'meeting_count_last_7d', 'screen_time_last_7d',
            'mean_mood_last_7d', 'mean_stress_last_7d',
            'mean_sleep_last_7d', 'mean_work_hours_last_7d'
        ]

        # Prepare input and scale
        X_input = pd.DataFrame([{col: features.get(col, 0) for col in expected_cols}])
        X_input_scaled = scaler.transform(X_input)
        probs = model.predict_proba(X_input_scaled)[0]

        weights = {0: 0.0, 1: 0.5, 2: 1.0}
        burnout_probability = sum([weights[i] * prob for i, prob in enumerate(probs)])

        # ---------------------------
        # Save prediction to Firestore
        # ---------------------------
        checkin_data = {
            "user_id": user_id,
            "burnout_probability": float(burnout_probability),
            "timestamp": datetime.datetime.now(),
            # Optional: save features used for prediction
            **{k: features.get(k, 0) for k in expected_cols}
        }
        db.collection("checkins").add(checkin_data)

        return jsonify({
            "success": True,
            "user_id": user_id,
            "predicted_class_probs": {str(i): float(p) for i, p in enumerate(probs)},
            "burnout_probability": float(burnout_probability)
        })

    except Exception as e:
        print("🔥 Error in /predict:", e)
        return jsonify({"success": False, "message": str(e)}), 500

# ---------------------------
# Run the app
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)
