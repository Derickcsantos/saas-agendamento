"use client";

import { useEffect, useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";
import { ptBR } from "date-fns/locale";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { useConfirm } from "@/components/ConfirmDialogProvider";

const modalStyles = `
  .react-datepicker {
    font-family: inherit;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
  }
  
  .react-datepicker__header {
    background-color: transparent;
    border-bottom: 1px solid #e5e7eb;
    padding-top: 0.75rem;
    border-radius: 0.75rem 0.75rem 0 0;
  }
  
  .react-datepicker__day--selected {
    background-color: #4f46e5;
    border-radius: 0.375rem;
  }
  
  .react-datepicker__day:hover {
    border-radius: 0.375rem;
  }
  
  .react-datepicker__day--in-range {
    background-color: #e0e7ff;
  }
  
  .react-datepicker__day--range-start,
  .react-datepicker__day--range-end {
    background-color: #4f46e5;
    color: white;
  }
`;

export default function ClosedPeriodsTab({ org }) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { palette } = useOrganizationColors(org.slug_organization);

  const { confirm } = useConfirm()
  
  // Estados para criação
  const [newPeriod, setNewPeriod] = useState({
    start_day: null,
    end_day: null,
  });
  
  // Estados para edição
  const [editData, setEditData] = useState({
    start_day: null,
    end_day: null,
  });

  const [errors, setErrors] = useState({});

  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  async function loadPeriods() {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/closed-periods/${org.slug_organization}`,
        { 
          credentials: "include",
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!res.ok) throw new Error("Erro ao carregar períodos");
      
      const data = await res.json();
      setPeriods(data);
    } catch (error) {
      console.error("Erro ao carregar períodos fechados:", error);
      toast.error("Erro ao carregar períodos fechados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPeriods();
  }, []);

  const validatePeriod = (start, end) => {
    const errors = {};
    
    if (!start) {
      errors.start_day = "Data de início é obrigatória";
    }
    
    if (!end) {
      errors.end_day = "Data de término é obrigatória";
    }
    
    if (start && end && start > end) {
      errors.date_range = "A data de início deve ser anterior à data de término";
    }
    
    return errors;
  };

  const handleCreatePeriod = async () => {
    const validationErrors = validatePeriod(newPeriod.start_day, newPeriod.end_day);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors({});
    
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/closed-periods/${org.slug_organization}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start_day: newPeriod.start_day.toISOString(),
            end_day: newPeriod.end_day.toISOString(),
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao criar período");
      }

      setShowCreateModal(false);
      setNewPeriod({ start_day: null, end_day: null });
      loadPeriods();
      toast.success("Período fechado criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar período:", error);
      toast.error("Erro ao criar período fechado");
    }
  };

  const handleEditPeriod = async () => {
    if (!editingPeriod) return;
    
    const validationErrors = validatePeriod(editData.start_day, editData.end_day);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors({});
    
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/closed-periods/${org.slug_organization}/${editingPeriod.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start_day: editData.start_day.toISOString(),
            end_day: editData.end_day.toISOString(),
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao atualizar período");
      }

      setShowEditModal(false);
      setEditingPeriod(null);
      loadPeriods();
      toast.success("Período fechado atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar período:", error);
      toast.error("Erro ao atualizar período fechado");
    }
  };

  const handleDeletePeriod = async (id) => {
    // if (!confirm("Tem certeza que deseja excluir este período fechado?")) return;

    const confirmed = await confirm({
      title: "Excluir período fechado",
      message: "Deseja realmente excluir este período fechado?"
    });

    if (!confirmed) return
    
    setDeletingId(id);
    
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/closed-periods/${org.slug_organization}/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Erro ao excluir período");
      }

      loadPeriods();
      toast.success("Período fechado excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir período:", error);
      toast.error("Erro ao excluir período fechado");
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (period) => {
    setEditingPeriod(period);
    setEditData({
      start_day: parseISO(period.start_day),
      end_day: parseISO(period.end_day),
    });
    setErrors({});
    setShowEditModal(true);
  };

  const formatDateTime = (dateString) => {
    try {
      const date = parseISO(dateString);
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatDateOnly = (dateString) => {
    try {
      const date = parseISO(dateString);
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString.split("T")[0];
    }
  };

  const isCurrentPeriod = (start, end) => {
    const now = new Date();
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    return now >= startDate && now <= endDate;
  };

  const isFuturePeriod = (start) => {
    const now = new Date();
    const startDate = parseISO(start);
    return startDate > now;
  };

  const CreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <style>{modalStyles}</style>
        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4">Criar Período Fechado</h2>
          
          {errors.date_range && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {errors.date_range}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Data de Início *
              </label>
              <DatePicker
                selected={newPeriod.start_day}
                onChange={(date) => {
                  setNewPeriod({ ...newPeriod, start_day: date });
                  setErrors({ ...errors, start_day: "" });
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                className={`w-full p-2 border rounded-lg ${
                  errors.start_day ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholderText="Selecione data e hora de início"
                locale={ptBR}
              />
              {errors.start_day && (
                <p className="text-red-500 text-sm mt-1">{errors.start_day}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Data de Término *
              </label>
              <DatePicker
                selected={newPeriod.end_day}
                onChange={(date) => {
                  setNewPeriod({ ...newPeriod, end_day: date });
                  setErrors({ ...errors, end_day: "" });
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                className={`w-full p-2 border rounded-lg ${
                  errors.end_day ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholderText="Selecione data e hora de término"
                locale={ptBR}
                minDate={newPeriod.start_day}
              />
              {errors.end_day && (
                <p className="text-red-500 text-sm mt-1">{errors.end_day}</p>
              )}
            </div>

            {newPeriod.start_day && newPeriod.end_day && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm">
                  <strong>Duração:</strong>{" "}
                  {Math.ceil(
                    (newPeriod.end_day - newPeriod.start_day) / (1000 * 60 * 60 * 24)
                  )}{" "}
                  dias
                </p>
                <p className="text-sm mt-1">
                  <strong>Período:</strong>{" "}
                  {format(newPeriod.start_day, "dd/MM/yyyy HH:mm")} até{" "}
                  {format(newPeriod.end_day, "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setNewPeriod({ start_day: null, end_day: null });
                setErrors({});
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreatePeriod}
              className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition"
              style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
            >
              Criar Período
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EditModal = () => {
    if (!showEditModal || !editingPeriod) return null;

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <style>{modalStyles}</style>
        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4">Editar Período Fechado</h2>
          
          {errors.date_range && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {errors.date_range}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Data de Início *
              </label>
              <DatePicker
                selected={editData.start_day}
                onChange={(date) => {
                  setEditData({ ...editData, start_day: date });
                  setErrors({ ...errors, start_day: "" });
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                className={`w-full p-2 border rounded-lg ${
                  errors.start_day ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                locale={ptBR}
              />
              {errors.start_day && (
                <p className="text-red-500 text-sm mt-1">{errors.start_day}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Data de Término *
              </label>
              <DatePicker
                selected={editData.end_day}
                onChange={(date) => {
                  setEditData({ ...editData, end_day: date });
                  setErrors({ ...errors, end_day: "" });
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                className={`w-full p-2 border rounded-lg ${
                  errors.end_day ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                locale={ptBR}
                minDate={editData.start_day}
              />
              {errors.end_day && (
                <p className="text-red-500 text-sm mt-1">{errors.end_day}</p>
              )}
            </div>

            {editData.start_day && editData.end_day && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm">
                  <strong>Duração:</strong>{" "}
                  {Math.ceil(
                    (editData.end_day - editData.start_day) / (1000 * 60 * 60 * 24)
                  )}{" "}
                  dias
                </p>
                <p className="text-sm mt-1">
                  <strong>Novo período:</strong>{" "}
                  {format(editData.start_day, "dd/MM/yyyy HH:mm")} até{" "}
                  {format(editData.end_day, "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingPeriod(null);
                setErrors({});
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleEditPeriod}
              className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition"
              style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" 
             style={{ borderColor: palette?.strong_color || "#4f46e5" }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-gray-800 dark:text-gray-100">
            Períodos Fechados
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie períodos de fechamento (feriados, férias, manutenção)
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
          style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Novo Período
        </button>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nenhum período fechado cadastrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Comece criando seu primeiro período de fechamento
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition"
            style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
          >
            Criar Primeiro Período
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {periods.map((period) => {
            const isCurrent = isCurrentPeriod(period.start_day, period.end_day);
            const isFuture = isFuturePeriod(period.start_day);
            
            return (
              <div
                key={period.id}
                className={`rounded-xl border p-5 transition-all hover:shadow-lg ${
                  isCurrent
                    ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
                    : isFuture
                    ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      isCurrent
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : isFuture
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}>
                      {isCurrent
                        ? "ATIVO AGORA"
                        : isFuture
                        ? "FUTURO"
                        : "PASSADO"}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(period)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handleDeletePeriod(period.id)}
                      disabled={deletingId === period.id}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition disabled:opacity-50"
                      title="Excluir"
                    >
                      {deletingId === period.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Início</p>
                    <p className="font-medium">{formatDateTime(period.start_day)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Término</p>
                    <p className="font-medium">{formatDateTime(period.end_day)}</p>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Duração</p>
                    <p className="font-medium">
                      {Math.ceil(
                        (parseISO(period.end_day) - parseISO(period.start_day)) / (1000 * 60 * 60 * 24)
                      )} dia(s)
                    </p>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Período</p>
                    <p className="font-medium">{formatDateOnly(period.start_day)} - {formatDateOnly(period.end_day)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {periods.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm">Período Ativo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">Período Futuro</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-sm">Período Passado</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {periods.length} período(s) fechado(s) cadastrado(s)
          </p>
        </div>
      )}

      <CreateModal />
      <EditModal />
    </div>
  );
}