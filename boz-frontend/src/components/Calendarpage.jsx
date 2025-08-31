import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import { getAuth } from "firebase/auth";
import "react-big-calendar/lib/css/react-big-calendar.css";
import GoogleConnect from "./GoogleConnect";

const localizer = momentLocalizer(moment);

// 🔹 Custom toolbar with month/year selector
const CustomToolbar = ({ label, onNavigate, date, setDate }) => {
  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    const newDate = new Date(date);
    newDate.setMonth(newMonth);
    setDate(newDate);
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    const newDate = new Date(date);
    newDate.setFullYear(newYear);
    setDate(newDate);
  };

  const months = moment.months();
  const years = [];
  for (let y = 2023; y <= 2030; y++) years.push(y);

  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
      <button onClick={() => onNavigate("PREV")}>◀ Back</button>
      <button onClick={() => onNavigate("TODAY")}>Today</button>
      <button onClick={() => onNavigate("NEXT")}>Next ▶</button>

      <span style={{ marginLeft: "20px" }}>
        Month:{" "}
        <select value={date.getMonth()} onChange={handleMonthChange}>
          {months.map((m, i) => (
            <option key={i} value={i}>
              {m}
            </option>
          ))}
        </select>
      </span>

      <span style={{ marginLeft: "10px" }}>
        Year:{" "}
        <select value={date.getFullYear()} onChange={handleYearChange}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
};

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchEvents = async () => {
      if (!userId) return;

      const res = await fetch(
        `http://localhost:5000/calendar/events?user_id=${userId}`
      );
      const data = await res.json();

      if (data.error) {
        if (data.error.includes("not authenticated")) setNeedsConnection(true);
        setLoading(false);
        return;
      }

      const mappedEvents = data.map((e) => ({
        id: e.id,
        title: e.summary,
        start: new Date(e.start.dateTime || e.start.date),
        end: new Date(e.end.dateTime || e.end.date),
        allDay: !e.start.dateTime,
      }));

      setEvents(mappedEvents);
      setLoading(false);
    };

    fetchEvents();
  }, [userId]);

  const handleSelectSlot = async (slotInfo) => {
    const title = prompt("Enter event title:");
    if (!title) return;

    const newEvent = {
      summary: title,
      start: { dateTime: slotInfo.start.toISOString(), timeZone: "UTC" },
      end: { dateTime: slotInfo.end.toISOString(), timeZone: "UTC" },
      description: "",
    };

    const res = await fetch("http://localhost:5000/calendar/event/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event: newEvent }),
    });

    const data = await res.json();

    if (data.success) {
      setEvents([
        ...events,
        {
          id: data.event_id,
          title,
          start: new Date(slotInfo.start),
          end: new Date(slotInfo.end),
        },
      ]);
      alert("Event added!");
    } else {
      alert("Error: " + data.error);
    }
  };

  const handleSelectEvent = async (event) => {
    if (!window.confirm(`Delete event "${event.title}"?`)) return;

    const res = await fetch("http://localhost:5000/calendar/event/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event_id: event.id }),
    });

    const data = await res.json();
    if (data.success) setEvents(events.filter((e) => e.id !== event.id));
  };

  if (loading) return <p>Loading calendar...</p>;
  if (needsConnection)
    return (
      <div style={{ padding: 20 }}>
        <h2>Connect your Google Calendar</h2>
        <GoogleConnect />
      </div>
    );

  return (
    <div style={{ padding: 20 }}>
      <h2>My Calendar</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        views={["month"]}
        defaultView={Views.MONTH}
        popup
        date={currentDate}
        onNavigate={(date) => setCurrentDate(date)}
        components={{
          toolbar: (props) => (
            <CustomToolbar {...props} date={currentDate} setDate={setCurrentDate} />
          ),
        }}
      />
    </div>
  );
};

export default CalendarPage;
