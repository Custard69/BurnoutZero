from flask import Flask, request, jsonify, redirect, session
from dotenv import load_dotenv
import pandas as pd
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import datetime
import joblib
import os
import requests
from google.auth.transport.requests import Request  



# Google API imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build


load_dotenv()

# Flask setup
app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Get credentials from environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "http://localhost:5000/callback/google"
SCOPES = ["https://www.googleapis.com/auth/calendar"]

# RescueTime API Key
RESCUETIME_API_KEY = os.getenv("RESCUETIME_API_KEY")

# Load the scaler and model
scaler = joblib.load("artifacts/burnout_scaler_final.pkl")
model = joblib.load("artifacts/burnout_model_multiclass_final.pkl")


# Initialize Firebase
cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()




# app.py
# ... (imports) ...
# from google.auth.transport.requests import Request # Add this import
from datetime import timedelta

# Function to get meeting count for the last 7 days
def get_meeting_count_last_7d(user_id):
    """
    Fetch and store number of calendar events in the last 7 days for this user.
    Also saves each event to Firestore.
    """
    try:
        user_ref = db.collection("users").document(user_id).get()
        creds_data = user_ref.to_dict().get("google_calendar_credentials")
        if not creds_data:
            return 0  # user not connected

        creds = Credentials(**creds_data)
        if not creds.valid and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            db.collection("users").document(user_id).update({
                "google_calendar_credentials.token": creds.token
            })

        service = build("calendar", "v3", credentials=creds)

        now = datetime.datetime.utcnow().isoformat() + "Z"
        seven_days_ago = (datetime.datetime.utcnow() - datetime.timedelta(days=7)).isoformat() + "Z"

        events_result = service.events().list(
            calendarId="primary",
            timeMin=seven_days_ago,
            timeMax=now,
            singleEvents=True,
            orderBy="startTime"
        ).execute()

        events = events_result.get("items", [])

        # Store events in Firestore
        events_collection = db.collection("users").document(user_id).collection("calendar_events")
        for event in events:
            event_id = event.get("id")
            events_collection.document(event_id).set({
                "summary": event.get("summary"),
                "start": event.get("start"),
                "end": event.get("end"),
                "created": event.get("created"),
                "updated": event.get("updated")
            }, merge=True)

        return len(events)

    except Exception as e:
        print(f"⚠️ Error fetching meeting count: {e}")
        return 0



# Function to get screen time for the last 7 days
def get_screen_time_last_7d(user_id):
    user_ref = db.collection('users').document(user_id).get()
    api_key = user_ref.to_dict().get('rescuetime_api_key')
    
    if not api_key:
        return 0
    
    end_date = datetime.date.today().isoformat()
    start_date = (datetime.date.today() - timedelta(days=7)).isoformat()
    
    url = 'https://www.rescuetime.com/anapi/data'
    params = {
        'key': api_key,
        'format': 'json',
        'restrict_kind': 'productivity',
        'restrict_begin': start_date,
        'restrict_end': end_date
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        total_time_in_seconds = sum(row[1] for row in data['rows'])
        total_time_in_hours = total_time_in_seconds / 3600
        return total_time_in_hours
    except requests.exceptions.RequestException as e:
        print(f"Error fetching RescueTime data: {e}")
        return 0


# -----------------------
# Helper: convert credentials to dict
# -----------------------
def credentials_to_dict(credentials):
    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes
    }


# ---------------------------
# Home route
# ---------------------------
@app.route("/")
def home():
    return jsonify({"message": "BOZ Backend Running!"})


# ---------------------------
# Check-in route (saves burnout_probability)
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

        # Weighted burnout probability
        weights = {0: 0.0, 1: 0.5, 2: 1.0}
        burnout_probability = sum([weights[i] * prob for i, prob in enumerate(probs)])

        # Save check-in with burnout prob
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
# Get all check-ins
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



# Your utility functions (get_meeting_count_last_7d, get_screen_time_last_7d) should be defined outside of this route.

