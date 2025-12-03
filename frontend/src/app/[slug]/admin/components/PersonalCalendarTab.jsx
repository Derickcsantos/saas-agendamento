"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptLocale from "@fullcalendar/core/locales/pt-br";
import { toast } from "react-toastify";

const calendarStyles = `
  .fc-theme-standard td, 
  .fc-theme-standard th {
    border-color: #ececec !important;
  }

  .fc-scrollgrid {
    border-radius: 18px !important;
    overflow: hidden !important;
    border: none !important;
  }

  /* Cabeçalho */
  .fc-toolbar-title {
    font-size: 1.45rem !important;
    font-weight: 700 !important;
    color: #1f2937 !important;
  }

  .fc-timegrid-slot-label {
    font-size: 0.75rem !important;
    opacity: 0.6;
  }

  /* Evento premium - Customizado para Google Calendar (eventos pessoais) */
  .fc-event {
    border: none !important;
    padding: 6px 10px !important;
    border-radius: 12px !important;
    font-size: 0.72rem !important;
    font-weight: 600 !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    transition: transform .15s ease, box-shadow .15s ease;
    background-color: #f59e0b;
  }
  
  .fc-event.google-event {
    background-color: #f59e0b;
    border-left: 5px solid #d97706;
  }

  .fc-event:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 16px rgba(0,0,0,0.25) !important;
  }

  .fc-timegrid-now-indicator-line {
    border-color: #ef4444 !important;
    border-width: 2px !important;
  }

  .fc-timegrid-now-indicator-arrow {
    border-color: #ef4444 transparent transparent !important;
  }

  .fc-day-today {
    background: rgba(99,102,241,0.07) !important;
  }

  .fc-timegrid-slot {
    height: 58px !important;
  }

  .fc-timegrid-slot:hover {
    background-color: #fafafa !important;
  }

  .fc .fc-col-header-cell-cushion {
    padding: 12px 4px !important;
    font-size: 0.9rem !important;
    font-weight: 600 !important;
  }

  @media(max-width: 640px) {
    .fc-toolbar-title {
      font-size: 1.1rem !important;
    }

    .fc-timegrid-slot {
      height: 52px !important;
    }

    .fc-event {
      font-size: 0.65rem !important;
      border-radius: 10px !important;
    }
  }
`;

