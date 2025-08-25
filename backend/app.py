from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import datetime

app = Flask(__name__)
CORS(app)

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
    user_id = data.get("user_id")  # ✅ Get UID from frontend

    if not user_id:
        return jsonify({"success": False, "message": "Missing user_id"}), 400

    checkin_data = {
        "mood": int(mood),
        "stress": int(stress),
        "sleep": int(sleep),
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


if __name__ == "__main__":
    app.run(debug=True)
