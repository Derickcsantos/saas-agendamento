"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import TrialExpiredModal from "./TrialExpireModal";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

const dayOptions = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
  { value: "every", label: "Todo dia" },
];

function emptyForm() {
  return {
    employee_id: "",
    interval_type: "single",
    specific_date: "",
    day_of_week: "1",
    recurring_start_date: "",
    recurring_end_date: "",
    start_time: "",
    end_time: "",
    title: "",
    is_active: true,
  };
}

function normalizeTimeForApi(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.length === 5 ? `${raw}:00` : raw;
}

function formatTime(value) {
  const raw = String(value || "");
  return raw.slice(0, 5);
}

function formatDate(value) {
  if (!value) return "-";
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function EmployeeIntervalModal({
  isOpen,
  isEdit,
  form,
  setForm,
  employees,
  dayOptions,
  onCancel,
  onSubmit,
  saving,
  strongColor,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          {isEdit ? "Editar intervalo" : "Novo intervalo"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Funcionário</label>
            <select
              className="w-full border rounded-lg p-2"
              value={form.employee_id}
              onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
            >
              <option value="">Selecione...</option>
              {(employees || []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Tipo</label>
            <select
              className="w-full border rounded-lg p-2"
              value={form.interval_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  interval_type: e.target.value,
                  specific_date: "",
                  recurring_start_date: "",
                  recurring_end_date: "",
                }))
              }
            >
              <option value="single">Único</option>
              <option value="recurring">Recorrente</option>
            </select>
          </div>

          {form.interval_type === "single" ? (
            <div>
              <label className="text-sm text-gray-600">Data</label>
              <input
                type="date"
                className="w-full border rounded-lg p-2"
                value={form.specific_date}
                onChange={(e) => setForm((prev) => ({ ...prev, specific_date: e.target.value }))}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm text-gray-600">Dia da semana</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={form.day_of_week}
                  onChange={(e) => setForm((prev) => ({ ...prev, day_of_week: e.target.value }))}
                >
                  {dayOptions.map((day) => (
                    <option key={String(day.value)} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Recorrência inicia em</label>
                <input
                  type="date"
                  className="w-full border rounded-lg p-2"
                  value={form.recurring_start_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, recurring_start_date: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Recorrência termina em (opcional)</label>
                <input
                  type="date"
                  className="w-full border rounded-lg p-2"
                  value={form.recurring_end_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, recurring_end_date: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          <div>
            <label className="text-sm text-gray-600">Início</label>
            <input
              type="time"
              className="w-full border rounded-lg p-2"
              value={form.start_time}
              onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Fim</label>
            <input
              type="time"
              className="w-full border rounded-lg p-2"
              value={form.end_time}
              onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Título (opcional)</label>
            <input
              type="text"
              className="w-full border rounded-lg p-2"
              placeholder="Ex: almoço, pausa, compromisso"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="is_active_interval"
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active_interval" className="text-sm text-gray-700">
              Intervalo ativo
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border">
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
            style={{ backgroundColor: strongColor }}
          >
            {saving ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeIntervalsTab({ org, setActiveTab, user }) {
  const { palette } = useOrganizationColors(org.slug_organization);
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [intervals, setIntervals] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInterval, setEditingInterval] = useState(null);

  const [form, setForm] = useState(emptyForm());

  const strongColor = palette?.strong_color || "#5E3BEE";

  const employeeNameMap = useMemo(() => {
    const map = new Map();
    (employees || []).forEach((e) => map.set(String(e.id), e.name));
    return map;
  }, [employees]);

  async function loadEmployees() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${org.slug_organization}`,
      { credentials: "include" }
    );

    if (res.status === 402) {
      setShowPaywall(true);
      return;
    }

    const data = await res.json();
    const employeesList = Array.isArray(data) ? data : [];
    setEmployees(employeesList);
    return employeesList;
  }

  async function loadIntervals(employeeId = selectedEmployee) {
    setLoading(true);
    try {
      const query = employeeId ? `?employee_id=${employeeId}` : "";

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/employee-intervals/${org.slug_organization}${query}`,
        { credentials: "include" }
      );

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar intervalos");
      }

      setIntervals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao carregar intervalos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const employeesList = await loadEmployees();
        const linkedEmployee = employeesList.find((employee) => employee.user_id && user?.id && employee.user_id === user.id);

        const initialEmployeeId = linkedEmployee ? String(linkedEmployee.id) : "";
        setSelectedEmployee(initialEmployeeId);
        await loadIntervals(initialEmployeeId);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingInterval(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (interval) => {
    setEditingInterval(interval);
    setForm({
      employee_id: String(interval.employee_id || ""),
      interval_type: interval.interval_type || "single",
      specific_date: interval.specific_date || "",
      day_of_week:
        interval.day_of_week === 7 || interval.day_of_week === null || interval.day_of_week === undefined
          ? "every"
          : String(interval.day_of_week),
      recurring_start_date: interval.recurring_start_date || "",
      recurring_end_date: interval.recurring_end_date || "",
      start_time: formatTime(interval.start_time),
      end_time: formatTime(interval.end_time),
      title: interval.title || "",
      is_active: interval.is_active !== false,
    });
    setShowEditModal(true);
  };

  const validateForm = () => {
    if (!form.employee_id) {
      toast.info("Selecione um funcionário");
      return false;
    }

    if (!form.start_time || !form.end_time) {
      toast.info("Preencha horário de início e fim");
      return false;
    }

    if (form.start_time >= form.end_time) {
      toast.info("Horário inicial deve ser menor que o final");
      return false;
    }

    if (form.interval_type === "single" && !form.specific_date) {
      toast.info("Selecione a data do intervalo único");
      return false;
    }

    if (form.interval_type === "recurring" && !form.recurring_start_date) {
      toast.info("Preencha a data de início da recorrência");
      return false;
    }

    if (
      form.interval_type === "recurring" &&
      form.recurring_end_date &&
      form.recurring_end_date < form.recurring_start_date
    ) {
      toast.info("Data final da recorrência deve ser maior ou igual à inicial");
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    employee_id: Number(form.employee_id),
    interval_type: form.interval_type,
    specific_date: form.interval_type === "single" ? form.specific_date : null,
    day_of_week:
      form.interval_type === "recurring"
        ? form.day_of_week === "every"
          ? 7
          : Number(form.day_of_week)
        : null,
    recurring_start_date:
      form.interval_type === "recurring" ? form.recurring_start_date : null,
    recurring_end_date:
      form.interval_type === "recurring" && form.recurring_end_date
        ? form.recurring_end_date
        : null,
    start_time: normalizeTimeForApi(form.start_time),
    end_time: normalizeTimeForApi(form.end_time),
    title: form.title || null,
    is_active: !!form.is_active,
  });

  const handleCreate = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/employee-intervals/${org.slug_organization}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao criar intervalo");
      }

      toast.success("Intervalo criado com sucesso");
      setShowCreateModal(false);
      resetForm();
      await loadIntervals(selectedEmployee);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao criar intervalo");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingInterval || !validateForm()) return;

    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/employee-intervals/${org.slug_organization}/${editingInterval.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao atualizar intervalo");
      }

      toast.success("Intervalo atualizado com sucesso");
      setShowEditModal(false);
      resetForm();
      await loadIntervals(selectedEmployee);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao atualizar intervalo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (interval) => {
    const confirmed = await confirm({
      title: "Excluir intervalo",
      message: "Deseja realmente excluir este intervalo?",
      confirmVariant: "danger",
      confirmColor: strongColor,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/employee-intervals/${org.slug_organization}/${interval.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao excluir intervalo");
      }

      toast.success("Intervalo removido");
      await loadIntervals(selectedEmployee);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao excluir intervalo");
    }
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-3xl border shadow-sm">
      <TrialExpiredModal open={showPaywall} org={org} setActiveTab={setActiveTab} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl text-gray-800">Intervalos de Funcionários</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: strongColor }}
        >
          Novo intervalo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-gray-600">Filtrar por funcionário</label>
          <select
            className="w-full border rounded-lg p-2"
            value={selectedEmployee}
            onChange={async (e) => {
              const value = e.target.value;
              setSelectedEmployee(value);
              await loadIntervals(value);
            }}
          >
            <option value="">Todos</option>
            {(employees || []).map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3">Funcionário</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Data / Recorrência</th>
              <th className="text-left p-3">Horário</th>
              <th className="text-left p-3">Título</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={7}>
                  Carregando intervalos...
                </td>
              </tr>
            ) : intervals.length === 0 ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={7}>
                  Nenhum intervalo encontrado.
                </td>
              </tr>
            ) : (
              intervals.map((interval) => {
                const employeeName =
                  interval.employees?.name || employeeNameMap.get(String(interval.employee_id)) || "-";

                const dateInfo =
                  interval.interval_type === "single"
                    ? `Data: ${formatDate(interval.specific_date)}`
                    : `Dia: ${
                        interval.day_of_week === 7 || interval.day_of_week === null || interval.day_of_week === undefined
                          ? "Todo dia"
                          : dayOptions.find((d) => String(d.value) === String(interval.day_of_week))?.label || "-"
                      } | ${formatDate(interval.recurring_start_date)} até ${
                        interval.recurring_end_date ? formatDate(interval.recurring_end_date) : "indeterminado"
                      }`;

                return (
                  <tr key={interval.id} className="border-t">
                    <td className="p-3">{employeeName}</td>
                    <td className="p-3">{interval.interval_type === "single" ? "Único" : "Recorrente"}</td>
                    <td className="p-3">{dateInfo}</td>
                    <td className="p-3">
                      {formatTime(interval.start_time)} - {formatTime(interval.end_time)}
                    </td>
                    <td className="p-3">{interval.title || "-"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          interval.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {interval.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(interval)}
                          className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(interval)}
                          className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <EmployeeIntervalModal
        isOpen={showCreateModal}
        isEdit={false}
        form={form}
        setForm={setForm}
        employees={employees}
        dayOptions={dayOptions}
        onCancel={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        onSubmit={handleCreate}
        saving={saving}
        strongColor={strongColor}
      />

      <EmployeeIntervalModal
        isOpen={showEditModal}
        isEdit={true}
        form={form}
        setForm={setForm}
        employees={employees}
        dayOptions={dayOptions}
        onCancel={() => {
          setShowEditModal(false);
          resetForm();
        }}
        onSubmit={handleUpdate}
        saving={saving}
        strongColor={strongColor}
      />
    </div>
  );
}
