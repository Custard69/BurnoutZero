import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      let userData;

      if (userDoc.exists()) {
        userData = userDoc.data();
        await updateDoc(userRef, {
          lastLogin: new Date().toISOString(),
        });
        userData = { ...userData, lastLogin: new Date().toISOString() };
      } else {
        userData = {
          email: user.email,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          streak: 0,
          role: "user",
        };
        await setDoc(userRef, userData);
      }

      onLogin({ ...user, profile: userData });

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.cardContainer}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Login</h2>
          <p style={styles.subtitle}>Welcome back to BurnoutZero</p>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <button type="submit" style={styles.button}>
            Login
          </button>
          {error && <p style={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
};

const styles = {
  cardContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#2e2e4a',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'transform 0.3s ease-in-out',
  },
  header: {
    marginBottom: '30px',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#a0a0c0',
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
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#a0a0c0',
    marginBottom: '8px',
  },
  input: {
    width: 'calc(100% - 24px)',
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '10px',
    border: '1px solid #4a4a6e',
    backgroundColor: '#3b3b5c',
    color: '#ffffff',
    transition: 'border-color 0.3s ease',
    outline: 'none',
  },
  button: {
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
  error: {
    color: '#ff6b6b',
    marginTop: '20px',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
};

export default Login;