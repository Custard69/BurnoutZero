import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { getAuth } from "firebase/auth";
import "react-big-calendar/lib/css/react-big-calendar.css";
import GoogleConnect from "./GoogleConnect"; // ✅ import button

const localizer = momentLocalizer(moment);

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsConnection, setNeedsConnection] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;

      if (!userId) {
        console.error("User not logged in");
        return;
      }

      const res = await fetch(
        `http://localhost:5000/calendar/events?user_id=${userId}`
      );
      const data = await res.json();

      if (data.error) {
        console.error("Calendar error:", data.error);
        // If user hasn’t connected their Google Calendar yet
        if (data.error.includes("not authenticated")) {
          setNeedsConnection(true);
        }
        setLoading(false);
        return;
      }

      const mappedEvents = data.map((e) => ({
        title: e.summary,
        start: new Date(e.start.dateTime || e.start.date),
        end: new Date(e.end.dateTime || e.end.date),
        allDay: !e.start.dateTime,
      }));

      setEvents(mappedEvents);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  if (loading) return <p>Loading calendar...</p>;

  if (needsConnection) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Connect your Google Calendar</h2>
        <GoogleConnect /> {/* ✅ show connect button */}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>My Calendar</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
      />
    </div>
  );
};

export default CalendarPage;
