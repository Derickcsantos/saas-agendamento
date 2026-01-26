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

  // 🆕 Estados para o modal de criação de evento
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
  });
  const [creatingEvent, setCreatingEvent] = useState(false);

  const calendarRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  // 🆕 Handler para quando o usuário seleciona um período no calendário
  function handleDateSelect(selectInfo) {
    setSelectedSlot({
      start: selectInfo.start,
      end: selectInfo.end,
      startStr: selectInfo.startStr,
      endStr: selectInfo.endStr,
    });
    setEventForm({
      title: "",
      description: "",
      location: "",
    });
    setShowEventModal(true);

    // Limpa a seleção visual
    selectInfo.view.calendar.unselect();
  }

  // 🆕 Criar evento no Google Calendar
  async function handleCreateEvent() {
    if (!eventForm.title.trim()) {
      return toast.error("O título do evento é obrigatório");
    }

    if (!selectedSlot) {
      return toast.error("Nenhum horário selecionado");
    }

    setCreatingEvent(true);

    try {
      const payload = {
        userId,
        summary: eventForm.title,
        description: eventForm.description || undefined,
        location: eventForm.location || undefined,
        start: selectedSlot.start.toISOString(),
        end: selectedSlot.end.toISOString(),
      };

      const res = await fetch(`${API_BASE_URL}/api/google-calendar/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar evento");
      }

      toast.success("Evento criado com sucesso!");

      // Adiciona o evento à lista local
      const newEvent = {
        id: data.id,
        title: eventForm.title,
        start: normalizeDate(selectedSlot.startStr),
        end: normalizeDate(selectedSlot.endStr),
      };

      setCalendarEvents((prev) => [...prev, newEvent]);

      // Fecha o modal e limpa o formulário
      setShowEventModal(false);
      setSelectedSlot(null);
      setEventForm({ title: "", description: "", location: "" });
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      toast.error(error.message || "Erro ao criar evento");
    } finally {
      setCreatingEvent(false);
    }
  }

  // 🆕 Fechar modal
  function handleCloseModal() {
    setShowEventModal(false);
    setSelectedSlot(null);
    setEventForm({ title: "", description: "", location: "" });
  }

  // 🆕 Formatar data/hora para exibição
  function formatDateTime(date) {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  // 🆕 Handlers para swipe horizontal no mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!calendarRef.current) return;
    
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // mínimo de 50px para considerar um swipe

    const api = calendarRef.current.getApi();

    // Swipe para a esquerda (próximo dia)
    if (swipeDistance > minSwipeDistance) {
      api.next();
    }
    // Swipe para a direita (dia anterior)
    else if (swipeDistance < -minSwipeDistance) {
      api.prev();
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Adicionar event listeners quando o calendário for montado
  useEffect(() => {
    if (!calendarRef.current) return;

    const calendarEl = calendarRef.current.elRef.current;
    if (!calendarEl) return;

    calendarEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    calendarEl.addEventListener('touchmove', handleTouchMove, { passive: true });
    calendarEl.addEventListener('touchend', handleTouchEnd);

    return () => {
      calendarEl.removeEventListener('touchstart', handleTouchStart);
      calendarEl.removeEventListener('touchmove', handleTouchMove);
      calendarEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [calendarRef.current]);


  return (
    <div className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 min-h-[600px]">
      <style>{calendarStyles}</style>
      <style>{`
        /* Estilos para seleção de horário */
        .fc-highlight {
          background: ${palette?.strong_color || '#6366f1'} !important;
          opacity: 0.3;
        }
        
        .fc-timegrid-slot:hover {
          background-color: ${palette?.strong_color || '#6366f1'}10;
        }

        /* Animação do modal */
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .modal-content {
          animation: modalFadeIn 0.2s ease-out;
        }

        /* Focus ring customizado */
        input:focus, textarea:focus {
          ring-color: ${palette?.strong_color || '#6366f1'};
        }
      `}</style>

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
          selectable={true}
          selectMirror={true}
          select={handleDateSelect}
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

      {/* 🆕 MODAL DE CRIAÇÃO DE EVENTO */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="modal-content bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div 
              className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700"
              style={{ 
                background: `linear-gradient(135deg, ${palette?.strong_color || '#6366f1'} 0%, ${palette?.strong_color || '#6366f1'}dd 100%)` 
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Criar Evento
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Informação do horário selecionado */}
              <div className="mt-3 bg-white/20 rounded-lg p-3 text-white text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Início:</span>
                  <span>{formatDateTime(selectedSlot?.start)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Fim:</span>
                  <span>{formatDateTime(selectedSlot?.end)}</span>
                </div>
              </div>
            </div>

            {/* Body do Modal */}
            <div className="p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Ex: Reunião com cliente"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition"
                  style={{ 
                    focusRingColor: palette?.strong_color || '#6366f1',
                  }}
                  autoFocus
                  disabled={creatingEvent}
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Detalhes do evento..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition resize-none"
                  style={{ 
                    focusRingColor: palette?.strong_color || '#6366f1',
                  }}
                  disabled={creatingEvent}
                />
              </div>

              {/* Localização */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Localização
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Ex: Sala 3, Escritório"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition"
                  style={{ 
                    focusRingColor: palette?.strong_color || '#6366f1',
                  }}
                  disabled={creatingEvent}
                />
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                disabled={creatingEvent}
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={creatingEvent || !eventForm.title.trim()}
                className="flex-1 px-4 py-3 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: palette?.strong_color || '#6366f1',
                }}
                type="button"
              >
                {creatingEvent ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Criando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Criar Evento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
