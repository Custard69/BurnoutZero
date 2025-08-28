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

// Register chart.js components
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

  // Fetch check-ins from backend for current user
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    fetch(`http://127.0.0.1:5000/checkins?user_id=${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched check-ins:", data);
        setCheckins(data);
      })
      .catch((err) => console.error(err));
  }, []);

  // Draw chart whenever check-ins change
  useEffect(() => {
    if (!chartRef.current || checkins.length === 0) return;

    // Destroy previous chart instance to avoid duplicates
    if (chartInstance.current) chartInstance.current.destroy();

    // Sort check-ins by timestamp ascending
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
          {
            label: "Mood",
            data: sortedCheckins.map((c) => Number(c.mood)),
            borderColor: "blue",
            fill: false,
          },
          {
            label: "Stress",
            data: sortedCheckins.map((c) => Number(c.stress)),
            borderColor: "red",
            fill: false,
          },
          {
            label: "Sleep",
            data: sortedCheckins.map((c) => Number(c.sleep)),
            borderColor: "green",
            fill: false,
          },
          {
            label: "Burnout Risk",
            // Scale 0-1 to 0-10 for visual consistency
            data: sortedCheckins.map((c) =>
              c.burnout_probability
                ? Number((c.burnout_probability * 10).toFixed(2))
                : 0
            ),
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
                  // Show actual burnout % in tooltip
                  const val = context.raw * 10; // 0-10 → 0-100%
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
            max: 10, // Keep all features on same scale
            title: { display: true, text: "1–10 scale (Mood/Stress/Sleep), Burnout Risk scaled 0–10" },
          },
        },
      },
    });
  }, [checkins]);

  return (
    <div style={{ marginTop: "40px", textAlign: "left" }}>
      <h2>Burnout Dashboard</h2>
      {checkins.length === 0 ? (
        <p>No check-ins found for this user.</p>
      ) : (
        <div style={{ width: "600px", marginLeft: "0px" }}>
          <canvas ref={chartRef}></canvas>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
