import React, { useEffect, useRef, useState } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,    // ✅ Add this
  Title,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,    // ✅ Add this
  Title,
  Tooltip,
  Legend
);


Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [checkins, setCheckins] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/checkins")
      .then((res) => res.json())
      .then((data) => setCheckins(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
  if (!chartRef.current) return;
  if (chartInstance.current) chartInstance.current.destroy();

  // Sort check-ins by timestamp (oldest first)
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
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "Burnout Dashboard - Check-in Trends" },
        legend: { position: "top" },
      },
      scales: {
        y: { min: 0, max: 10 },
      },
    },
  });
}, [checkins]);

  return (
    <div style={{ marginTop: "40px" }}>
      <h2>Burnout Dashboard</h2>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default Dashboard;