@app.route("/predict", methods=["POST"])
def predict_burnout():
    try:
        data = request.json
        user_id = data.get("user_id")

        # Get self-reported data from the request, as the frontend will now send this directly
        mood = data.get("mood")
        stress = data.get("stress")
        sleep = data.get("sleep")
        work_hours = data.get("work_hours_today")

        if not user_id or not all([mood, stress, sleep, work_hours]):
            return jsonify({"success": False, "message": "Missing user_id or required check-in data"}), 400

        # Fetch passive data using the new functions
        meeting_count_last_7d = get_meeting_count_last_7d(user_id)
        screen_time_last_7d = get_screen_time_last_7d(user_id)

        # Fetch historical data from Firestore for 7-day averages
        checkins_ref = db.collection("checkins").where("user_id", "==", user_id).order_by("timestamp", direction=firestore.Query.DESCENDING).limit(7)
        docs = checkins_ref.stream()
        past_checkins = [doc.to_dict() for doc in docs]

        if past_checkins:
            mean_mood_last_7d = sum(c.get("mood", 0) for c in past_checkins) / len(past_checkins)
            mean_stress_last_7d = sum(c.get("stress", 0) for c in past_checkins) / len(past_checkins)
            mean_sleep_last_7d = sum(c.get("sleep", 0) for c in past_checkins) / len(past_checkins)
            mean_work_hours_last_7d = sum(c.get("work_hours_today", 0) for c in past_checkins) / len(past_checkins)
        else:
            # Use current day's data if no past check-ins exist
            mean_mood_last_7d = mood
            mean_stress_last_7d = stress
            mean_sleep_last_7d = sleep
            mean_work_hours_last_7d = work_hours

        # Construct the complete features dictionary for the model
        features = {
            "mood": mood,
            "stress": stress,
            "sleep": sleep,
            "work_hours": work_hours,
            "had_meeting_today": 1 if meeting_count_last_7d > 0 else 0,
            "meeting_count_last_7d": meeting_count_last_7d,
            "screen_time_last_7d": screen_time_last_7d,
            "mean_mood_last_7d": mean_mood_last_7d,
            "mean_stress_last_7d": mean_stress_last_7d,
            "mean_sleep_last_7d": mean_sleep_last_7d,
            "mean_work_hours_last_7d": mean_work_hours_last_7d,
        }

        # Prepare input and scale
        X_input = pd.DataFrame([{col: features.get(col, 0) for col in features.keys()}])
        X_input_scaled = scaler.transform(X_input)
        probs = model.predict_proba(X_input_scaled)[0]

        weights = {0: 0.0, 1: 0.5, 2: 1.0}
        burnout_probability = sum([weights[i] * prob for i, prob in enumerate(probs)])

        # Save prediction
        checkin_data = {
            "user_id": user_id,
            "burnout_probability": float(burnout_probability),
            "timestamp": datetime.datetime.now(),
            **{k: features.get(k, 0) for k in features.keys()}
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
# Google Calendar Integration
# ---------------------------
import secrets

@app.route("/auth/google")
def auth_google():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400

    session["user_id"] = user_id

    # --- Generate state ---
    state = secrets.token_urlsafe(16)
    session["google_auth_state"] = state

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        },
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
        state=state,  # send the state to Google
    )

    auth_url, _ = flow.authorization_url(prompt="consent")
    return redirect(auth_url)


@app.route("/auth/google/callback")
def auth_google_callback():
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        },
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,  # must match console
    )

    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials

    # --- Get user_id from session (set earlier in /auth/google) ---
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID missing in session"}), 400

    # --- Save credentials in Firestore ---
    user_ref = db.collection("users").document(user_id)
    user_ref.set(
        {"google_calendar_credentials": credentials_to_dict(credentials)},
        merge=True,  # don't overwrite existing fields like email, name, etc.
    )

    return redirect("http://localhost:3000/calendar")



@app.route("/callback/google")
def callback_google():
    try:
        print("Session keys:", session.keys())
        user_id = session.get('user_id')
        print("user_id from session:", user_id)
        
        state = session.get('google_auth_state')
        print("state from session:", state)
        print("state from request.args:", request.args.get('state'))

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token"
                }
            },
            scopes=SCOPES,
            redirect_uri=GOOGLE_REDIRECT_URI,
            state=state
        )

        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials
        print("Got credentials:", credentials.token)

        user_ref = db.collection('users').document(user_id)
        user_ref.set({'google_calendar_credentials': credentials_to_dict(credentials)}, merge=True)
        print("Saved credentials successfully")

        return redirect("http://localhost:3000/calendar")

    except Exception as e:
        print("Error during Google Calendar authentication:", e)
        return jsonify({"message": "Error during Google Calendar authentication."}), 500




