import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import CheckInForm from "./components/CheckInForm";
import Dashboard from "./components/Dashboard";
import CalendarPage from "./components/Calendarpage"; // your calendar page
import PlaceholderPage from "./components/PlaceholderPage"; // create 2 placeholder pages
import { auth } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

// Persistent header component
const Header = ({ user, handleLogout }) => {
  return (
    <header style={styles.header}>
      <div style={styles.logo}>BOZ - BurnOutZero</div>
      <nav>
        <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
        <Link to="/calendar" style={styles.navLink}>Calendar</Link>
        <Link to="/placeholder1" style={styles.navLink}>Placeholder 1</Link>
        <Link to="/placeholder2" style={styles.navLink}>Placeholder 2</Link>
      </nav>
      <div>
        <span style={{ marginRight: 10 }}>{user.email}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
};

// Simple theme styles
const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    backgroundColor: "#1e3a8a", // deep blue
    color: "white",
    marginBottom: "20px",
  },
  logo: { fontWeight: "bold", fontSize: "20px" },
  navLink: { margin: "0 10px", color: "white", textDecoration: "none" },
  logoutBtn: {
    backgroundColor: "#f87171", // red
    border: "none",
    padding: "5px 10px",
    borderRadius: "5px",
    color: "white",
    cursor: "pointer",
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
      <div style={{ padding: "20px" }}>
        <h1>BOZ Platform</h1>
        {isSignup ? (
          <Signup onSignup={setUser} />
        ) : (
          <Login onLogin={setUser} />
        )}
        <p>
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </p>
      </div>
    );
  }

  return (
    <Router>
      <Header user={user} handleLogout={handleLogout} />
      <div style={{ padding: "0 20px" }}>
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
        <Route path="/placeholder1" element={<PlaceholderPage title="Placeholder 1" />} />
        <Route path="/placeholder2" element={<PlaceholderPage title="Placeholder 2" />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<p>Page not found</p>} />
      </Routes>

      </div>
    </Router>
  );
}

export default App;
