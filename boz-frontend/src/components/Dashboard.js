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
          { label: "Mood", data: sortedCheckins.map((c) => Number(c.mood)), borderColor: "#4c6ef5", backgroundColor: "rgba(76, 110, 245, 0.2)", fill: true, tension: 0.4 },
          { label: "Stress", data: sortedCheckins.map((c) => Number(c.stress)), borderColor: "#ff6b6b", backgroundColor: "rgba(255, 107, 107, 0.2)", fill: true, tension: 0.4 },
          { label: "Sleep", data: sortedCheckins.map((c) => Number(c.sleep)), borderColor: "#40c057", backgroundColor: "rgba(64, 192, 87, 0.2)", fill: true, tension: 0.4 },
          {
            label: "Burnout Risk",
            data: sortedCheckins.map((c) => c.burnout_probability ? Number((c.burnout_probability * 10).toFixed(2)) : 0),
            borderColor: "#fab005",
            fill: false,
            tension: 0.4,
            borderDash: [5, 5],
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { 
            display: true, 
            text: "Burnout Dashboard - Check-in Trends", 
            color: '#e0e0e0',
            font: { size: 18, weight: 'bold' }
          },
          legend: { 
            position: "top",
            labels: { color: '#e0e0e0' }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                if (context.dataset.label === "Burnout Risk") {
                  const val = context.raw * 10;
                  return `Burnout Risk: ${val.toFixed(2)}%`;
                }
                return `${context.dataset.label}: ${context.raw}`;
              },
            },
          },
        },
        scales: {
          x: { 
            ticks: { maxTicksLimit: 7, color: '#a0a0c0' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          y: {
            min: 0,
            max: 10,
            title: { display: true, text: "1–10 scale", color: '#a0a0c0' },
            ticks: { color: '#a0a0c0' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
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
    <div style={dashboardStyles.container}>
      <h2 style={dashboardStyles.heading}>Dashboard</h2>
      <div style={dashboardStyles.contentWrapper}>
        <div style={dashboardStyles.chartCard}>
          {checkins.length === 0 ? (
            <p style={dashboardStyles.emptyState}>No check-ins yet. Submit a daily check-in to see your trends here!</p>
          ) : (
            <canvas ref={chartRef} style={dashboardStyles.chartCanvas}></canvas>
          )}
        </div>
        <div style={dashboardStyles.eventsCard}>
          <h3 style={dashboardStyles.cardTitle}>Today's Events</h3>
          <ul style={dashboardStyles.eventsList}>
            {todayEvents.length === 0 ? (
              <p style={dashboardStyles.emptyEvents}>No events scheduled for today.</p>
            ) : (
              todayEvents.map((e) => (
                <li key={e.id} style={dashboardStyles.eventItem}>
                  <strong style={dashboardStyles.eventSummary}>{e.summary}</strong>
                  <span style={dashboardStyles.eventTime}>
                    {new Date(e.start.dateTime || e.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <div style={dashboardStyles.buttonContainer}>
        <button
          onClick={() => window.location.href = "/calendar"}
          style={dashboardStyles.primaryButton}
        >
          Open Full Calendar
        </button>
      </div>
    </div>
  );
};

const dashboardStyles = {
  container: {
    padding: "30px 40px",
    background: "#0f111a",
    color: "#f0f0f5",
    minHeight: "100vh",
    fontFamily: "'Inter', sans-serif",
    boxSizing: "border-box",
  },
  heading: {
    fontSize: "2.8rem",
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: "40px",
    letterSpacing: "1px",
  },
  contentWrapper: {
    display: "flex",
    flexWrap: "wrap",
    gap: "40px",
    justifyContent: "center",
  },
  chartCard: {
    flex: "2",
    minWidth: "600px",
    height: "420px",
    backgroundColor: "#1a1c2b",
    padding: "25px",
    borderRadius: "25px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  chartCanvas: {
    width: "100% !important",
    height: "100% !important",
  },
  eventsCard: {
    flex: "1",
    minWidth: "320px",
    backgroundColor: "#1a1c2b",
    padding: "25px",
    borderRadius: "25px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
    maxHeight: "440px",
    overflowY: "auto",
  },
  cardTitle: {
    fontSize: "1.6rem",
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: "25px",
    textAlign: "center",
  },
  eventsList: {
    listStyleType: "none",
    padding: 0,
    margin: 0,
    width: "100%",
  },
  eventItem: {
    backgroundColor: "#27293d",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
    boxShadow: "0 3px 15px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.2s ease",
  },
  eventItemHover: {
    transform: "scale(1.02)",
  },
  eventSummary: {
    color: "#ffffff",
    fontWeight: "500",
    fontSize: "1rem",
    marginBottom: "6px",
  },
  eventTime: {
    color: "#a8a8c0",
    fontSize: "0.9rem",
  },
  emptyState: {
    textAlign: "center",
    color: "#a0a0c0",
    fontSize: "1.2rem",
    padding: "25px",
  },
  emptyEvents: {
    textAlign: "center",
    color: "#a0a0c0",
    fontSize: "1rem",
    padding: "15px",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "35px",
  },
  primaryButton: {
    padding: "15px 32px",
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#ffffff",
    background: "linear-gradient(135deg, #6a67f0, #9167f0)",
    border: "none",
    borderRadius: "15px",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(105,103,240,0.6)",
    transition: "all 0.3s ease",
  },
  primaryButtonHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 25px rgba(105,103,240,0.8)",
  },
};


export default Dashboard;
