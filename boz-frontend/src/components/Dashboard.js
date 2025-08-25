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
          x: {
            ticks: {
              maxTicksLimit: 7, // ✅ Limit to 7 sections
            },
          },
          y: {
            min: 0,
            max: 10,
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
