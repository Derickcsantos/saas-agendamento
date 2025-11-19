"use client";

import { useEffect, useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import ptLocale from "@fullcalendar/core/locales/pt-br";
import interactionPlugin from "@fullcalendar/interaction";
import formatDateBR from '@/app/utils/formatDateToBR';
import formatDateFromYYYYMMDD from '@/app/utils/formatDateFromYYYYMMDD';
import { statusClasses } from '@/app/utils/appointmentStatus';

export default function AppointmentsTab({ org }) {
  const [appointments, setAppointments] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table"); // "table" | "calendar"
  const [filters, setFilters] = useState({
    search: "",
    employee: "",
    date: "",
  });
  const [savingId, setSavingId] = useState(null);

  // Debounce para pesquisa
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}?${params.toString()}`, {
          credentials: 'include'
        }
      );

      const data = await res.json();
      setAppointments(data);

      setCalendarEvents(
        data.map((a) => ({
          id: a.id,
          title: `${a.client_name} – ${a.services.name}`,
          start: `${a.appointment_date}T${a.start_time}`,
          end: `${a.appointment_date}T${a.end_time}`,
          backgroundColor:
            a.status === "completed"
              ? "#16a34a"
              : a.status === "canceled"
              ? "#dc2626"
              : "#2563eb",
        }))
      );
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
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

  const handleStatusChange = async (id, newStatus) => {
    if (!confirm("Deseja realmente atualizar o status?")) return;

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

   const updateFilter = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow border space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-700">Agendamentos</h1>

        <button
          className="px-4 py-2 text-sm rounded-lg border shadow-sm hover:bg-gray-50 transition"
          onClick={() => setView(view === "table" ? "calendar" : "table")}
        >
          {view === "table" ? "Visualizar Calendário" : "Visualizar Tabela"}
        </button>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Pesquisar cliente…"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />

        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.date}
          onChange={(e) => updateFilter("date", e.target.value)}
        />

        <input
          type="text"
          placeholder="Filtrar por funcionário…"
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.employee}
          onChange={(e) => updateFilter("employee", e.target.value)}
        />

        <button
          className="border rounded-lg px-3 py-2 text-sm hover:bg-red-50 hover:text-red-700 transition"
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

      {/* ================================
          VISUALIZAÇÃO EM MODO TABELA
      ================================ */}
      {view === "table" && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Cliente", "Serviço", "Profissional", "Data", "Horário", "Status", "Ações"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-medium text-gray-600 border-b"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="text-center py-6" colSpan="7">
                    Carregando…
                  </td>
                </tr>
              ) : appointments.length ? (
                appointments.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{a.client_name}</td>
                    <td className="px-4 py-3">{a.services.name}</td>
                    <td className="px-4 py-3">{a.employees.name}</td>
                    <td className="px-4 py-3">
                      {formatDateFromYYYYMMDD(a.appointment_date)}
                    </td>
                    <td className="px-4 py-3">
                      {a.start_time?.slice(0, 5)} - {a.end_time?.slice(0, 5)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[a.status]}`}
                      >
                        {savingId === a.id ? "Salvando…" : a.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        className="border rounded-md px-2 py-1 text-sm"
                        value={a.status}
                        onChange={(e) =>
                          handleStatusChange(a.id, e.target.value)
                        }
                      >
                        <option value="pending">Pendente</option>
                        <option value="completed">Concluído</option>
                        <option value="canceled">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="text-center py-6 text-gray-400" colSpan="7">
                    Nenhum agendamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================
          VISUALIZAÇÃO EM MODO CALENDÁRIO
      ================================ */}
      {view === "calendar" && (
        <div className="p-4 border rounded-xl shadow-sm">
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={ptLocale}
            height="auto"
            events={calendarEvents}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
          />
        </div>
      )}
    </div>
  );
}
