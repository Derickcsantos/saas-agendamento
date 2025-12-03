"use client";

import { useEffect, useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptLocale from "@fullcalendar/core/locales/pt-br";
import formatDateFromYYYYMMDD from "@/app/utils/formatDateFromYYYYMMDD";
import { statusClasses } from "@/app/utils/appointmentStatus";

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

  /* Evento premium */
  .fc-event {
    border: none !important;
    padding: 6px 10px !important;
    border-radius: 12px !important;
    font-size: 0.72rem !important;
    font-weight: 600 !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    transition: transform .15s ease, box-shadow .15s ease;
  }

  .fc-event:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 16px rgba(0,0,0,0.25) !important;
  }

  /* Barra vermelha do AGORA */
  .fc-timegrid-now-indicator-line {
    border-color: #ef4444 !important;
    border-width: 2px !important;
  }

  .fc-timegrid-now-indicator-arrow {
    border-color: #ef4444 transparent transparent !important;
  }

  /* Dia atual */
  .fc-day-today {
    background: rgba(99,102,241,0.07) !important;
  }

  /* Grade do calendário */
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

  /* Mobile */
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

export default function AppointmentsTab({ org }) {
  const [appointments, setAppointments] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("calendar");
  const [savingId, setSavingId] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    employee: "",
    date: "",
  });

  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const applyFilters = useMemo(
    () =>
      debounce((newFilters) => {
        loadAppointments(newFilters);
      }, 400),
    []
  );


  async function loadAppointments(customFilters = filters) {
    setLoading(true);
    try {
      const params = new URLSearchParams(customFilters);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}?${params}`,
        { credentials: "include" }
      );

      const data = await res.json();
      setAppointments(data);

      setCalendarEvents(
        data.map((a) => ({
          id: a.id,
          title: `${a.client_name} — ${a.services.name}`,
          start: `${a.appointment_date}T${a.start_time}`,
          end: `${a.appointment_date}T${a.end_time}`,
          backgroundColor:
            a.status === "completed"
              ? "#059669"
              : a.status === "canceled"
              ? "#dc2626"
              : "#2563eb",
        }))
      );
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${org.slug_organization}`)
      .then((r) => r.json())
      .then((data) => setEmployees(data));
  }, []);

  const updateFilter = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!confirm("Confirmar mudança de status?")) return;
    setSavingId(id);

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }
    );

    await loadAppointments(filters);
    setSavingId(null);
  };

  return (
    <div className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-200 dark:border-gray-700">

      <style>{calendarStyles}</style>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl text-gray-800 dark:text-gray-100">
          Agendamentos
        </h1>

        <button
          onClick={() => setView(view === "table" ? "calendar" : "table")}
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 shadow hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm font-medium"
        >
          {view === "table" ? "Visualizar Calendário" : "Visualizar Tabela"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Pesquisar cliente..."
          className="rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-sm"
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />

        <input
          type="date"
          className="rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-sm"
          value={filters.date}
          onChange={(e) => updateFilter("date", e.target.value)}
        />

        <input
          type="text"
          placeholder="Filtrar por funcionário..."
          className="rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-sm"
          value={filters.employee}
          onChange={(e) => updateFilter("employee", e.target.value)}
        />

        <button
          className="rounded-lg px-3 py-2 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 shadow hover:bg-red-100 dark:hover:bg-red-900/50 transition"
          onClick={() => {
            updateFilter("search", "");
            updateFilter("date", "");
            updateFilter("employee", "");
            loadAppointments({});
          }}
        >
          Limpar Filtros
        </button>
      </div>

      {view === "table" && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              <tr>
                {["Cliente","Serviço","Profissional","Data","Horário","Status","Ações"].map((h)=>(
                  <th key={h} className="px-4 py-3 text-left font-medium border-b dark:border-gray-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!appointments.length ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Nenhum agendamento encontrado.
                  </td>
                </tr>
              ) : (
                appointments.map(a => (
                  <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-4 py-3">{a.client_name}</td>
                    <td className="px-4 py-3">{a.services.name}</td>
                    <td className="px-4 py-3">{a.employees.name}</td>
                    <td className="px-4 py-3">{formatDateFromYYYYMMDD(a.appointment_date)}</td>
                    <td className="px-4 py-3">
                      {a.start_time.slice(0,5)} — {a.end_time.slice(0,5)}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClasses[a.status]}`}>
                        {savingId === a.id ? "Salvando..." : a.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg px-2 py-1 bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 shadow-sm"
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                      >
                        <option value="pending">Pendente</option>
                        <option value="completed">Concluído</option>
                        <option value="canceled">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}


      {view === "calendar" && (
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
        </div>
      )}

    </div>
  );
}
