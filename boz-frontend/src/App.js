import React, { useState } from "react";
import Dashboard from "./Dashboard";

function App() {
  const [mood, setMood] = useState(5);
  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(5);    
  const [message, setMessage] = useState("");  // success/error messages

  const handleSubmit = async (e) => {
    e.preventDefault();
    const entry = { mood, stress, sleep };

    try {
      const res = await fetch("http://127.0.0.1:5000/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });

      const data = await res.json();
      console.log("Server Response:", data);

      setMessage("✅ Check-in submitted and saved!");
      setMood(5);
      setStress(5);
      setSleep(5);
    } catch (error) {
      console.error("Error submitting check-in:", error);
      setMessage("❌ Error: could not save check-in");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>BOZ Daily Check-In</h1>
      <form onSubmit={handleSubmit}>
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

        <button type="submit">Submit</button>
      </form>

      {message && <p style={{ marginTop: "10px", fontWeight: "bold" }}>{message}</p>}

      <Dashboard /> {/* Display Dashboard below form */}
    </div>
  );
}

export default App;