@app.route("/calendar/events")
def get_calendar_events():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "Missing user_id parameter"}), 400

    user_ref = db.collection('users').document(user_id).get()
    creds_data = user_ref.to_dict().get('google_calendar_credentials')
    
    if not creds_data:
        return jsonify({"error": "User not authenticated with Google"}), 401
    
    creds = Credentials(**creds_data)
    
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                db.collection('users').document(user_id).update({
                    'google_calendar_credentials.token': creds.token
                })
            except Exception as e:
                return jsonify({"error": f"Failed to refresh token: {e}"}), 500
        else:
            return jsonify({"error": "Credentials are invalid and cannot be refreshed."}), 401
    
    try:
        service = build("calendar", "v3", credentials=creds)

        now = datetime.datetime.utcnow().isoformat() + 'Z'
        
        events_result = service.events().list(
            calendarId="primary",
            timeMin=now,              
            maxResults=200,           
            singleEvents=True,
            orderBy="startTime"
        ).execute()
        
        events = events_result.get("items", [])
        return jsonify(events)
        
    except Exception as e:
        print(f"Error fetching calendar events: {e}")
        return jsonify({"error": f"Error fetching calendar events: {e}"}), 500





# event adding

@app.route("/calendar/event/add", methods=["POST"])
def add_calendar_event():
    data = request.json
    user_id = data.get("user_id")
    event_data = data.get("event")

    if not user_id or not event_data:
        return jsonify({"error": "Missing user_id or event data"}), 400

    user_ref = db.collection('users').document(user_id).get()
    creds_data = user_ref.to_dict().get('google_calendar_credentials')

    if not creds_data:
        return jsonify({"error": "User not authenticated with Google"}), 401
    
    # Recreate credentials object from Firestore data
    creds = Credentials(**creds_data)
    
    # Check if the access token is expired and refresh it if needed
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                db.collection('users').document(user_id).update({
                    'google_calendar_credentials.token': creds.token
                })
            except Exception as e:
                return jsonify({"error": f"Failed to refresh token: {e}"}), 500
        else:
            return jsonify({"error": "Credentials are invalid and cannot be refreshed."}), 401

    try:
        service = build("calendar", "v3", credentials=creds)
        
        # The 'body' for the API call requires 'summary', 'start', and 'end'
        event_body = {
            'summary': event_data.get('summary'),
            'start': event_data.get('start'),
            'end': event_data.get('end'),
            # Optional fields can be added here
            'description': event_data.get('description'),
            'attendees': event_data.get('attendees', []),
            'reminders': event_data.get('reminders', {'useDefault': True}),
        }

        # Use the events().insert() method to add the event
        created_event = service.events().insert(
            calendarId='primary',
            body=event_body
        ).execute()
        
        return jsonify({
            "success": True, 
            "message": "Event created successfully!",
            "event_id": created_event.get('id'),
            "event_link": created_event.get('htmlLink')
        })

    except Exception as e:
        print(f"Error creating calendar event: {e}")
        return jsonify({"error": f"Error creating calendar event: {e}"}), 500


@app.route("/calendar/event/delete", methods=["POST"])
def delete_calendar_event():
    data = request.json
    user_id = data.get("user_id")
    event_id = data.get("event_id")

    if not user_id or not event_id:
        return jsonify({"error": "Missing user_id or event_id"}), 400

    user_ref = db.collection('users').document(user_id).get()
    creds_data = user_ref.to_dict().get('google_calendar_credentials')

    if not creds_data:
        return jsonify({"error": "User not authenticated with Google"}), 401

    creds = Credentials(**creds_data)

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                db.collection('users').document(user_id).update({
                    'google_calendar_credentials.token': creds.token
                })
            except Exception as e:
                return jsonify({"error": f"Failed to refresh token: {e}"}), 500
        else:
            return jsonify({"error": "Credentials are invalid and cannot be refreshed."}), 401

    try:
        service = build("calendar", "v3", credentials=creds)
        service.events().delete(calendarId="primary", eventId=event_id).execute()
        return jsonify({"success": True, "message": "Event deleted successfully!"})
    except Exception as e:
        print(f"Error deleting calendar event: {e}")
        return jsonify({"error": f"Error deleting calendar event: {e}"}), 500





@app.route("/test_calendar/<user_id>")
def test_calendar(user_id):
    count = get_meeting_count_last_7d(user_id)
    return jsonify({"meetings_last_7_days": count})

    
# ---------------------------
# RescueTime Integration
# ---------------------------
@app.route("/rescuetime/data")
def get_rescuetime_data():
    url = f"https://www.rescuetime.com/anapi/data?key={RESCUETIME_API_KEY}&perspective=interval&resolution_time=hour&format=json"
    response = requests.get(url)
    data = response.json()
    return jsonify(data)


# ---------------------------
# Run the app
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)

