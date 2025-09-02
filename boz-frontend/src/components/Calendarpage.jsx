import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import { getAuth } from "firebase/auth";
import "react-big-calendar/lib/css/react-big-calendar.css";
import GoogleConnect from "./GoogleConnect";
import { grid } from 'ldrs';
grid.register();


const localizer = momentLocalizer(moment);

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
    <div style={toolbarStyles.container}>
      <div style={toolbarStyles.navigation}>
        <button style={toolbarStyles.navButton} onClick={() => onNavigate("PREV")}>◀</button>
        <button style={toolbarStyles.todayButton} onClick={() => onNavigate("TODAY")}>Today</button>
        <button style={toolbarStyles.navButton} onClick={() => onNavigate("NEXT")}>▶</button>
      </div>

      <div style={toolbarStyles.viewSelector}>
        <span style={toolbarStyles.label}>{label}</span>
      </div>

      <div style={toolbarStyles.dateSelector}>
        <select style={toolbarStyles.select} value={date.getMonth()} onChange={handleMonthChange}>
          {months.map((m, i) => (
            <option key={i} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select style={toolbarStyles.select} value={date.getFullYear()} onChange={handleYearChange}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const toolbarStyles = {
  container: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    backgroundColor: '#rgb(12 12 12)',
    padding: "15px",
    borderRadius: "15px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
  },
  navigation: {
    display: "flex",
    gap: "10px",
  },
  navButton: {
    backgroundColor: "#4a4a6e",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    transition: "background-color 0.2s, transform 0.2s",
    fontSize: "1rem",
  },
  todayButton: {
    backgroundColor: "#6a67f0",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    transition: "background-color 0.2s, transform 0.2s",
    fontWeight: "bold",
    fontSize: "1rem",
  },
  viewSelector: {
    flexGrow: 1,
    textAlign: "center",
  },
  label: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#ffffff",
  },
  dateSelector: {
    display: "flex",
    gap: "10px",
  },
  select: {
    backgroundColor: "#3b3b5c",
    color: "#ffffff",
    border: "1px solid #4a4a6e",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "1rem",
  },
};

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [messageBox, setMessageBox] = useState(null);

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

  const handleSelectSlot = (slotInfo) => {
    setMessageBox({
      type: 'add',
      title: 'Add New Event',
      message: 'Enter event title:',
      slotInfo,
    });
  };

  const handleSelectEvent = (event) => {
    setMessageBox({
      type: 'delete',
      title: 'Delete Event',
      message: `Are you sure you want to delete "${event.title}"?`,
      event,
    });
  };

  const handleAddEvent = async (title, slotInfo) => {
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
    setMessageBox(null);

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
      setMessageBox({ type: 'info', title: 'Success', message: 'Event added successfully!' });
    } else {
      setMessageBox({ type: 'error', title: 'Error', message: 'Error: ' + data.error });
    }
  };

  const handleDeleteEvent = async (event) => {
    const res = await fetch("http://localhost:5000/calendar/event/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event_id: event.id }),
    });

    const data = await res.json();
    setMessageBox(null);

    if (data.success) {
      setEvents(events.filter((e) => e.id !== event.id));
      setMessageBox({ type: 'info', title: 'Success', message: 'Event deleted successfully!' });
    } else {
      setMessageBox({ type: 'error', title: 'Error', message: 'Error: ' + data.error });
    }
  };

 if (loading) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <l-grid size="60" speed="1.5" color="#ffffff"></l-grid>

    </div>
  );
}

  if (needsConnection)
    return (
      <div style={pageStyles.container}>
        <div style={pageStyles.card}>
          <h2 style={pageStyles.heading}>Connect your Google Calendar</h2>
          <GoogleConnect />
        </div>
      </div>
    );

  return (
    <div style={pageStyles.container}>
      <style>
        {`
          .rbc-calendar {
            background-color: #2e2e4a;
            border: none;
            color: #e0e0e0;
            font-family: 'Inter', sans-serif;
            border-radius: 20px;
          }
          .rbc-month-view {
            border: none;
          }
          .rbc-header {
            background-color: #3b3b5c;
            border-bottom: 1px solid #4a4a6e;
            color: #ffffff;
            font-weight: bold;
            border-top: none; /* Removed top border */
          }
          .rbc-day-bg {
            background-color: #2e2e4a;
            border-left: none !important; /* Removed left border */
            border-bottom: none !important; /* Removed bottom border */
          }
          .rbc-day-bg.rbc-off-range-bg {
            background-color: #28283a;
          }
          .rbc-date-cell {
            color: #a0a0c0;
          }
          .rbc-current-time-indicator {
            background-color: #6a67f0;
          }
          .rbc-today {
            background-color: #3b3b5c;
            box-shadow: inset 0 0 0 2px #6a67f0;
          }
          .rbc-event {
            background-color: #6a67f0;
            background-image: linear-gradient(45deg, #6a67f0, #9167f0);
            border: none;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            font-weight: bold;
            color: #ffffff;
            opacity: 1; /* Ensure full opacity */
          }
          .rbc-more-link {
            background: linear-gradient(45deg, #ff8a00, #ffc700);
            color: #ffffff;
            border: none;
            border-radius: 4px;
            padding: 2px 6px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
            font-weight: bold;
            text-decoration: none;
          }
        `}
      </style>
      <div style={pageStyles.card}>
        <h2 style={pageStyles.heading}>My Calendar</h2>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={pageStyles.calendar}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          views={["month"]}
          defaultView={Views.MONTH}
          components={{
            toolbar: (props) => (
              <CustomToolbar {...props} date={currentDate} setDate={setCurrentDate} />
            ),
          }}
        />
      </div>

      {messageBox && (
        <div style={pageStyles.overlay}>
          <div style={pageStyles.messageBox}>
            <h3 style={pageStyles.messageBoxTitle}>{messageBox.title}</h3>
            <p style={pageStyles.messageBoxText}>{messageBox.message}</p>
            {messageBox.type === 'add' && (
              <input
                type="text"
                placeholder="Event title"
                style={pageStyles.messageBoxInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddEvent(e.target.value, messageBox.slotInfo);
                }}
              />
            )}
            <div style={pageStyles.messageBoxButtons}>
              {messageBox.type === 'add' && (
                <button
                  style={pageStyles.messageBoxButton}
                  onClick={() => handleAddEvent(
                    document.querySelector(`input[placeholder="Event title"]`).value,
                    messageBox.slotInfo
                  )}
                >
                  Add
                </button>
              )}
              {messageBox.type === 'delete' && (
                <button
                  style={pageStyles.messageBoxButton}
                  onClick={() => handleDeleteEvent(messageBox.event)}
                >
                  Delete
                </button>
              )}
              <button
                style={{...pageStyles.messageBoxButton, backgroundColor: '#4a4a6e' }}
                onClick={() => setMessageBox(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const pageStyles = {
  container: {
    padding: '20px',
    background: '#rgb(12 12 12)',
    color: '#e0e0e0',
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  card: {
    width: '100%',
    maxWidth: '900px',
    backgroundColor: '#2e2e4a',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px',
  },
  heading: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '20px',
  },
  calendar: {
    height: '600px',
    width: '100%',
    color: '#e0e0e0',
  },
  loading: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: '1.2rem',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  messageBox: {
    backgroundColor: '#3b3b5c',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.4)',
    textAlign: 'center',
    width: '90%',
    maxWidth: '400px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  messageBoxTitle: {
    color: '#ffffff',
    fontSize: '1.5rem',
    marginBottom: '10px',
  },
  messageBoxText: {
    color: '#a0a0c0',
    marginBottom: '20px',
  },
  messageBoxInput: {
    width: 'calc(100% - 20px)',
    padding: '10px',
    backgroundColor: '#4a4a6e',
    border: '1px solid #6a67f0',
    borderRadius: '8px',
    color: '#ffffff',
    marginBottom: '20px',
    outline: 'none',
  },
  messageBoxButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    width: '100%',
  },
  messageBoxButton: {
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#6a67f0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
};

export default CalendarPage;