"use client";

import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptLocale from "@fullcalendar/core/locales/pt-br";
import { toast } from "react-toastify";

function normalizeDate(dateString) {
  if (!dateString) return null;
  return dateString.includes("T") ? dateString : `${dateString}T00:00:00`;
}

const calendarStyles = `
  .fc {
    font-family: 'Inter', sans-serif !important;
  }

  .fc .fc-toolbar {
    padding: 14px 18px !important;
    border-radius: 16px !important;
    background: linear-gradient(to right, #ffffffaa, #fafafaaa) !important;
    backdrop-filter: blur(8px) !important;
    margin-bottom: 14px !important;
  }

  .fc .fc-toolbar-title {
    font-size: 1.4rem !important;
    font-weight: 700 !important;
    color: #1e1e1e !important;
  }

  .fc-button {
    border-radius: 12px !important;
    background: #4f46e5 !important;
    border: none !important;
    color: white !important;
    padding: 6px 14px !important;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    transition: all .2s ease-in-out !important;
  }

  .fc-button:hover {
    background: #4338ca !important;
    transform: translateY(-2px);
  }

  .fc-event {
    border: none !important;
    border-radius: 12px !important;
    padding: 8px !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    background: linear-gradient(135deg, #5b21b6, #4c1d95) !important;
    color: white !important;
    box-shadow: 0 6px 14px rgba(0,0,0,0.25) !important;
    transition: all 0.18s ease-in-out !important;
  }

  .fc-event:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 18px rgba(0,0,0,0.32) !important;
  }

  .fc-timegrid-slot {
    height: 60px !important;
  }

  .fc-today {
    background: rgba(99,102,241,0.08) !important;
  }

  /* MOBILE VIEW IMPROVED */
  @media(max-width: 640px) {
    .fc .fc-toolbar-title {
      font-size: 1.1rem !important;
    }

    .fc-event {
      font-size: 0.85rem !important;
      padding: 10px !important;
    }

    .fc-timegrid-slot {
      height: 72px !important;
    }
  }
`;

export default function PersonalCalendarTab({ org }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [connectedEmail, setConnectedEmail] = useState(null);
  const [user, setUser] = useState(null);
  const [calendarView, setCalendarView] = useState("timeGridWeek");

  const calendarRef = useRef(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const slug = org.slug_organization;
  const userId = user?.id;

  useEffect(() => {
    function updateView() {
      const w = window.innerWidth;

      if (w < 640) {
        setCalendarView("timeGridDay");
      } else if (w < 900) {
        setCalendarView("timeGridThreeDays");
      } else {
        setCalendarView("timeGridWeek");
      }

      if (calendarRef.current) {
        const api = calendarRef.current.getApi();
        api.changeView(
          w < 640
            ? "timeGridDay"
            : w < 900
            ? "timeGridThreeDays"
            : "timeGridWeek"
        );
      }
    }

    updateView();
    window.addEventListener("resize", updateView);
    return () => window.removeEventListener("resize", updateView);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/${slug}/check`, {
          credentials: "include",
        });
        const data = await res.json();
        setUser(data.user || null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [slug]);

  useEffect(() => {
    if (userId) checkAuthorizationStatus();
  }, [userId]);

  async function checkAuthorizationStatus() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/google-calendar/status?userId=${userId}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = await res.json();

      if (res.ok && data.isAuthorized) {
        setIsAuthorized(true);
        setConnectedEmail(data.email);
        loadGoogleEvents();
      } else {
        setIsAuthorized(false);
        setConnectedEmail(null);
        setCalendarEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadGoogleEvents() {
    setLoading(true);
    try {
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const oneYearAhead = new Date(now);
      oneYearAhead.setFullYear(now.getFullYear() + 1);

      const params = new URLSearchParams({
        userId,
        timeMin: oneYearAgo.toISOString(),
        timeMax: oneYearAhead.toISOString(),
      });

      const res = await fetch(
        `${API_BASE_URL}/api/google-calendar/events?${params.toString()}`,
        { credentials: "include", cache: "no-store" }
      );

      const data = await res.json();

      const formattedEvents = data.map((ev) => ({
        id: ev.id,
        title: ev.summary || "Evento",
        start: normalizeDate(ev.start),
        end: normalizeDate(ev.end),
      }));

      setCalendarEvents(formattedEvents);
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    if (!userId) return toast.error("Usuário não identificado.");
    window.location.href = `${API_BASE_URL}/api/google-calendar/${slug}/connect?userId=${userId}`;
  }

  return (
    <div className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 min-h-[600px]">
      <style>{calendarStyles}</style>

      <div className="flex justify-between flex-col items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Agenda Pessoal
        </h1>
        {connectedEmail && (
          <p className="opacity-70 mt-2" style={{fontSize:'12px'}}>Conectado como {connectedEmail}</p>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center py-10 text-indigo-600">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-400 border-t-transparent rounded-full" />
          <p className="mt-3 text-sm">Carregando calendário...</p>
        </div>
      )}

      {!loading && !isAuthorized && (
        <div className="text-center p-10 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold">Conectar Google Calendar</h2>
          <button
            onClick={handleConnect}
            className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition"
          >
            Conectar agora
          </button>
        </div>
      )}

      {!loading && isAuthorized && (
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView={calendarView}
          locale={ptLocale}
          events={calendarEvents}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          nowIndicator={true}
          expandRows={true}
          views={{
            timeGridThreeDays: {
              type: "timeGrid",
              duration: { days: 3 },
              buttonText: "3 dias",
            },
          }}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
        />
      )}
    </div>
  );
}
