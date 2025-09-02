import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const encouragingMessages = [
  "Great job! 🎉",
  "Well done, keep it up! 💪",
  "Focus power! 🚀",
  "Another step closer to your goals! 🌟",
  "Amazing focus session! 🔥",
];

// Helper styles object to keep the code clean
const styles = {
  container: {
    textAlign: "center",
    padding: "40px",
    backgroundColor: "#1f2833",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
    maxWidth: "800px",
    width: "100%",
    margin: "40px auto", // Centers the container
    color: "#c5c6c7",
    fontFamily: "'Roboto', sans-serif"
  },
  heading: {
    color: "#66fcf1",
    fontWeight: "700",
    letterSpacing: "1px"
  },
  timerDisplay: {
    backgroundColor: "#000",
    color: "#fff",
    fontFamily: "'Orbitron', monospace",
    fontSize: "80px",
    fontWeight: "700",
    padding: "10px 20px",
    borderRadius: "15px",
    margin: "20px 0",
    display: "inline-block",
    letterSpacing: "5px",
    minWidth: "400px",
    boxShadow: "inset 0 0 10px rgba(255, 255, 255, 0.1), 0 0 15px rgba(0, 0, 0, 0.5)",
    textShadow: "0 0 5px #66fcf1"
  },
  inputField: {
    backgroundColor: "#1f2833",
    color: "#c5c6c7",
    border: "1px solid #45a29e",
    borderRadius: "8px",
    padding: "12px 15px",
    width: "250px",
    marginBottom: "10px",
    outline: "none"
  },
  inputNumber: {
    backgroundColor: "#1f2833",
    color: "#c5c6c7",
    border: "1px solid #45a29e",
    borderRadius: "8px",
    padding: "12px 15px",
    width: "60px",
    marginRight: "15px",
    outline: "none"
  },
  button: {
    backgroundColor: "#45a29e",
    color: "#0b0c10",
    border: "none",
    padding: "12px 24px",
    margin: "5px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    transition: "transform 0.2s, background-color 0.2s, box-shadow 0.3s"
  },
  buttonDisabled: {
    backgroundColor: "#4a4a4a",
    cursor: "not-allowed",
    opacity: "0.6"
  },
  historyTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
    borderRadius: "8px",
    overflow: "hidden", // Ensures border-radius applies to children
  },
  tableHeader: {
    backgroundColor: "#2a3440",
    color: "#66fcf1",
    padding: "12px 15px",
    textAlign: "left",
    fontWeight: "bold",
    borderBottom: "2px solid #45a29e",
  },
  tableRow: {
    transition: "background-color 0.2s ease",
  },
  tableRowHover: {
    backgroundColor: "#2a3440",
  },
  tableCell: {
    padding: "12px 15px",
    borderBottom: "1px solid #45a29e",
    textAlign: "left",
  },
  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  popupContent: {
    background: "#1f2833",
    padding: "40px",
    borderRadius: "12px",
    textAlign: "center",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
    border: "1px solid #66fcf1"
  },
  closeButton: {
    marginTop: "15px",
    padding: "8px 15px",
    backgroundColor: "#45a29e",
    color: "#0b0c10",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  }
};

