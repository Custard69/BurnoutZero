import React, { useState, useEffect, useRef } from "react";

const encouragingMessages = [
  "Great job! 🎉",
  "Well done, keep it up! 💪",
  "Focus power! 🚀",
  "Another step closer to your goals! 🌟",
  "Amazing focus session! 🔥",
];

function FocusTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [totalFocused, setTotalFocused] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const intervalRef = useRef(null);

  // Format time as mm:ss
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setTotalFocused((t) => t + 25 * 60); // add completed session
            setPopupMessage(
              encouragingMessages[
                Math.floor(Math.random() * encouragingMessages.length)
              ]
            );
            setShowPopup(true);
            return 25 * 60; // reset timer
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const pauseTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
  };

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Focus Timer (Pomodoro)</h1>

      <div style={{ fontSize: "48px", margin: "20px 0" }}>
        {formatTime(timeLeft)}
      </div>

      <button onClick={startTimer} disabled={isRunning} style={{ margin: "5px" }}>
        Start
      </button>
      <button onClick={pauseTimer} style={{ margin: "5px" }}>
        Pause
      </button>
      <button onClick={resetTimer} style={{ margin: "5px" }}>
        Reset
      </button>

      <h3 style={{ marginTop: "20px" }}>
        Total Focused Today: {formatTime(totalFocused)}
      </h3>

      {/* Popup */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <h2>{popupMessage}</h2>
            <button
              onClick={() => setShowPopup(false)}
              style={{ marginTop: "15px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FocusTimer;
