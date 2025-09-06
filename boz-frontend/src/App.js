import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import CheckInForm from "./components/CheckInForm";
import Dashboard from "./components/Dashboard";
import CalendarPage from "./components/Calendarpage";
import PlaceholderPage from "./components/PlaceholderPage";
import FocusTimerPage from "./components/FocusTimerPage"; // ⬅️ NEW
import { auth } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

// Persistent header component
const Header = ({ user, handleLogout }) => {
  return (
    <header style={styles.header}>
      <div style={styles.logo}>BOZ - BurnOutZero</div>
      <nav style={styles.nav}>
        <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
        <Link to="/calendar" style={styles.navLink}>Calendar</Link>
        <Link to="/focus" style={styles.navLink}>Focus Timer</Link> {/* ⬅️ NEW */}
        <Link to="/placeholder1" style={styles.navLink}>Placeholder 1</Link>
        <Link to="/placeholder2" style={styles.navLink}>Placeholder 2</Link>
      </nav>
      <div style={styles.userSection}>
        <span style={styles.userEmail}>{user.email}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
};

const styles = {
  mainContainer: {
    minHeight: "100vh",
    width: "100%",
    background: "#0b0c10",
    fontFamily: 'Roboto, sans-serif',
    color: "#c5c6c7",
    padding: "0",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 40px",
    background: "#1f2833",
    color: "#c5c6c7",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontWeight: "bold",
    fontSize: "24px",
    letterSpacing: "1px",
    textShadow: "0 0 5px #66fcf1",
    color: "#66fcf1",
  },
  nav: {
    display: "flex",
    gap: "20px",
  },
  navLink: {
    color: "#c5c6c7",
    textDecoration: "none",
    fontWeight: "500",
    padding: "8px 15px",
    borderRadius: "8px",
    transition: "background-color 0.3s ease, color 0.3s ease",
    ":hover": {
      backgroundColor: "#2a3440",
      color: "#66fcf1",
    },
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userEmail: {
    fontSize: "0.9rem",
    color: "#c5c6c7",
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    border: "none",
    padding: "8px 15px",
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
    transition: "background-color 0.3s ease, transform 0.2s ease",
  },
  unauthPageContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    width: "100%",
    padding: "20px",
    boxSizing: "border-box",
    background: "#0b0c10",
  },
  unauthHeader: {
    marginBottom: "30px",
    textAlign: "center",
  },
  unauthTitle: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#66fcf1",
    marginBottom: "8px",
  },
  toggleText: {
    fontSize: "1rem",
    color: "#c5c6c7",
    marginTop: "20px",
    textAlign: "center",
  },
  toggleButton: {
    background: "none",
    border: "none",
    color: "#66fcf1",
    fontWeight: "bold",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "1rem",
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
  // ✅ Show logout confirmation popup
  const confirmLogout = window.confirm("Are you sure you want to logout?");
  if (!confirmLogout) return;

  await signOut(auth);
  alert("You have successfully logged out!");
  setUser(null);
};


  if (loading) return <p style={{ textAlign: "center", padding: "40px", color: "#c5c6c7" }}>Loading...</p>;

  // If not logged in, show login/signup only
  if (!user) {
    return (
      <div style={styles.mainContainer}>
        <div style={styles.unauthPageContainer}>
          <div style={styles.unauthHeader}>
            <h1 style={styles.unauthTitle}>BOZ Platform</h1>
          </div>
          {isSignup ? <Signup onSignup={setUser} /> : <Login onLogin={setUser} />}
          <p style={styles.toggleText}>
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              style={styles.toggleButton}
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? "Login" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div style={styles.mainContainer}>
        <Header user={user} handleLogout={handleLogout} />
        <div style={{ padding: "40px" }}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <div style={{ padding: "20px" }}>
                  <CheckInForm />
                  <Dashboard />
                </div>
              }
            />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/focus" element={<FocusTimerPage />} />
            <Route path="/placeholder1" element={<PlaceholderPage title="Placeholder 1" />} />
            <Route path="/placeholder2" element={<PlaceholderPage title="Placeholder 2" />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<p style={{ textAlign: "center", marginTop: "50px", color: "#ef4444" }}>404 | Page not found</p>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;