function FocusTimer() {
  const userId = auth.currentUser?.uid;

  // Timer & session states
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [totalFocused, setTotalFocused] = useState(0);
  const [streak, setStreak] = useState(0);
  const [task, setTask] = useState("");
  const [currentTask, setCurrentTask] = useState("");
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false); // New state for history visibility

  // Popup
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const intervalRef = useRef(null);
  const timerTypeRef = useRef("focus");
  const endTimeRef = useRef(null);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  const sendNotification = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  useEffect(() => {
    if (!userId) return;
    const loadData = async () => {
      const docRef = doc(db, "focusTimers", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTotalFocused(data.totalFocused || 0);
        setStreak(data.streak || 0);
        const sessions = (data.sessionHistory || []).map(s => ({
          ...s,
          timestamp: s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.timestamp)
        }));
        setSessionHistory(sessions);
        if (data.activeSession) {
          const { endTime, mode, task: savedTask } = data.activeSession;
          const diff = Math.max(0, Math.round((endTime - Date.now()) / 1000));
          if (diff > 0) {
            setTimeLeft(diff);
            setIsRunning(true);
            setOnBreak(mode === "break");
            setCurrentTask(savedTask || "");
            timerTypeRef.current = mode;
            endTimeRef.current = endTime;
          } else {
            await updateDoc(docRef, { activeSession: null });
          }
        }
      }
    };
    loadData();
  }, [userId]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const diff = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(diff);
        if (diff <= 0) {
          clearInterval(intervalRef.current);
          endTimeRef.current = null;
          setIsRunning(false);
          if (timerTypeRef.current === "focus") {
            const newSession = {
              task: currentTask,
              duration: focusMinutes * 60,
              timestamp: new Date(),
            };
            setTotalFocused(t => t + focusMinutes * 60);
            setSessionHistory(h => [...h, newSession]);
            setStreak(s => s + 1);
            saveSessionToFirestore(newSession);
            const randomMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
            setPopupMessage(randomMessage);
            setShowPopup(true);
            sendNotification("Focus session complete!", "Time for a short break 🛌");
            setOnBreak(true);
            setTimeLeft(breakMinutes * 60);
            timerTypeRef.current = "break";
          } else {
            setOnBreak(false);
            setTimeLeft(focusMinutes * 60);
            timerTypeRef.current = "focus";
            setPopupMessage("Break over! Ready for the next session? ⏱️");
            setShowPopup(true);
            sendNotification("Break over!", "Time to start your next focus session 💪");
          }
          if (userId) {
            updateDoc(doc(db, "focusTimers", userId), { activeSession: null });
          }
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const saveSessionToFirestore = async (session) => {
    if (!userId) return;
    const docRef = doc(db, "focusTimers", userId);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          totalFocused: totalFocused + focusMinutes * 60,
          streak: streak + 1,
          sessionHistory: arrayUnion(session),
        });
      } else {
        await setDoc(docRef, {
          totalFocused: focusMinutes * 60,
          streak: 1,
          sessionHistory: [session],
        });
      }
    } catch (err) {
      console.error("Error saving session:", err);
    }
  };

  const startTimer = async () => {
  if (!task && !onBreak) {
    setPopupMessage("Please enter a task before starting!");
    setShowPopup(true);
    return;
  }

  if (!isRunning) {
    setCurrentTask(task);
    timerTypeRef.current = onBreak ? "break" : "focus";

    // Use current user selection instead of previous timeLeft
    const duration = (onBreak ? breakMinutes : focusMinutes) * 60;
    setTimeLeft(duration);
    endTimeRef.current = Date.now() + duration * 1000;

    setIsRunning(true);

    if (userId) {
      const docRef = doc(db, "focusTimers", userId);
      await updateDoc(docRef, {
        activeSession: {
          endTime: endTimeRef.current,
          mode: timerTypeRef.current,
          task: onBreak ? "" : task,
        },
      }).catch(async () => {
        await setDoc(docRef, {
          totalFocused: 0,
          streak: 0,
          sessionHistory: [],
          activeSession: {
            endTime: endTimeRef.current,
            mode: timerTypeRef.current,
            task: onBreak ? "" : task,
          },
        });
      });
    }
  }
};
  const pauseTimer = () => setIsRunning(false);

  const resetTimer = async () => {
    setIsRunning(false);
    setOnBreak(false);
    setTimeLeft(focusMinutes * 60);
    setTask("");
    setCurrentTask("");
    timerTypeRef.current = "focus";
    endTimeRef.current = null;
    if (userId) {
      const docRef = doc(db, "focusTimers", userId);
      await updateDoc(docRef, { activeSession: null });
    }
  };

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const getWeeklyData = () => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      return { day: d.toLocaleDateString("en-US", { weekday: "short" }), totalHours: 0 };
    });
    sessionHistory.forEach((s) => {
      const date = new Date(s.timestamp);
      const dayIndex = (date.getDay() + 6) % 7;
      const matchingDay = days[dayIndex];
      if (matchingDay) matchingDay.totalHours += s.duration / 3600;
    });
    return days;
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Focus Timer (Pomodoro)</h1>
      <input type="text" placeholder="Enter task..." value={task} onChange={e => setTask(e.target.value)} style={styles.inputField} />
      <div style={{ marginBottom: "20px" }}>
        <label>Focus (min): <input type="number" value={focusMinutes} onChange={e => setFocusMinutes(Number(e.target.value))} disabled={isRunning} style={styles.inputNumber} /></label>
        <label>Break (min): <input type="number" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} disabled={isRunning} style={{ ...styles.inputNumber, marginRight: 0 }} /></label>
      </div>
      <div style={styles.timerDisplay}>{formatTime(timeLeft)}</div>
      <h4 style={styles.heading}>{onBreak ? "Break Time 🛌" : `Current Task: ${currentTask || "..."}`}</h4>
      <div style={{ marginTop: "20px" }}>
        <button onClick={startTimer} disabled={isRunning} style={{ ...styles.button, ...(isRunning && styles.buttonDisabled) }}>Start</button>
        <button onClick={pauseTimer} style={styles.button}>Pause</button>
        <button onClick={resetTimer} style={styles.button}>Reset</button>
      </div>
      <h3 style={{ ...styles.heading, marginTop: "40px" }}>Total Focused Today: {formatTime(totalFocused)}</h3>
      <h4 style={styles.heading}>Current Streak: {streak} 🔥</h4>
      <div>
        <h4 style={styles.heading}>Session History:</h4>
        <button onClick={() => setShowHistory(!showHistory)} style={{ ...styles.button, marginBottom: "20px" }}>
          {showHistory ? "Hide Session History" : "View Session History"}
        </button>
        {showHistory && sessionHistory.length > 0 && (
          <table style={styles.historyTable}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Task</th>
                <th style={styles.tableHeader}>Duration</th>
                <th style={styles.tableHeader}>Time</th>
              </tr>
            </thead>
            <tbody>
              {sessionHistory.map((s, i) => (
                <tr key={i} style={styles.tableRow}>
                  <td style={styles.tableCell}>{s.task}</td>
                  <td style={styles.tableCell}>{formatTime(s.duration)}</td>
                  <td style={styles.tableCell}>{s.timestamp.toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {showHistory && sessionHistory.length === 0 && (
          <p style={{marginTop: "20px"}}>No sessions yet</p>
        )}
      </div>
      <div style={{ marginTop: "40px", width: "100%", maxWidth: "700px", margin: "0 auto", height: 250 }}>
        <h4 style={styles.heading}>Weekly Focus Summary</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getWeeklyData()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#45a29e" />
            <XAxis dataKey="day" stroke="#c5c6c7" />
            <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft", fill: "#c5c6c7" }} domain={[0, 'dataMax']} stroke="#c5c6c7" />
            <Tooltip formatter={(value) => `${value.toFixed(1)} hrs`} contentStyle={{ backgroundColor: "#1f2833", border: "1px solid #45a29e" }} labelStyle={{ color: "#66fcf1" }} />
            <Bar dataKey="totalHours" fill="#66fcf1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {showPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupContent}>
            <h2 style={{ ...styles.heading, color: "#c5c6c7" }}>{popupMessage}</h2>
            <button onClick={() => setShowPopup(false)} style={styles.closeButton}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FocusTimer;