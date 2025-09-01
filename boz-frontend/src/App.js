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
    background: "linear-gradient(45deg, #0a0a1a, #1a1a2e, #2e2e4a)",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: "#e0e0e0",
    padding: "0",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 40px",
    background: "linear-gradient(90deg, #1e3a8a, #4a4a6e)",
    color: "white",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
  },
  logo: {
    fontWeight: "bold",
    fontSize: "24px",
    letterSpacing: "1px",
    textShadow: "0 0 5px rgba(255,255,255,0.2)",
  },
  nav: {
    display: "flex",
    gap: "20px",
  },
  navLink: {
    color: "white",
    textDecoration: "none",
    fontWeight: "500",
    padding: "8px 15px",
    borderRadius: "8px",
    transition: "background-color 0.3s ease, transform 0.2s ease",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userEmail: {
    fontSize: "0.9rem",
    color: "#c0c0e0",
  },
  logoutBtn: {
    backgroundColor: "#f87171",
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
  },
  unauthHeader: {
    marginBottom: "30px",
    textAlign: "center",
  },
  unauthTitle: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: "8px",
  },
  toggleText: {
    fontSize: "1rem",
    color: "#a0a0c0",
    marginTop: "20px",
    textAlign: "center",
  },
  toggleButton: {
    background: "none",
    border: "none",
    color: "#6a67f0",
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
    await signOut(auth);
    setUser(null);
  };

  if (loading) return <p>Loading...</p>;

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
        <div style={{ padding: "20px" }}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <div>
                  <CheckInForm />
                  <Dashboard />
                </div>
              }
            />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/focus" element={<FocusTimerPage />} /> {/* ⬅️ NEW */}
            <Route path="/placeholder1" element={<PlaceholderPage title="Placeholder 1" />} />
            <Route path="/placeholder2" element={<PlaceholderPage title="Placeholder 2" />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<p>Page not found</p>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
