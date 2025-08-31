import React, { useEffect, useRef, useState } from "react";
import { auth } from "../firebase";
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

const Dashboard = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [checkins, setCheckins] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);

  const user = auth.currentUser;

  // Fetch check-ins for the chart
  useEffect(() => {
    if (!user) return;

    fetch(`http://127.0.0.1:5000/checkins?user_id=${user.uid}`)
      .then((res) => res.json())
      .then((data) => setCheckins(data))
      .catch((err) => console.error(err));
  }, [user]);

  // Draw chart
  useEffect(() => {
    if (!chartRef.current || checkins.length === 0) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const sortedCheckins = [...checkins].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const ctx = chartRef.current.getContext("2d");
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: sortedCheckins.map((c) =>
          new Date(c.timestamp).toLocaleDateString()
        ),
        datasets: [
          { label: "Mood", data: sortedCheckins.map((c) => Number(c.mood)), borderColor: "blue", fill: false },
          { label: "Stress", data: sortedCheckins.map((c) => Number(c.stress)), borderColor: "red", fill: false },
          { label: "Sleep", data: sortedCheckins.map((c) => Number(c.sleep)), borderColor: "green", fill: false },
          {
            label: "Burnout Risk",
            data: sortedCheckins.map((c) => c.burnout_probability ? Number((c.burnout_probability * 10).toFixed(2)) : 0),
            borderColor: "orange",
            fill: false,
            tension: 0.2,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Burnout Dashboard - Check-in Trends" },
          legend: { position: "top" },
          tooltip: {
            callbacks: {
              label: function (context) {
                if (context.dataset.label === "Burnout Risk") {
                  const val = context.raw * 10; // scale 0-100%
                  return `Burnout Risk: ${val.toFixed(2)}%`;
                }
                return `${context.dataset.label}: ${context.raw}`;
              },
            },
          },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 7 } },
          y: {
            min: 0,
            max: 10,
            title: { display: true, text: "1–10 scale (Mood/Stress/Sleep), Burnout Risk scaled 0–10" },
          },
        },
      },
    });
  }, [checkins]);

  // Fetch today's calendar events
  useEffect(() => {
    if (!user) return;

    const fetchTodayEvents = async () => {
  const res = await fetch(`http://localhost:5000/calendar/events?user_id=${user.uid}`);
  const data = await res.json();

  if (!Array.isArray(data)) {
    console.error("Calendar API returned non-array data:", data);
    setTodayEvents([]);
    return;
  }

  const today = new Date().toDateString();
  const filtered = data.filter((e) => {
    const start = new Date(e.start.dateTime || e.start.date);
    return start.toDateString() === today;
  });
  setTodayEvents(filtered);
};


    fetchTodayEvents();
  }, [user]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dashboard</h2>

      <div style={{
        display: "flex",
        gap: "20px",
        flexWrap: "wrap",
      }}>
        {/* Burnout Chart */}
        <div style={{
          flex: "2",
          minWidth: "600px",
          backgroundColor: "#f0f4f8",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          {checkins.length === 0 ? (
            <p>No check-ins yet.</p>
          ) : (
            <canvas ref={chartRef}></canvas>
          )}
        </div>

        {/* Today's Events Widget */}
        <div style={{
          flex: "1",
          minWidth: "300px",
          backgroundColor: "#fff4e6",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          maxHeight: "600px",
          overflowY: "auto"
        }}>
          <h3>Today's Events</h3>
          {todayEvents.length === 0 ? (
            <p>No events today</p>
          ) : (
            <ul>
              {todayEvents.map((e) => (
                <li key={e.id} style={{ marginBottom: "10px" }}>
                  <strong>{e.summary}</strong><br />
                  {new Date(e.start.dateTime || e.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Link to Full Calendar */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => window.location.href = "/calendar"}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Open Full Calendar
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
