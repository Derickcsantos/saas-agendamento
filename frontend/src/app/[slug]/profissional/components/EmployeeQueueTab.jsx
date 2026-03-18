"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";

export default function EmployeeQueueTab({ org, user, palette }) {
  const slug = org?.slug_organization;
  const employeeId = Number(user?.id_employee ?? user?.id);
  const isAdmin = user?.tipo === "admin";

  const [queue, setQueue] = useState(null);
  const [queueEntries, setQueueEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [joinServices, setJoinServices] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [joinData, setJoinData] = useState({
    categoryId: "",
    serviceId: "",
    employeeId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
  });

  const resetJoinForm = () => {
    setJoinData({
      categoryId: "",
      serviceId: "",
      employeeId: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
    });
    setJoinServices([]);
    setAvailableEmployees([]);
  };

  const normalizeEntries = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.queue_entries)) return payload.queue_entries;
    if (Array.isArray(payload?.entries)) return payload.entries;
    return [];
  };

  const handleWebSocketMessage = (data) => {
    if (data.type === "connection_established") {
      setWsConnected(true);
      return;
    }

    if (data.type === "new_entry") {
      setQueueEntries((prev) => {
        const exists = prev.find((entry) => entry.id === data.entry?.id);
        if (exists) return prev;
        return [...prev, data.entry].sort((a, b) => a.position - b.position);
      });
      return;
    }

    if (data.type === "client_called") {
      setQueueEntries((prev) =>
        prev.map((entry) =>
          entry.id === data.entryId ? { ...entry, ...data.entry, status: "calling" } : entry
        )
      );
      return;
    }

    if (data.type === "entry_completed") {
      setQueueEntries((prev) =>
        prev.map((entry) =>
          entry.id === data.entryId ? { ...entry, ...data.entry, status: "completed" } : entry
        )
      );
      return;
    }

    if (data.type === "entry_canceled" || data.type === "entry_cancelled") {
      setQueueEntries((prev) =>
        prev.map((entry) =>
          entry.id === data.entryId ? { ...entry, ...data.entry, status: "canceled" } : entry
        )
      );
      return;
    }

    if (data.type === "entry_removed") {
      setQueueEntries((prev) => prev.filter((entry) => entry.id !== data.entryId));
      return;
    }

    if (data.type === "entry_updated") {
      setQueueEntries((prev) =>
        prev.map((entry) => (entry.id === data.entryId ? { ...entry, ...data.entry } : entry))
      );
      return;
    }

    if (data.type === "queue_reordered") {
      setQueueEntries((prev) => {
        const inactiveEntries = prev.filter(
          (entry) => entry.status !== "confirmed" && entry.status !== "calling"
        );
        return [...inactiveEntries, ...(data.entries || [])].sort((a, b) => a.position - b.position);
      });
      return;
    }

    if (data.type === "queue_status_changed") {
      setQueue((prev) => (prev ? { ...prev, status: data.status } : prev));
    }
  };

  useQueueWebSocket(slug, queue?.queue_id, handleWebSocketMessage);

  useEffect(() => {
    setJoinData((prev) => ({
      ...prev,
      employeeId: prev.serviceId ? prev.employeeId : "",
    }));
  }, [employeeId]);

  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [queueRes, categoriesRes] = await Promise.all([
          fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/today`),
          fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/appointments/categories/${slug}`),
        ]);

        if (queueRes.ok) {
          const queueData = await queueRes.json();
          setQueue(queueData);
          setQueueEntries(normalizeEntries(queueData));
        } else if (queueRes.status === 404) {
          setQueue(null);
          setQueueEntries([]);
        } else {
          toast.error("Erro ao carregar fila");
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData || []);
        }
      } catch (error) {
        console.error("Erro ao carregar fila do profissional:", error);
        toast.error("Erro ao carregar fila");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const myEntries = useMemo(
    () => {
      if (!Array.isArray(queueEntries)) return [];

      if (isAdmin) {
        return queueEntries;
      }

      if (!Number.isFinite(employeeId) || employeeId <= 0) {
        return queueEntries;
      }

      return queueEntries.filter((entry) => {
        const entryEmployeeId = Number(entry?.employee_id ?? entry?.employees?.id);
        return entryEmployeeId === employeeId;
      });
    },
    [queueEntries, employeeId, isAdmin]
  );

  const activeEntries = useMemo(
    () => myEntries
      .filter((entry) => entry.status === "confirmed" || entry.status === "calling")
      .sort((a, b) => a.position - b.position),
    [myEntries]
  );

  const completedEntries = useMemo(
    () => myEntries.filter((entry) => entry.status === "completed"),
    [myEntries]
  );

  const canceledEntries = useMemo(
    () => myEntries.filter((entry) => entry.status === "canceled" || entry.status === "cancelled"),
    [myEntries]
  );

  const queueStats = useMemo(() => {
    const totalRevenue = completedEntries.reduce(
      (sum, entry) => sum + Number(entry.final_price ?? entry.services?.price ?? 0),
      0
    );

    return {
      total: myEntries.length,
      waiting: activeEntries.filter((entry) => entry.status === "confirmed").length,
      calling: activeEntries.filter((entry) => entry.status === "calling").length,
      completed: completedEntries.length,
      canceled: canceledEntries.length,
      totalRevenue,
    };
  }, [activeEntries, canceledEntries, completedEntries, myEntries]);

  const loadServices = async (categoryId) => {
    if (!categoryId) {
      setJoinServices([]);
      return;
    }

    try {
      setLoadingServices(true);
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/services/${categoryId}/${slug}`
      );

      if (!res.ok) {
        throw new Error("Erro ao carregar serviços");
      }

      setJoinServices((await res.json()) || []);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      toast.error(error.message || "Erro ao carregar serviços");
    } finally {
      setLoadingServices(false);
    }
  };

  const loadEmployeesForService = async (serviceId) => {
    if (!serviceId) {
      setAvailableEmployees([]);
      return;
    }

    try {
      setLoadingEmployees(true);
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/employees/${serviceId}/${slug}`
      );

      if (!res.ok) {
        throw new Error("Erro ao carregar profissionais");
      }

      const responseEmployees = (await res.json()) || [];

      const employees = isAdmin
        ? responseEmployees
        : responseEmployees.filter((employee) => Number(employee.id) === employeeId);

      const fallbackEmployee = !isAdmin && Number.isFinite(employeeId) && employeeId > 0
        ? [{
            id: employeeId,
            name: user?.username || user?.name || "Você",
          }]
        : [];

      const finalEmployees = employees.length > 0 ? employees : fallbackEmployee;

      setAvailableEmployees(finalEmployees);
      setJoinData((prev) => ({
        ...prev,
        employeeId: finalEmployees[0] ? String(finalEmployees[0].id) : "",
      }));
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
      toast.error(error.message || "Erro ao carregar profissionais");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleJoinQueue = async () => {
    if (!queue?.queue_id) {
      toast.error("Não existe fila criada para hoje");
      return;
    }

    if (queue?.status !== "open") {
      toast.error("A fila está fechada para novas entradas");
      return;
    }

    if (!joinData.clientName || !joinData.serviceId || !joinData.employeeId || availableEmployees.length === 0) {
      toast.error("Preencha nome e selecione um serviço válido");
      return;
    }

    try {
      setJoinLoading(true);

      const selectedService = joinServices.find(
        (service) => String(service.id) === String(joinData.serviceId)
      );

      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_name: joinData.clientName,
            client_email: joinData.clientEmail || null,
            client_phone: joinData.clientPhone || null,
            service_id: Number(joinData.serviceId),
            employee_id: Number(joinData.employeeId),
            original_price: Number(selectedService?.price || 0),
            final_price: Number(selectedService?.price || 0),
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao adicionar pessoa na fila");
      }

      toast.success("Pessoa adicionada na sua fila", { autoClose: 2000 });
      setShowJoinModal(false);
      resetJoinForm();
    } catch (error) {
      console.error("Erro ao adicionar pessoa:", error);
      toast.error(error.message || "Erro ao adicionar pessoa na fila");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCallNext = async () => {
    try {
      const validEmployeeId = Number.isFinite(employeeId) && employeeId > 0;
      const payload = !isAdmin && validEmployeeId ? { employee_id: employeeId } : {};

      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}/call-next`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao chamar próximo cliente");
      }

      toast.success(`${data.clients?.client_name || "Cliente"} foi chamado!`, { autoClose: 2500 });
    } catch (error) {
      console.error("Erro ao chamar próximo:", error);
      toast.error(error.message || "Erro ao chamar próximo cliente");
    }
  };

  const handleComplete = async (entryId) => {
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}/${entryId}/complete`,
        { method: "PATCH" }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao concluir atendimento");
      }

      toast.success("Atendimento concluído", { autoClose: 2000 });
    } catch (error) {
      console.error("Erro ao concluir atendimento:", error);
      toast.error(error.message || "Erro ao concluir atendimento");
    }
  };

  const handleCancel = async (entryId) => {
    const confirmed = window.confirm("Deseja remover esta pessoa da sua fila?");
    if (!confirmed) return;

    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}/${entryId}/cancel`,
        { method: "PATCH" }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao remover cliente da fila");
      }

      toast.success("Pessoa removida da fila", { autoClose: 2000 });
    } catch (error) {
      console.error("Erro ao remover cliente da fila:", error);
      toast.error(error.message || "Erro ao remover cliente da fila");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!queue) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900">Fila indisponível</h2>
        <p className="text-sm text-slate-500 mt-2">
          Ainda não existe fila criada para hoje. Solicite ao admin a criação da fila.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Minha fila</h2>
          <p className="text-sm text-slate-500 mt-1">
            {org?.name} • {queue?.opens_at?.substring(0, 5)} às {queue?.closes_at?.substring(0, 5)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {wsConnected && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Conectado
            </span>
          )}

          <span className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-semibold ${queue?.status === "open" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"}`}>
            {queue?.status === "open" ? "Fila aberta" : "Fila fechada"}
          </span>

          <button
            onClick={() => setShowJoinModal(true)}
            disabled={queue?.status !== "open"}
            style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Adicionar pessoa
          </button>

          <button
            onClick={handleCallNext}
            disabled={!activeEntries.some((entry) => entry.status === "confirmed")}
            style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Chamar próximo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{queueStats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Aguardando</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{queueStats.waiting}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Chamados</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{queueStats.calling}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Concluídos</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{queueStats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Cancelados</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{queueStats.canceled}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Receita</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">R$ {queueStats.totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Clientes da minha fila</h3>
          <p className="text-sm text-slate-500 mt-1">Somente atendimentos vinculados ao seu perfil.</p>
        </div>

        {activeEntries.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">Nenhum cliente aguardando atendimento.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-4 flex flex-col lg:flex-row lg:items-center gap-4 ${entry.status === "calling" ? "bg-amber-50" : "bg-white"}`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold ${entry.status === "calling" ? "bg-amber-500 animate-pulse" : "bg-slate-900"}`}>
                  {entry.position}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate">{entry.clients?.client_name}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${entry.status === "calling" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {entry.status === "calling" ? "Sendo atendido" : "Aguardando"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {entry.services?.name} • {entry.clients?.client_phone || "Sem telefone"}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedEntry(entry)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    Detalhes
                  </button>
                  <button
                    onClick={() => handleComplete(entry.id)}
                    className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100"
                  >
                    Concluir
                  </button>
                  <button
                    onClick={() => handleCancel(entry.id)}
                    className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Concluídos</h3>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {completedEntries.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">Nenhum atendimento concluído.</p>
            ) : (
              completedEntries.map((entry) => (
                <div key={entry.id} className="p-4 text-sm">
                  <p className="font-medium text-slate-900">{entry.clients?.client_name}</p>
                  <p className="text-slate-500 mt-1">{entry.services?.name}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Cancelados</h3>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {canceledEntries.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">Nenhum atendimento cancelado.</p>
            ) : (
              canceledEntries.map((entry) => (
                <div key={entry.id} className="p-4 text-sm">
                  <p className="font-medium text-slate-900">{entry.clients?.client_name}</p>
                  <p className="text-slate-500 mt-1">{entry.services?.name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showJoinModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowJoinModal(false);
              resetJoinForm();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-slate-900">Adicionar pessoa na fila</h3>
              <p className="text-sm text-slate-500 mt-2 mb-6">
                O atendimento será vinculado ao seu perfil profissional.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Nome</label>
                  <input
                    type="text"
                    value={joinData.clientName}
                    onChange={(e) => setJoinData((prev) => ({ ...prev, clientName: e.target.value }))}
                    className="mt-1 w-full px-4 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="Nome do cliente"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Telefone</label>
                    <input
                      type="text"
                      value={joinData.clientPhone}
                      onChange={(e) => setJoinData((prev) => ({ ...prev, clientPhone: e.target.value }))}
                      className="mt-1 w-full px-4 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Email</label>
                    <input
                      type="email"
                      value={joinData.clientEmail}
                      onChange={(e) => setJoinData((prev) => ({ ...prev, clientEmail: e.target.value }))}
                      className="mt-1 w-full px-4 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Categoria</label>
                  <select
                    value={joinData.categoryId}
                    onChange={(e) => {
                      const categoryId = e.target.value;
                      setJoinData((prev) => ({
                        ...prev,
                        categoryId,
                        serviceId: "",
                        employeeId: "",
                      }));
                      setAvailableEmployees([]);
                      loadServices(categoryId);
                    }}
                    className="mt-1 w-full px-4 py-2 rounded-lg border border-slate-200 text-sm"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Serviço</label>
                  <select
                    value={joinData.serviceId}
                    onChange={(e) => {
                      const serviceId = e.target.value;
                      setJoinData((prev) => ({
                        ...prev,
                        serviceId,
                        employeeId: "",
                      }));
                      loadEmployeesForService(serviceId);
                    }}
                    disabled={loadingServices || joinServices.length === 0}
                    className="mt-1 w-full px-4 py-2 rounded-lg border border-slate-200 text-sm disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingServices
                        ? "Carregando..."
                        : joinServices.length === 0
                        ? "Selecione uma categoria primeiro"
                        : "Selecione um serviço"}
                    </option>
                    {joinServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - R$ {service.price?.toFixed(2)} ({service.duration}min)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Profissional</label>
                  <input
                    type="text"
                    readOnly
                    value={availableEmployees[0]?.name || user?.username || user?.name || "Você"}
                    className="mt-1 w-full px-4 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50"
                  />
                  {joinData.serviceId && availableEmployees.length === 0 && !loadingEmployees && (
                    <p className="mt-2 text-xs text-rose-600">
                      Este serviço não está vinculado ao seu perfil profissional.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    resetJoinForm();
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleJoinQueue}
                  disabled={joinLoading || loadingEmployees || !joinData.employeeId}
                  style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {joinLoading ? "Adicionando..." : "Adicionar na fila"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEntry && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-4">Detalhes do atendimento</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-500">Cliente</p>
                  <p className="font-semibold text-slate-900">{selectedEntry.clients?.client_name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Telefone</p>
                  <p className="font-semibold text-slate-900">{selectedEntry.clients?.client_phone || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Serviço</p>
                  <p className="font-semibold text-slate-900">{selectedEntry.services?.name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Valor</p>
                  <p className="font-semibold text-emerald-600">
                    R$ {Number(selectedEntry.final_price ?? selectedEntry.services?.price ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <p className="font-semibold text-slate-900">{selectedEntry.status}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
                className="w-full mt-6 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
