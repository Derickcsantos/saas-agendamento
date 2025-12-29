"use client";

import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptLocale from "@fullcalendar/core/locales/pt-br";
import { toast } from "react-toastify";
import { calendarStyles } from '../../../utils/calendarStyles'
import useOrganizationColors from "@/app/utils/useOrganizationColors";

function normalizeDate(dateString) {
  if (!dateString) return null;
  return dateString.includes("T") ? dateString : `${dateString}T00:00:00`;
}

export default function PersonalCalendarTab({ org }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [connectedEmail, setConnectedEmail] = useState(null);
  const [user, setUser] = useState(null);
  const [calendarView, setCalendarView] = useState("timeGridWeek");
  const { palette } = useOrganizationColors(org.slug_organization);

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

  async function handleDisconnect() {
    try{
      if (!userId) return toast.error("Usuário não identificado.");
      const res = await fetch(
        `${API_BASE_URL}/api/google-calendar/disconnect?userId=${userId}`, { 
          method: 'POST',
          credentials: "include", 
          cache: "no-store" 
        }
      );

      if (!res.ok ) {
        throw new Error(data.error || "Falha ao desconectar");
      }

      toast.success('Desconectado com sucesso')

      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error(error)
    }
  }


  return (
    <div className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 min-h-[600px]">
      <style>{calendarStyles}</style>

      <div className="flex justify-between flex-col items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Agenda Pessoal
        </h1>
        {connectedEmail && (
          <p className="opacity-70 mt-2" style={{fontSize:'12px'}}>Conectado como {connectedEmail}
          </p>
        )}

      </div>

      {loading && (
        <div className="flex flex-col items-center py-10" style={{color: palette?.strong_color}}>
          <div className="animate-spin h-10 w-10 border-4 border-indigo-400 border-t-transparent rounded-full" />
          <p className="mt-3 text-sm">Carregando calendário...</p>
        </div>
      )}

      {!loading && !isAuthorized && (
        <div className="text-center p-10 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold">Conectar Google Calendar</h2>
          <button
            onClick={handleConnect}
            className="mt-4 px-6 py-3 text-white rounded-xl shadow-lg transition"
            style={{backgroundColor: palette?.strong_color }}
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

      <div className="text-center">
        {connectedEmail ? (
          <button 
            onClick={handleDisconnect}
            className="mt-4 rounded-xl s transition text-red-700"
          >
            Desconectar
          </button>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
