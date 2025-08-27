from flask import Flask, request, jsonify
import pandas as pd

from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import datetime
import joblib



app = Flask(__name__)
CORS(app)

model = joblib.load("artifacts/xgb_burnout_model.pkl")

# Initialize Firebase
cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

@app.route("/")
def home():
    return jsonify({"message": "BOZ Backend Running!"})

@app.route("/checkin", methods=["POST"])
def checkin():
    data = request.json
    mood = data.get("mood")
    stress = data.get("stress")
    sleep = data.get("sleep")
    work_hours = data.get("work_hours_today")  # ✅ New field
    user_id = data.get("user_id")  # ✅ Get UID from frontend

    if not user_id:
        return jsonify({"success": False, "message": "Missing user_id"}), 400

    checkin_data = {
        "mood": int(mood),
        "stress": int(stress),
        "sleep": int(sleep),
        "work_hours_today": float(work_hours) if work_hours is not None else 0.0,  # store as float
        "user_id": user_id,  # ✅ Store UID
        "timestamp": datetime.datetime.now()
    }
    db.collection("checkins").add(checkin_data)

    return jsonify({"success": True, "message": "Check-in saved!", "data": checkin_data})

@app.route("/checkins", methods=["GET"])
def get_checkins():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "Missing user_id"}), 400

    entries = []
    try:
        query = db.collection("checkins").where("user_id", "==", user_id).order_by("timestamp", direction=firestore.Query.DESCENDING)
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
    

@app.route("/predict", methods=["POST"])
def predict_burnout():
    try:
        data = request.json
        user_id = data.get("user_id")
        features = data.get("features")

        if not user_id or not features:
            return jsonify({"success": False, "message": "Missing user_id or features"}), 400

        # Required feature columns in same order as model
        expected_cols = ["mood", "stress", "sleep", "work_hours", "meetings", "screen_time"]

        # Fill missing features with 0
        X_input = pd.DataFrame([{col: features.get(col, 0) for col in expected_cols}])

        # Predict
        prob = model.predict_proba(X_input)[0][1]

        return jsonify({
            "success": True,
            "user_id": user_id,
            "burnout_probability": float(prob)
        })

    except Exception as e:
        print("🔥 Error in /predict:", e)
        return jsonify({"success": False, "message": str(e)}), 500

    

if __name__ == "__main__":
    app.run(debug=True)
