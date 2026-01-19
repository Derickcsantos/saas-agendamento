"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptLocale from "@fullcalendar/core/locales/pt-br";
import formatDateFromYYYYMMDD from "@/app/utils/formatDateFromYYYYMMDD";
import { statusClasses } from "@/app/utils/appointmentStatus";
import { statusInfo } from "@/app/utils/appointmentsInfo";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

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
  const [calendarColors, setCalendarColors] = useState([]);
  const [employeeColorMap, setEmployeeColorMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("calendar");
  const [savingId, setSavingId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editTimeSlots, setEditTimeSlots] = useState([]);
  const { palette } = useOrganizationColors(org.slug_organization);
  const [isMobile, setIsMobile] = useState(false);
  const calendarRef = useRef(null);
  const [editData, setEditData] = useState({
    employee: null,
    date: "",
    time: "",
  });
  const [filters, setFilters] = useState({
    search: "",
    employee: "",
    date: "",
    statuses: ["confirmed", "completed"],
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

    const nextView = isMobile ? "timeGridDay" : "timeGridWeek";
    if (api.view?.type !== nextView) {
      api.changeView(nextView);
      api.today(); // garante que no mobile abre no "hoje"
    }
  }, [isMobile]);


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

  const loadEmployeeColors = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${org.slug_organization}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      setEmployees(data);
      
      // Criar mapa de cores dos funcionários
      const colorMap = {};
      data.forEach(emp => {
        if (emp.calendar_color_id) {
          colorMap[emp.id] = emp.calendar_color_id;
        }
      });
      setEmployeeColorMap(colorMap);
      return colorMap;
    } catch (err) {
      console.log('Erro ao carregar cores dos funcionários:', err);
      return {};
    }
  };


  async function loadAppointments(customFilters = filters) {
    setLoading(true);
    try {
      // Recarregar cores dos funcionários
      const colorMap = await loadEmployeeColors();
      
      const params = new URLSearchParams({
      search: customFilters.search || "",
      employee: customFilters.employee || "",
      date: customFilters.date || "",
    });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}?${params}`,
        { credentials: "include" }
      );

      const data = await res.json();
      const raw = Array.isArray(data) ? data : [];

      const filteredByStatus =
        customFilters.statuses?.length
          ? raw.filter((a) => customFilters.statuses.includes(a.status))
          : raw;

      setAppointments(filteredByStatus);

      setCalendarEvents(
        filteredByStatus.map((a) => {
          let backgroundColor = "#2563eb"; // cor padrão
          
          // Se está cancelado, usar vermelho (prioridade máxima)
          if (a.status === "canceled") {
            backgroundColor = "#dc2626";
          } else if (a.status === "completed") {
            // Se está completo, usar verde (prioridade máxima)
            backgroundColor = "#059669";
          } else if (a.status === "confirmed" && colorMap[a.employee_id]) {
            // Se está confirmado E o funcionário tem cor, usar a cor do funcionário
            const colorId = colorMap[a.employee_id];
            const colorObj = calendarColors.find(c => c.id === colorId);
            if (colorObj?.hex_color) {
              backgroundColor = colorObj.hex_color;
            }
          }
          
          return {
            id: a.id,
            title: `${a.client_name} — ${a.services.name}`,
            start: `${a.appointment_date}T${a.start_time}`,
            end: `${a.appointment_date}T${a.end_time}`,
            backgroundColor,
          };
        })
      );


    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
    
    // Carregar cores disponíveis
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/calendar-colors/${org.slug_organization}`, {
      credentials: 'include'
    })
      .then((r) => r.json())
      .then((data) => setCalendarColors(data))
      .catch(err => console.log('Erro ao carregar cores:', err));
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
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }
    );

    await loadAppointments(filters);
    setSavingId(null);
  };

  const loadEditAvailableTimes = async (employeeId, date, duration) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/available-times/${org.slug_organization}?employeeId=${employeeId}&date=${date}&duration=${duration}`
      );

      const data = await res.json();
      setEditTimeSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar horários:", err);
    }
  };

  const openEditModal = async (id) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}/${id}`,
        { credentials: "include" }
      );

      const data = await res.json();
      setEditingAppointment(data);

      setEditData({
        employee: data.employees,
        date: data.appointment_date,
        time: { start: data.start_time.slice(0,5), end: data.end_time.slice(0,5) },
      });

      // Carregar horários disponíveis
      await loadEditAvailableTimes(
        data.employees.id,
        data.appointment_date,
        data.services.duration
      );

      setShowEditModal(true);
    } catch (err) {
      console.error("Erro ao abrir modal:", err);
    }
  };

  const saveAppointmentChanges = async () => {
    try {
      const body = {
        employee_id: editData.employee.id,
        appointment_date: editData.date,
        start_time: editData.time.start,
        end_time: editData.time.end,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}/${editingAppointment.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        alert("Erro ao atualizar agendamento.");
        return;
      }

      setShowEditModal(false);
      loadAppointments();
    } catch (err) {
      console.error("Erro ao salvar alterações:", err);
    }
  };

  const EditModal = () => {
    if (!showEditModal || !editingAppointment) return null;

    const a = editingAppointment;

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-xl">

          <h2 className="text-xl font-bold mb-4">Editar Agendamento</h2>

          {/* infos */}
          <p><strong>Cliente:</strong> {a.client_name}</p>
          <p><strong>Serviço:</strong> {a.services.name}</p>

          {/* LINK DO MEET */}
          {a.meeting_url && (
            <div className="flex items-center gap-2 mt-3">
              <a
                href={a.meeting_url}
                target="_blank"
                className="text-blue-600 underline truncate"
              >
                {a.meeting_url}
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(a.meeting_url)}
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                📋
              </button>
            </div>
          )}

          {/* SELECT FUNCIONÁRIO */}
          <label className="block mt-4 font-medium">Profissional</label>
          <select
            className="w-full border p-2 rounded"
            value={editData.employee?.id}
            onChange={(e) => {
              const emp = employees.find((x) => x.id == e.target.value);
              setEditData({ ...editData, employee: emp });
              setEditTimeSlots([]);
            }}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          {/* SELECT DATA */}
          <label className="block mt-4 font-medium">Data</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={editData.date}
            onChange={(e) => {
              setEditData({ ...editData, date: e.target.value });
              loadEditAvailableTimes(
                editData.employee.id,
                e.target.value,
                a.services.duration
              );
            }}
          />

          {/* SELECT HORÁRIO */}
          <label className="block mt-4 font-medium">Horário</label>

          {editTimeSlots.length === 0 ? (
            <p className="text-gray-500">Selecione funcionário e data.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {editTimeSlots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => setEditData({ ...editData, time: slot })}
                  className={`px-3 py-1 rounded border ${
                    editData.time?.start === slot.start
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  {slot.start} — {slot.end}
                </button>
              ))}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end mt-6 gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>

            <button
              onClick={saveAppointmentChanges}
              className="px-4 py-2 text-white rounded"
              style={{backgroundColor: palette?.strong_color}}
              disabled={!editData.time}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
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

        <div className="md:col-span-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 mr-1">
            Status:
          </span>

          {[
            { key: "confirmed", label: "Confirmados", pill: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800" },
            { key: "completed", label: "Completos", pill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800" },
            { key: "canceled", label: "Cancelados", pill: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800" },
          ].map((s) => {
            const active = filters.statuses.includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => {
                  const next = active
                    ? filters.statuses.filter((x) => x !== s.key)
                    : [...filters.statuses, s.key];

                  const newFilters = { ...filters, statuses: next };
                  setFilters(newFilters);
                  applyFilters(newFilters);
                }}
                className={[
                  "px-3 py-2 rounded-full border text-xs font-semibold transition shadow-sm",
                  active ? s.pill : "bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
                ].join(" ")}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <button
          className="rounded-lg md:col-span-4 px-3 py-2 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 shadow hover:bg-red-100 dark:hover:bg-red-900/50 transition"
          onClick={() => {
            const newFilters = { search: "", date: "", employee: "", statuses: ["confirmed", "completed"] };
            setFilters(newFilters);
            loadAppointments(newFilters);
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
                appointments.map(a => {
                  // Encontrar a cor do funcionário
                  let employeeColor = "#2563eb";
                  if (a.status === "canceled") {
                    employeeColor = "#dc2626";
                  } else if (a.status === "completed") {
                    employeeColor = "#059669";
                  } else if (a.status === "confirmed" && employeeColorMap[a.employee_id]) {
                    const colorId = employeeColorMap[a.employee_id];
                    const colorObj = calendarColors.find(c => c.id === colorId);
                    if (colorObj?.hex_color) {
                      employeeColor = colorObj.hex_color;
                    }
                  }
                  
                  return (
                    <tr 
                    key={a.id} 
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition" 
                    onDoubleClick={() => openEditModal(a.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: employeeColor }}
                          />
                          {a.client_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">{a.services.name}</td>
                      <td className="px-4 py-3">{a.employees.name}</td>
                      <td className="px-4 py-3">{formatDateFromYYYYMMDD(a.appointment_date)}</td>
                      <td className="px-4 py-3">
                        {a.start_time.slice(0,5)} — {a.end_time.slice(0,5)}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo[a.status]?.className || 'bg-gray-100 text-gray-700'}`}>
                          {savingId === a.id ? "Salvando..." : statusInfo[a.status]?.label || 'Indefinido'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          className="rounded-lg px-2 py-1 bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 shadow-sm"
                          value={a.status}
                          onChange={(e) => handleStatusChange(a.id, e.target.value)}
                        >
                          <option value="confirmed">Pendente</option>
                          <option value="completed">Concluído</option>
                          <option value="canceled">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}


      {view === "calendar" && (
        <div className="p-4 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-white dark:bg-gray-800 overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
            locale={ptLocale}
            events={calendarEvents}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="23:00:00"
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

      <EditModal />

    </div>
  );
}
