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
      had_meeting_today: 0,        // default 0 for today
      meeting_count_last_7d: 0,    // will calculate
      screen_time_last_7d: 0       // will calculate
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
      const days = lastCheckins.length || 1; // prevent division by zero
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
        work_hours: workHours,                // maps state to backend
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
        body: JSON.stringify({ user_id: user.uid, features }),
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
    <div style={{ padding: "20px" }}>
      <h2>Daily Check-In</h2>
      <form onSubmit={handleSubmit}>
        {/* Mood Slider */}
        <div style={{ marginBottom: "15px" }}>
          <label>Mood (1-10): {mood}</label><br />
          <input
            type="range"
            min="1"
            max="10"
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
          />
        </div>

        {/* Stress Slider */}
        <div style={{ marginBottom: "15px" }}>
          <label>Stress (1-10): {stress}</label><br />
          <input
            type="range"
            min="1"
            max="10"
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
          />
        </div>

        {/* Sleep Slider */}
        <div style={{ marginBottom: "15px" }}>
          <label>Sleep (1-10): {sleep}</label><br />
          <input
            type="range"
            min="1"
            max="10"
            value={sleep}
            onChange={(e) => setSleep(Number(e.target.value))}
          />
        </div>

        {/* Work Hours */}
        <div style={{ marginBottom: "15px" }}>
          <label>Work Hours Today:</label><br />
          <input
            type="number"
            min="0"
            max="24"
            value={workHours}
            onChange={(e) => setWorkHours(Number(e.target.value))}
            required
          />
        </div>

        <button type="submit">Submit</button>
      </form>

      {message && <p style={{ marginTop: "10px", fontWeight: "bold" }}>{message}</p>}
      {burnoutProb !== null && (
        <p style={{ marginTop: "10px", fontWeight: "bold", color: "orange" }}>
          🔥 Predicted Burnout Risk: {burnoutProb}%
        </p>
      )}
    </div>
  );
}

export default CheckInForm;
