import React, { useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

function CheckInForm() {
  const [mood, setMood] = useState(5);
  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [workHours, setWorkHours] = useState(8);
  const [message, setMessage] = useState("");
  const [burnoutProb, setBurnoutProb] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setMessage("❌ You must be logged in to submit a check-in.");
      return;
    }

    const entry = {
      mood,
      stress,
      sleep,
      work_hours_today: workHours,
      user_id: user.uid,
      had_meeting_today: 0,
      meeting_count_last_7d: 0,
      screen_time_last_7d: 0
    };

    try {
      // 1️⃣ Save check-in to backend
      const res = await fetch("http://127.0.0.1:5000/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = await res.json();
      console.log("Check-in Response:", data);
      setMessage("✅ Check-in submitted and saved!");

      // 2️⃣ Fetch last 7 check-ins from Firestore
      const q = query(
        collection(db, "checkins"),
        where("user_id", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(7)
      );
      const querySnapshot = await getDocs(q);
      const lastCheckins = [];
      querySnapshot.forEach((doc) => lastCheckins.push(doc.data()));

      // 3️⃣ Calculate features from last 7 check-ins
      const days = lastCheckins.length || 1;
      const sum = lastCheckins.reduce((acc, c) => ({
        mood: acc.mood + c.mood,
        stress: acc.stress + c.stress,
        sleep: acc.sleep + c.sleep,
        work_hours: acc.work_hours + c.work_hours_today,
        meeting_count: acc.meeting_count + (c.had_meeting_today ? 1 : 0),
        screen_time: acc.screen_time + (c.screen_time_last_7d || 0)
      }), { mood: 0, stress: 0, sleep: 0, work_hours: 0, meeting_count: 0, screen_time: 0 });

      const features = {
        mood,
        stress,
        sleep,
        work_hours_today: workHours, 
        had_meeting_today: entry.had_meeting_today,
        meeting_count_last_7d: sum.meeting_count,
        screen_time_last_7d: sum.screen_time / days,
        mean_mood_last_7d: sum.mood / days,
        mean_stress_last_7d: sum.stress / days,
        mean_sleep_last_7d: sum.sleep / days,
        mean_work_hours_last_7d: sum.work_hours / days
      };

      // 4️⃣ Call prediction API
      const predRes = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, ...features }),
      });

      const predData = await predRes.json();
      console.log("Prediction Response:", predData);

      if (predData.success) {
        setBurnoutProb((predData.burnout_probability * 100).toFixed(2));
      } else {
        setBurnoutProb(null);
      }

      // Reset sliders
      setMood(5);
      setStress(5);
      setSleep(5);
      setWorkHours(8);

    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error submitting check-in or getting prediction.");
      setBurnoutProb(null);
    }
  };

  return (
    <div style={checkInStyles.container}>
      <div style={checkInStyles.card}>
        <h2 style={checkInStyles.heading}>Daily Check-In</h2>
        <form onSubmit={handleSubmit} style={checkInStyles.form}>
          <div style={checkInStyles.inputGroup}>
            <label style={checkInStyles.label}>Mood (1-10):</label>
            <input
              type="range"
              min="1"
              max="10"
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              style={checkInStyles.slider}
            />
            <span style={checkInStyles.sliderValue}>{mood}</span>
          </div>

          <div style={checkInStyles.inputGroup}>
            <label style={checkInStyles.label}>Stress (1-10):</label>
            <input
              type="range"
              min="1"
              max="10"
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              style={checkInStyles.slider}
            />
            <span style={checkInStyles.sliderValue}>{stress}</span>
          </div>

          <div style={checkInStyles.inputGroup}>
            <label style={checkInStyles.label}>Sleep (1-10):</label>
            <input
              type="range"
              min="1"
              max="10"
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              style={checkInStyles.slider}
            />
            <span style={checkInStyles.sliderValue}>{sleep}</span>
          </div>

          <div style={checkInStyles.inputGroup}>
            <label style={checkInStyles.label}>Work Hours Today:</label>
            <input
              type="number"
              min="0"
              max="24"
              value={workHours}
              onChange={(e) => setWorkHours(Number(e.target.value))}
              required
              style={checkInStyles.input}
            />
          </div>

          <button type="submit" style={checkInStyles.primaryButton}>
            Submit Check-in
          </button>
        </form>
      </div>

      <div style={checkInStyles.resultCard}>
        {message && <p style={checkInStyles.message}>{message}</p>}
        {burnoutProb !== null && (
          <p style={checkInStyles.burnoutRisk}>
            Predicted Burnout Risk: <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{burnoutProb}%</span>
          </p>
        )}
      </div>
    </div>
  );
}

const checkInStyles = {
  container: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#2e2e4a',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  heading: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '20px',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: '20px',
    textAlign: 'left',
    width: '100%',
  },
  label: {
    display: 'block',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#a0a0c0',
    marginBottom: '8px',
  },
  slider: {
    width: 'calc(100% - 40px)',
    height: '8px',
    background: '#4a4a6e',
    borderRadius: '5px',
    outline: 'none',
    cursor: 'pointer',
    '-webkit-appearance': 'none',
    '::-webkit-slider-thumb': {
      '-webkit-appearance': 'none',
      width: '20px',
      height: '20px',
      background: '#6a67f0',
      borderRadius: '50%',
      cursor: 'pointer',
      border: '2px solid #ffffff'
    },
  },
  sliderValue: {
    marginLeft: '10px',
    color: '#ffffff',
    fontWeight: 'bold',
  },
  input: {
    width: 'calc(100% - 24px)',
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '10px',
    border: '1px solid #4a4a6e',
    backgroundColor: '#3b3b5c',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.3s ease',
  },
  primaryButton: {
    width: '100%',
    padding: '14px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#ffffff',
    background: 'linear-gradient(45deg, #6a67f0, #9167f0)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'background 0.3s ease, transform 0.2s ease',
  },
  resultCard: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#2e2e4a',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    padding: '20px',
    textAlign: 'center',
  },
  message: {
    marginTop: '0',
    color: '#40c057',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  burnoutRisk: {
    marginTop: '0',
    color: '#e0e0e0',
    fontWeight: 'bold',
    fontSize: '1.2rem',
  },
};

export default CheckInForm;