import React, { useEffect, useRef, useState } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { db } from "../firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend
);

const ProfileAnalytics = ({ user }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [userData, setUserData] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch user profile
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", user.uid)
        );
        const userSnap = await getDocs(userQuery);
        if (!userSnap.empty) {
          setUserData(userSnap.docs[0].data());
        } else {
          setUserData({ name: "Unknown User", email: user.email, role: "user", streak: 0 });
        }

        // Fetch check-ins
        const checkinQuery = query(
          collection(db, "checkins"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "asc")
        );
        const checkinSnap = await getDocs(checkinQuery);

        const userCheckins = checkinSnap.docs.map((doc) => {
          const data = doc.data();
          let ts = data.timestamp;
          let timestamp = ts && ts.toDate ? ts.toDate() : new Date(ts); // handle Timestamp or string

          return {
            id: doc.id,
            mood: Number(data.mood),
            stress: Number(data.stress),
            sleep: Number(data.sleep),
            timestamp,
          };
        });

        setCheckins(userCheckins);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!chartRef.current || checkins.length === 0) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext("2d");

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: checkins.map((c) => c.timestamp.toLocaleDateString()),
        datasets: [
          { label: "Mood", data: checkins.map((c) => c.mood), borderColor: "blue", fill: false },
          { label: "Stress", data: checkins.map((c) => c.stress), borderColor: "red", fill: false },
          { label: "Sleep", data: checkins.map((c) => c.sleep), borderColor: "green", fill: false },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Your Check-in Trends" },
          legend: { position: "top" },
        },
        scales: {
          y: { min: 0, max: 10 },
        },
      },
    });
  }, [checkins]);

  if (loading) return <p>Loading profile...</p>;
  if (!userData) return <p>User profile not found.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Profile & Analytics</h2>
      <p><strong>Name:</strong> {userData.name}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Role:</strong> {userData.role}</p>
      <p><strong>Last Login:</strong> {new Date(userData.lastLogin).toLocaleString()}</p>
      <p><strong>Streak:</strong> {userData.streak || 0}</p>

      {checkins.length === 0 ? (
        <p>No check-ins yet. Submit a check-in from your dashboard!</p>
      ) : (
        <canvas ref={chartRef} style={{ marginTop: "20px", maxWidth: "700px" }} />
      )}
    </div>
  );
};

export default ProfileAnalytics;