export default function PersonalCalendarTab({ org }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState();
  const [connectedEmail, setConnectedEmail] = useState(null);
  const [user, setUser] = useState(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ;
  const slug = org.slug_organization;
  const userId = user?.id; // id do usuário logado (user_id na tabela)

  // 1) Busca usuário autenticado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${API_BASE_URL}/api/auth/${slug}/check`,
          { credentials: "include" }
        );

        const data = await res.json();
        setUser(data.user || null);
      } catch (err) {
        console.error("Erro ao buscar usuário autenticado:", err);
        toast.error("Erro ao carregar usuário logado.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug && API_BASE_URL) {
      checkAuth();
    }
  }, [slug, API_BASE_URL]);

  // 2) Quando tiver userId, verifica status da integração
  useEffect(() => {
    if (!userId) return;
    checkAuthorizationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, slug]);

  // ===========================
  // Checar status da integração
  // ===========================
  async function checkAuthorizationStatus() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/google-calendar/status/${slug}?userId=${userId}`,
        { credentials: "include", cache: "no-store" }
      );

      const data = await res.json();

      if (res.ok && data.isAuthorized) {
        setIsAuthorized(true);
        setConnectedEmail(data.email || null);
        await loadGoogleEvents(); // já carrega eventos
      } else {
        setIsAuthorized(false);
        setConnectedEmail(null);
        setCalendarEvents([]);
      }
    } catch (e) {
      console.error("Erro ao verificar status de autorização:", e);
      toast.error("Erro de conexão com o backend.");
    } finally {
      setLoading(false);
    }
  }

  // ===========================
  // Carregar eventos do Google
  // ===========================
  async function loadGoogleEvents() {
    if (!userId) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/google-calendar/events/${slug}?userId=${userId}`,
        { credentials: "include", cache: "no-store" }
      );

      if (!res.ok) {
        toast.warn(
          "Token expirado ou inválido. Por favor, reconecte o Google Calendar."
        );
        setIsAuthorized(false);
        setConnectedEmail(null);
        setCalendarEvents([]);
        return;
      }

      const data = await res.json();

      const formattedEvents = (data || []).map((event) => ({
        id: event.id,
        title: event.summary || "Evento Pessoal",
        start: event.start,
        end: event.end,
        classNames: ["google-event"],
      }));

      setCalendarEvents(formattedEvents);
    } catch (e) {
      console.error("Erro ao carregar eventos do Google:", e);
      toast.error("Falha ao carregar eventos da agenda pessoal.");
    } finally {
      setLoading(false);
    }
  }

  // ===========================
  // Iniciar fluxo de conexão
  // ===========================
  const handleConnect = () => {
    if (!userId) {
      toast.error("Usuário não identificado. Atualize a página e tente novamente.");
      return;
    }
    window.location.href = `${API_BASE_URL}/api/google-calendar/connect/${slug}?userId=${userId}`;
  };

  // ===========================
  // UI de autorização
  // ===========================
  const AuthPrompt = () => (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl shadow-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 max-w-lg mx-auto mt-10 text-center">
      <svg
        className="w-12 h-12 text-indigo-500 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        ></path>
      </svg>
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        Integre seu Google Calendar Pessoal
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
        Ao conectar sua agenda, garantimos que os horários marcados como{" "}
        <strong>ocupado</strong> no seu calendário pessoal fiquem
        automaticamente indisponíveis para agendamentos de clientes no seu
        sistema.
        <br />
        Mais precisão, menos conflitos de horário.
      </p>
      <button
        onClick={handleConnect}
        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition duration-150 shadow-md shadow-indigo-500/50"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 14h-2v2h-2v-2h-2v-2h2v-2h2v2h2v2zM12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8z" />
        </svg>
        <span>Conectar com Google Calendar</span>
      </button>
      <p className="mt-4 text-xs text-gray-400">
        Você será redirecionado para a página de autorização do Google.
      </p>
    </div>
  );

  // ===========================
  // Render principal
  // ===========================
  return (
    <div className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-200 dark:border-gray-700 min-h-[500px]">
      <style>{calendarStyles}</style>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Agenda Pessoal (Google Calendar)
        </h1>

        {isAuthorized && connectedEmail && (
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">
            Conta conectada: <strong>{connectedEmail}</strong>
          </span>
        )}
      </div>

      {loading && (
        <div className="text-center py-12 text-indigo-500">
          <svg
            className="animate-spin h-6 w-6 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-2 text-sm">Carregando informações do calendário...</p>
        </div>
      )}

      {!loading && !isAuthorized && <AuthPrompt />}

      {!loading && isAuthorized && (
        <div className="p-4 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-white dark:bg-gray-800 overflow-hidden">
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

          <div className="mt-4 flex flex-col items-center gap-2 text-center">
            <button
              onClick={() => {
                if (!userId) {
                  toast.error("Usuário não identificado.");
                  return;
                }

                if (
                  window.confirm(
                    "Deseja desconectar sua conta do Google Calendar? Isso irá liberar os horários bloqueados no seu sistema."
                  )
                ) {
                  fetch(
                    `${API_BASE_URL}/api/google-calendar/disconnect/${slug}?userId=${userId}`,
                    { method: "POST", credentials: "include" }
                  )
                    .then((res) => {
                      if (res.ok) {
                        toast.success(
                          "Google Calendar desconectado com sucesso!"
                        );
                        setIsAuthorized(false);
                        setConnectedEmail(null);
                        setCalendarEvents([]);
                      } else {
                        toast.error(
                          "Erro ao desconectar. Tente novamente mais tarde."
                        );
                      }
                    })
                    .catch(() => toast.error("Erro de rede."));
                }
              }}
              className="text-red-500 hover:text-red-700 text-sm font-medium transition"
            >
              Desconectar Google Calendar
            </button>

            <button
              onClick={loadGoogleEvents}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Atualizar eventos
            </button>
          </div>
        </div>
      )}

      {!loading && isAuthorized && !calendarEvents.length && (
        <p className="text-center text-gray-500 mt-8">
          Nenhum evento futuro encontrado no seu Google Calendar.
        </p>
      )}
    </div>
  );
}
