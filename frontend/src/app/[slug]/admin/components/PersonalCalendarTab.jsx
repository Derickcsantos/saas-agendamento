"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptLocale from "@fullcalendar/core/locales/pt-br";
import { toast } from "react-toastify";

// Converter datas para formato aceitável pelo FullCalendar
function normalizeDate(dateString) {
  if (!dateString) return null;
  return dateString.includes("T") ? dateString : `${dateString}T00:00:00`;
}

const calendarStyles = `
  .fc-theme-standard td, 
  .fc-theme-standard th {
    border-color: #e5e7eb !important;
  }

  .fc .fc-toolbar-title {
    font-size: 1.5rem !important;
    font-weight: 700 !important;
    color: #111827 !important;
  }

  .fc-scrollgrid {
    border-radius: 18px;
    overflow: hidden;
    border: none !important;
  }

  .fc-event {
    border: none !important;
    padding: 6px 10px !important;
    border-radius: 10px !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    background: linear-gradient(135deg, #521cc7, #38128a);
    transition: all 0.16s ease-in-out;
  }

  .fc-event:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 16px rgba(0,0,0,0.25);
  }

  .fc-timegrid-slot-label {
    font-size: 0.7rem !important;
    opacity: 0.6;
  }

  .fc-timegrid-slot {
    height: 56px !important;
  }

  .fc-timegrid-now-indicator-line {
    border-color: #ec4899 !important;
    border-width: 2px !important;
  }

  .fc-day-today {
    background-color: rgba(99,102,241,0.08) !important;
  }
`;

export default function PersonalCalendarTab({ org }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [connectedEmail, setConnectedEmail] = useState(null);
  const [user, setUser] = useState(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const slug = org.slug_organization;
  const userId = user?.id;

  // ======================
  // 1) Buscar usuário logado
  // ======================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/auth/${slug}/check`,
          { credentials: "include" }
        );

        const data = await res.json();
        setUser(data.user || null);
      } catch (err) {
        console.error("Erro ao buscar usuário autenticado:", err);
        toast.error("Erro ao carregar usuário.");
      } finally {
        setLoading(false);
      }
    };

    if (slug && API_BASE_URL) checkAuth();
  }, [slug, API_BASE_URL]);

  // ======================
  // 2) Buscar status de integração
  // ======================
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
        await loadGoogleEvents();
      } else {
        setIsAuthorized(false);
        setConnectedEmail(null);
        setCalendarEvents([]);
      }
    } catch (e) {
      console.error("Erro ao verificar autorização:", e);
      toast.error("Erro na conexão.");
    } finally {
      setLoading(false);
    }
  }

  // ======================
  // 3) Carregar eventos pessoais
  // ======================
  async function loadGoogleEvents() {
    if (!userId) return;

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

      console.log("📥 Eventos recebidos:", data);

      const formattedEvents = data.map((ev) => ({
        id: ev.id,
        title: ev.summary || "Evento",
        start: normalizeDate(ev.start),
        end: normalizeDate(ev.end),
        classNames: ["google-event"],
      }));

      console.log("📌 Eventos formatados para FullCalendar:", formattedEvents);

      setCalendarEvents(formattedEvents);
      toast.success("Eventos carregados!");
    } catch (err) {
      console.error("Erro ao carregar eventos:", err);
      toast.error("Falha ao carregar eventos.");
    } finally {
      setLoading(false);
    }
  }

  // =======================================
  // Iniciar Oauth
  // =======================================
  const handleConnect = () => {
    if (!userId) return toast.error("Usuário não identificado.");
    window.location.href = `${API_BASE_URL}/api/google-calendar/connect?userId=${userId}`;
  };

  return (
    <div className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 min-h-[600px]">
      <style>{calendarStyles}</style>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Agenda Pessoal (Google Calendar)
        </h1>

        {isAuthorized && connectedEmail && (
          <span className="text-sm text-gray-500 dark:text-gray-300">
            Conectado como <strong>{connectedEmail}</strong>
          </span>
        )}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex flex-col items-center py-10 text-indigo-500">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-400 border-t-transparent rounded-full"></div>
          <p className="mt-3 text-sm">Carregando seu calendário...</p>
        </div>
      )}

      {/* NÃO AUTORIZADO */}
      {!loading && !isAuthorized && (
        <div className="text-center p-8 bg-gray-50 rounded-xl border">
          <h2 className="font-bold text-lg">Conectar Google Calendar</h2>
          <p className="text-gray-500 mt-2">
            Conecte sua conta para bloquear automaticamente horários ocupados.
          </p>
          <button
            onClick={handleConnect}
            className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
          >
            Conectar agora
          </button>
        </div>
      )}

      {/* CALENDÁRIO */}
      {!loading && isAuthorized && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border shadow-inner">
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={ptLocale}
            events={calendarEvents}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator={true}
            expandRows={true}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
          />
        </div>
      )}

      {/* Sem eventos */}
      {!loading && isAuthorized && calendarEvents.length === 0 && (
        <p className="text-center text-gray-500 mt-6">
          Nenhum evento encontrado no período selecionado.
        </p>
      )}
    </div>
  );
}
