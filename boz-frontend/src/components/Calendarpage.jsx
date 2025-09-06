import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import { getAuth } from "firebase/auth";
import "react-big-calendar/lib/css/react-big-calendar.css";
import GoogleConnect from "./GoogleConnect";
import { grid } from 'ldrs';
grid.register();

const localizer = momentLocalizer(moment);

const CustomToolbar = ({ label, onNavigate, date, setDate, onView }) => {
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
        <div style={{display: 'flex', gap: '5px'}}>
          <button style={toolbarStyles.viewButton} onClick={() => onView('month')}>Month</button>
          <button style={toolbarStyles.viewButton} onClick={() => onView('week')}>Week</button>
          <button style={toolbarStyles.viewButton} onClick={() => onView('day')}>Day</button>
        </div>
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

const Event = ({ event }) => (
    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
        {moment(event.start).format('h:mm A')} - {event.title}
    </span>
);

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
  viewButton: {
    backgroundColor: "#3b3b5c",
    color: "#ffffff",
    border: "1px solid #4a4a6e",
    borderRadius: "8px",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "500",
  },
};

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [messageBox, setMessageBox] = useState(null);
  const [view, setView] = useState(Views.MONTH);

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
      const mappedEvents = data.map((e) => {
        const isAllDay = !e.start.dateTime;
        const start = new Date(e.start.dateTime || e.start.date);
        let end = new Date(e.end.dateTime || e.end.date);

        if (isAllDay) {
          // Google all-day events end at the *next* day -> adjust back by 1 ms
          end = new Date(end.getTime() - 1);
        }

        return {
          id: e.id,
          title: e.summary,
          start,
          end,
          allDay: isAllDay,
        };
      });

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
      type: 'details',
      title: 'Event Details',
      message: event,
    });
  };

  const handleAddEvent = async (title, slotInfo) => {
    const startTime = document.getElementById("event-start-input").value;
    const endTime = document.getElementById("event-end-input").value;

    const start = new Date(slotInfo.start);
    const [sh, sm] = startTime.split(":");
    start.setHours(sh, sm, 0, 0);

    const end = new Date(slotInfo.end);
    const [eh, em] = endTime.split(":");
    end.setHours(eh, em, 0, 0);

    const newEvent = {
      summary: title,
      start: { dateTime: start.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
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
          start: new Date(start),
          end: new Date(end),
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
        <l-grid size="90" speed="1.5" color="#ffffff"></l-grid>
      </div>
    );
  }

  // ✅ Updated Google Connect Page
  if (needsConnection)
    return (
      <div style={{ ...pageStyles.container, justifyContent: 'center' }}>
        <div style={{ 
          ...pageStyles.card, 
          maxWidth: '500px', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #6a67f0, #3b3b5c)', 
          boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
          padding: '50px 30px'
        }}>
          <h2 style={{ ...pageStyles.heading, color: '#fff', fontSize: '2rem', marginBottom: '20px' }}>
            Connect Your Google Calendar
          </h2>
          <p style={{ color: '#dcdcdc', marginBottom: '30px', fontSize: '1rem' }}>
            To view and manage your events, please connect your Google Calendar account.
          </p>
          <GoogleConnect onSuccess={() => setMessageBox({ type: 'info', title: 'Success', message: 'Google Calendar connected successfully!' })} />
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
            border-top: none;
          }
          .rbc-day-bg {
            background-color: #2e2e4a;
            border-left: none !important;
            border-bottom: none !important;
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
            opacity: 1;
            padding: 2px 5px;
            margin-bottom: 2px;
            display: block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
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
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          defaultView={Views.MONTH}
          components={{
            toolbar: (props) => (
              <CustomToolbar {...props} date={currentDate} setDate={setCurrentDate} onView={setView} />
            ),
            event: Event,
          }}
          onView={(view) => setView(view)}
        />
      </div>

      {messageBox && (
  <div style={pageStyles.overlay}>
    <div style={pageStyles.messageBox}>
      <h3 style={pageStyles.messageBoxTitle}>{messageBox.title}</h3>

      {/* Add Event Form */}
      {messageBox.type === 'add' && (
        <>
          <p style={pageStyles.messageBoxText}>Enter event title:</p>
          <input
            type="text"
            placeholder="Event title"
            style={pageStyles.messageBoxInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddEvent(
                e.target.value,
                messageBox.slotInfo
              );
            }}
          />
          <div style={{display: 'flex', gap: '10px', width: '100%', justifyContent: 'space-between'}}>
            <div style={{flex: 1}}>
              <label style={pageStyles.messageBoxText}>Start Time:</label>
              <input
                type="time"
                defaultValue={moment(messageBox.slotInfo.start).format("HH:mm")}
                style={pageStyles.messageBoxInput}
                id="event-start-input"
              />
            </div>
            <div style={{flex: 1}}>
              <label style={pageStyles.messageBoxText}>End Time:</label>
              <input
                type="time"
                defaultValue={moment(messageBox.slotInfo.end).format("HH:mm")}
                style={pageStyles.messageBoxInput}
                id="event-end-input"
              />
            </div>
          </div>
        </>
      )}

      {/* Event Details */}
      {messageBox.type === 'details' && (
        <>
          <h3 style={pageStyles.messageBoxTitle}>{messageBox.message.title}</h3>
          <p style={{...pageStyles.messageBoxText, marginBottom: '0.5rem', fontWeight: 'bold'}}>
            Start: {moment(messageBox.message.start).format('LLL')}
          </p>
          <p style={{...pageStyles.messageBoxText, marginTop: '0', fontWeight: 'bold'}}>
            End: {moment(messageBox.message.end).format('LLL')}
          </p>
          <p style={{...pageStyles.messageBoxText, fontStyle: 'italic', marginTop: '1rem'}}>
            {messageBox.message.description || 'No description provided.'}
          </p>
        </>
      )}

      {/* ✅ Info / Success Messages */}
      {messageBox.type === 'info' && (
        <p style={{...pageStyles.messageBoxText, color: '#4ade80', fontWeight: 'bold'}}>
          {messageBox.message}
        </p>
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
        {messageBox.type === 'details' && (
          <button
            style={{...pageStyles.messageBoxButton, backgroundColor: '#ef4444'}}
            onClick={() => handleDeleteEvent(messageBox.message)}
          >
            Delete
          </button>
        )}
        <button
          style={{...pageStyles.messageBoxButton, backgroundColor: '#4a4a6e' }}
          onClick={() => setMessageBox(null)}
        >
          Close
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
    background: '#121212',
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
    height: '700px',
    width: '100%',
    backgroundColor: '#2e2e4a',
    borderRadius: '20px',
    padding: '10px',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  messageBox: {
    backgroundColor: '#1e1e3f',
    padding: '30px',
    borderRadius: '15px',
    minWidth: '300px',
    maxWidth: '500px',
    textAlign: 'center',
    boxShadow: '0 5px 25px rgba(0,0,0,0.5)',
  },
  messageBoxTitle: { fontSize: '1.5rem', marginBottom: '15px', color: '#fff' },
  messageBoxText: { fontSize: '1rem', marginBottom: '10px', color: '#ddd' },
  messageBoxInput: {
    width: '100%',
    padding: '8px',
    marginBottom: '15px',
    borderRadius: '8px',
    border: '1px solid #555',
    backgroundColor: '#2e2e4a',
    color: '#fff',
    fontSize: '1rem',
  },
  messageBoxButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
  },
  messageBoxButton: {
    flex: 1,
    padding: '10px 15px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: '#6a67f0',
    color: '#fff',
    fontWeight: 'bold',
  },
};

export default CalendarPage;
