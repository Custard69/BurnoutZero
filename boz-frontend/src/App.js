import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Signup from "./components/Signup";
import CheckInForm from "./components/CheckInForm";
import Dashboard from "./components/Dashboard";
import { auth } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null); // Track logged-in user
  const [isSignup, setIsSignup] = useState(false); // Toggle between Login & Signup
  const [loading, setLoading] = useState(true); // To prevent flicker on refresh

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe(); // cleanup on unmount
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) {
    return <p>Loading...</p>; // Prevents flicker while checking auth
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>BOZ Platform</h1>

      {!user ? (
        <div>
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
      ) : (
        <div>
          <p>Welcome, {user.email}!</p>
          <button onClick={handleLogout}>Logout</button>
          <CheckInForm />
          <Dashboard />
        </div>
      )}
    </div>
  );
}

export default App;
