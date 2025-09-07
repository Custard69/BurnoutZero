import firebase_admin
from firebase_admin import credentials, firestore

try:
    cred = credentials.Certificate("firebase_key.json")
    app = firebase_admin.initialize_app(cred)
    db = firestore.client()
    docs = db.collection("checkins").limit(1).get()
    print("✅ Firebase Admin works! Got documents:", len(docs))
except Exception as e:
    print("❌ Firebase Admin failed:", e)
