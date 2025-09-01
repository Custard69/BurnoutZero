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
    padding: "20px",
    background: '#1a1a2e',
    color: '#e0e0e0',
    minHeight: '100vh',
    boxSizing: 'border-box'
  },
  heading: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: '30px',
  },
  contentWrapper: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chartCard: {
    flex: '2',
    minWidth: '600px',
    height: '400px',
    backgroundColor: '#2e2e4a',
    padding: '20px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartCanvas: {
    width: '100% !important',
    height: '100% !important',
  },
  eventsCard: {
    flex: '1',
    minWidth: '300px',
    backgroundColor: '#2e2e4a',
    padding: '20px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    maxHeight: '440px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '20px',
    textAlign: 'center',
  },
  eventsList: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    width: '100%',
  },
  eventItem: {
    backgroundColor: '#3b3b5c',
    borderRadius: '10px',
    padding: '15px',
    marginBottom: '15px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
  },
  eventSummary: {
    color: '#ffffff',
  },
  eventTime: {
    color: '#a0a0c0',
    fontSize: '0.9rem',
  },
  emptyState: {
    textAlign: 'center',
    color: '#a0a0c0',
    fontSize: '1.2rem',
    padding: '20px',
  },
  emptyEvents: {
    textAlign: 'center',
    color: '#a0a0c0',
    fontSize: '1rem',
    padding: '10px',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '30px',
  },
  primaryButton: {
    padding: '14px 28px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#ffffff',
    background: 'linear-gradient(45deg, #6a67f0, #9167f0)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.3s ease, transform 0.2s ease',
  }
};

export default Dashboard;
