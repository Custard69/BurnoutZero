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

    # Store as Firestore Timestamp (not string) for ordering
    checkin_data = {
        "mood": int(mood),
        "stress": int(stress),
        "sleep": int(sleep),
        "timestamp": datetime.datetime.now()
    }
    db.collection("checkins").add(checkin_data)

    return jsonify({"success": True, "message": "Check-in saved!", "data": checkin_data})

@app.route("/checkins", methods=["GET"])
def get_checkins():
    entries = []
    # Order results by timestamp (latest first)
    docs = db.collection("checkins").order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        entries.append(data)
    return jsonify(entries)


if __name__ == "__main__":
    app.run(debug=True)
