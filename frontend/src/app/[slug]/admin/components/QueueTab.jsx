"use client";

import React, { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { QRCodeCanvas } from "qrcode.react";
import { useConfirm } from '@/components/ConfirmDialogProvider'

export default function QueueTab({ slug }) {
  const [queue, setQueue] = useState(null);
  const [queueEntries, setQueueEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const { palette } = useOrganizationColors(slug);
  const [creatingQueue, setCreatingQueue] = useState(false);
  const [createQueueLoading, setCreateQueueLoading] = useState(false);
  const [createQueueDate, setCreateQueueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [createQueueStart, setCreateQueueStart] = useState("08:00");
  const [createQueueEnd, setCreateQueueEnd] = useState("18:00");
  
  // Estados para modais
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditQueue, setShowEditQueue] = useState(false);
  const [editQueueDate, setEditQueueDate] = useState("");
  const [editQueueStart, setEditQueueStart] = useState("");
  const [editQueueEnd, setEditQueueEnd] = useState("");
  const [editQueueLoading, setEditQueueLoading] = useState(false);
  const qrCodeRef = useRef();
  const { confirm } = useConfirm();

  // ================================
  // HANDLER DE MENSAGENS WEBSOCKET
  // ================================
  const handleWebSocketMessage = (data) => {
    console.log('📨 Admin WebSocket:', data.type);

    if (data.type === "connection_established") {
      setWsConnected(true);
    } else if (data.type === "new_entry") {
      setQueueEntries((prev) => {
        const exists = prev.find(e => e.id === data.entry?.id);
        if (exists) return prev;
        return [...prev, data.entry].sort((a, b) => a.position - b.position);
      });
      toast.info(`${data.entry?.clients?.client_name} entrou na fila!`, { autoClose: 3000 });
    } else if (data.type === "entry_removed") {
      setQueueEntries((prev) => prev.filter((e) => e.id !== data.entryId));
      toast.info("Cliente saiu da fila", { autoClose: 3000 });
    } else if (data.type === "entry_completed") {
      setQueueEntries((prev) =>
        prev.map((e) =>
          e.id === data.entryId ? { ...e, status: "completed" } : e
        )
      );
      toast.success(`${data.entry?.clients?.client_name} atendido!`, { autoClose: 2000 });
    } else if (data.type === "entry_canceled" || data.type === "entry_cancelled") {
      setQueueEntries((prev) =>
        prev.map((e) =>
          e.id === data.entryId ? { ...e, status: "canceled" } : e
        )
      );
      toast.warning(`${data.entry?.clients?.client_name} cancelado`, { autoClose: 2000 });
    } else if (data.type === "client_called") {
      setQueueEntries((prev) =>
        prev.map((e) => (e.id === data.entryId ? { ...e, status: "calling" } : e))
      );
      toast.info(`${data.entry?.clients?.client_name} chamado`, { autoClose: 3000 });
    } else if (data.type === "queue_reordered") {
      setQueueEntries((prev) => {
        const inactive = prev.filter(
          (e) => e.status !== "confirmed" && e.status !== "calling"
        );
        const updatedActive = data.entries || [];
        return [...inactive, ...updatedActive].sort((a, b) => a.position - b.position);
      });
    }
  };

  // Hook WebSocket
  const { isConnected: checkWsConnected } = useQueueWebSocket(
    slug,
    queue?.queue_id,
    handleWebSocketMessage
  );

  // ================================
  // FUNÇÕES AUXILIARES
  // ================================
  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  };

  const getQueueShareUrl = () => {
    return `${window.location.origin}/${slug}/fila`;
  };

  const handleCopyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copiado para a área de transferência!", { autoClose: 2000 });
    } catch (err) {
      console.error("Erro ao copiar:", err);
      toast.error("Erro ao copiar o link");
    }
  };

  // ================================
  // 1️⃣ CARREGAR FILA DO DIA
  // ================================
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setLoading(true);
        const queueRes = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/today`
        );

        if (queueRes.ok) {
          const data = await queueRes.json();
          setQueue(data);
          setQueueEntries(data.queue_entries || []);
        } else if (queueRes.status === 404) {
          setQueue(null);
          setQueueEntries([]);
        } else {
          toast.error("Erro ao carregar fila");
        }
      } catch (err) {
        console.error("Erro ao carregar fila:", err);
        toast.error("Erro ao carregar fila");
      } finally {
        setLoading(false);
      }
    };
    fetchQueue();
  }, [slug]);

  // ================================
  // 2️⃣ CARREGAR ESTATÍSTICAS
  // ================================
  useEffect(() => {
    if (!queue?.queue_id) return;

    const fetchStats = async () => {
      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}/stats`
        );
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Erro ao carregar estatísticas:", err);
      }
    };

    fetchStats();
    // Atualizar estatísticas a cada minuto
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [queue?.queue_id, slug]);

  // ================================
  // 3️⃣ DRAG AND DROP
  // ================================
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    const activeList = queueEntries
      .filter((e) => e.status === "confirmed" || e.status === "calling")
      .sort((a, b) => a.position - b.position);

    if (activeList.length === 0) return;

    const movedEntry = activeList[sourceIndex];
    if (!movedEntry) return;

    console.log("🔄 Drag-drop:", {
      from: sourceIndex + 1,
      to: destIndex + 1,
      entryId: movedEntry.id,
      entryName: movedEntry.clients?.client_name,
    });

    // Simular reordenação localmente
    const reorderedActive = Array.from(activeList);
    const [removedEntry] = reorderedActive.splice(sourceIndex, 1);
    reorderedActive.splice(destIndex, 0, removedEntry);

    // Atualizar posições sequencialmente (1, 2, 3...)
    const updatedActive = reorderedActive.map((entry, idx) => ({
      ...entry,
      position: idx + 1,
    }));

    const updatedEntries = queueEntries
      .map((entry) => updatedActive.find((a) => a.id === entry.id) || entry)
      .sort((a, b) => a.position - b.position);

    setQueueEntries(updatedEntries);

    // Enviar para backend com nova posição (1-based)
    try {
      console.log("📤 Enviando reorder:", {
        entryId: movedEntry.id,
        newPosition: destIndex + 1,
      });

      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryId: Number(movedEntry.id),
            newPosition: destIndex + 1,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Erro ao reordenar");
      }

      const responseData = await res.json();
      console.log('✅ Reordenação concluída:', responseData);
      
      // Atualizar com dados do backend para garantir consistência
      if (responseData.entries) {
        setQueueEntries(responseData.entries);
      }

      toast.success("Posição atualizada!", { autoClose: 2000 });
    } catch (err) {
      console.error("❌ Erro ao reordenar:", err);
      toast.error(err.message || "Erro ao reordenar fila");
      
      // Recarregar fila do backend em caso de erro
      try {
        const fallbackRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/today`);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setQueueEntries(fallbackData.queue_entries || []);
        }
      } catch (fallbackErr) {
        console.error("Erro ao recarregar fila:", fallbackErr);
      }
    }
  };

  // ================================
  // 5️⃣ COMPLETAR ENTRADA
  // ================================
  const handleComplete = async (entryId) => {
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}/${entryId}/complete`,
        { method: "PATCH" }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao completar");
      }

      // WebSocket vai atualizar a UI
      console.log("✅ Atualização será enviada via WebSocket");
    } catch (err) {
      console.error("Erro ao completar:", err);
      toast.error(err.message || "Erro ao completar atendimento");
    }
  };

  // ================================
  // 6️⃣ CANCELAR ENTRADA
  // ================================
  const handleCancel = async (entryId) => {
    const confirmed = await confirm({
      title: 'Remover da fila',
      message: 'Deseja realmente tira-lo da fila?',
      confirmVariant: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}/${entryId}/cancel`,
        { method: "PATCH" }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao cancelar");
      }

      // WebSocket vai atualizar a UI
      console.log("✅ Cancelamento será enviado via WebSocket");
    } catch (err) {
      console.error("Erro ao cancelar:", err);
      toast.error(err.message || "Erro ao cancelar cliente");
    }
  };

  // ================================
  // 7️⃣ CHAMAR PRÓXIMO
  // ================================
  const handleCallNext = async () => {
    try {
      const nextEntry = queueEntries
        .filter((e) => e.status === "confirmed" || e.status === "calling")
        .sort((a, b) => a.position - b.position)[0];

      const employeeId = nextEntry?.employee_id ?? nextEntry?.employees?.id;
      if (!employeeId) {
        toast.error("Não foi possível identificar o profissional do próximo cliente");
        return;
      }

      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}/call-next`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee_id: Number(employeeId) }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao chamar próximo");
      }

      const data = await res.json();
      toast.success(`${data.entry?.clients?.client_name} foi chamado!`, { autoClose: 4000 });
    } catch (err) {
      console.error("Erro ao chamar próximo:", err);
      toast.error(err.message || "Erro ao chamar próximo");
    }
  };

  // ================================
  // 8️⃣ MUDAR STATUS DA FILA
  // ================================
  const handleToggleQueueStatus = async () => {
    const newStatus = queue.status === "open" ? "closed" : "open";
    
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        throw new Error("Erro ao alterar status");
      }

      const updated = await res.json();
      setQueue(updated);
      toast.success(`Fila ${newStatus === "open" ? "aberta" : "fechada"}!`, { autoClose: 3000 });
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      toast.error("Erro ao alterar status da fila");
    }
  };

  // ================================
  // 9️⃣ EDITAR FILA
  // ================================
  const handleOpenEditQueue = () => {
    setEditQueueDate(queue.queue_date);
    setEditQueueStart(queue.opens_at?.substring(0, 5) || "08:00");
    setEditQueueEnd(queue.closes_at?.substring(0, 5) || "18:00");
    setShowEditQueue(true);
  };

  const handleUpdateQueue = async () => {
    try {
      setEditQueueLoading(true);
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queue_date: editQueueDate,
            opens_at: `${editQueueStart}:00`,
            closes_at: `${editQueueEnd}:00`,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar fila");
      }

      setQueue(data);
      setShowEditQueue(false);
      toast.success("Fila atualizada com sucesso!", { autoClose: 3000 });
      setShowShareModal(true);
    } catch (err) {
      console.error("Erro ao atualizar fila:", err);
      toast.error(err.message || "Erro ao atualizar fila");
    } finally {
      setEditQueueLoading(false);
    }
  };

  const handleCreateQueue = async () => {
    try {
      setCreateQueueLoading(true);
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queue_date: createQueueDate,
            opens_at: createQueueStart,
            closes_at: createQueueEnd,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar fila");
      }

      setQueue(data);
      setQueueEntries([]);
      setCreatingQueue(false);
      toast.success("Fila criada com sucesso", { autoClose: 3000 });
      setShowShareModal(true);
    } catch (err) {
      console.error("Erro ao criar fila:", err);
      toast.error(err.message || "Erro ao criar fila");
    } finally {
      setCreateQueueLoading(false);
    }
  };

  // ================================
  // RENDER
  // ================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const activeEntries = queueEntries
    .filter((e) => e.status === "confirmed" || e.status === "calling")
    .sort((a, b) => a.position - b.position);
  const completedEntries = queueEntries.filter(e => e.status === "completed");
  const cancelledEntries = queueEntries.filter(e => e.status === "canceled");

  if (!queue && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Não há fila criada para hoje
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Gostaria de criar uma fila agora?
            </p>
          </div>

          {!creatingQueue ? (
            <div className="mt-6">
              <button
                onClick={() => setCreatingQueue(true)}
                style={{ backgroundColor: palette?.strong_color || "#111827" }}
                className="w-full px-4 py-3 rounded-lg text-white text-sm font-semibold hover:opacity-95 transition"
              >
                Criar fila
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Data</label>
                <input
                  type="date"
                  value={createQueueDate}
                  onChange={(e) => setCreateQueueDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Início</label>
                  <input
                    type="time"
                    value={createQueueStart}
                    onChange={(e) => setCreateQueueStart(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Fim</label>
                  <input
                    type="time"
                    value={createQueueEnd}
                    onChange={(e) => setCreateQueueEnd(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setCreatingQueue(false)}
                  className="w-full sm:flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateQueue}
                  disabled={createQueueLoading}
                  style={{ backgroundColor: palette?.strong_color || "#111827" }}
                  className="w-full sm:flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50"
                >
                  {createQueueLoading ? "Criando..." : "Confirmar criação"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 sm:p-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Gerenciamento de fila</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {formatDate(queue?.queue_date)} • {queue?.opens_at?.substring(0, 5)} - {queue?.closes_at?.substring(0, 5)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {wsConnected && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Conectado
            </span>
          )}
          <button
            onClick={handleOpenEditQueue}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
            title="Editar fila"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
            title="Compartilhar fila"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.589 12.581 10 11.596 10 10.5C10 8.015 8.507 6 6.5 6S3 8.015 3 10.5 4.507 15 6.5 15c1.083 0 2.118-.36 2.942-.999M15 12a3 3 0 11-6 0 3 3 0 016 0zm6-3a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            Compartilhar
          </button>
          <button
            onClick={handleToggleQueueStatus}
            className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold border transition ${
              queue?.status === "open"
                ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {queue?.status === "open" ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm2-10V7a4 4 0 118 0v4" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm8-10V7a4 4 0 00-8 0v4" />
              </svg>
            )}
            {queue?.status === "open" ? "Fechar fila" : "Abrir fila"}
          </button>
          <button
            onClick={handleCallNext}
            disabled={activeEntries.length === 0}
            style={{ backgroundColor: palette?.strong_color }}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2l2 5-2 1a11 11 0 005 5l1-2 5 2v2a2 2 0 01-2 2h-1C8.373 18 3 12.627 3 6V5z" />
            </svg>
            Chamar próximo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total na fila</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Atendidos</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Receita total</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">R$ {stats.totalRevenue?.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tempo médio</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.averageTimePerClient} min</p>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <h2 className="text-lg font-semibold text-slate-900">Fila ativa</h2>
            <span className="text-sm text-slate-500">{activeEntries.length} em espera</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Arraste para reordenar a prioridade</p>
        </div>

        {activeEntries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mt-4">Fila vazia</h3>
            <p className="text-sm text-slate-500 mt-1">Nenhum cliente aguardando atendimento</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="queue">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`divide-y divide-gray-100 ${
                    snapshot.isDraggingOver ? "bg-indigo-50" : ""
                  }`}
                >
                  {activeEntries.map((entry, index) => (
                    <Draggable key={entry.id} draggableId={String(entry.id)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-4 transition-all ${
                            snapshot.isDragging
                              ? "bg-slate-100 shadow-md ring-1 ring-slate-200"
                              : entry.status === "calling"
                              ? "bg-amber-50"
                              : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            {/* Drag Handle */}
                            <div className="flex-shrink-0 text-gray-400 cursor-grab active:cursor-grabbing">
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 8h16M4 16h16"
                                />
                              </svg>
                            </div>

                            {/* Position Badge */}
                            <div
                              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm ${
                                entry.status === "calling"
                                  ? "bg-amber-500 animate-pulse"
                                  : "bg-slate-900"
                              }`}
                            >
                              {entry.position}
                            </div>

                            {/* Client Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {entry.clients?.client_name}
                              </h3>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                                <span>Tel. {entry.clients?.client_phone}</span>
                                <span className="text-slate-300">•</span>
                                <span>Serviço: {entry.services?.name}</span>
                                <span className="text-slate-300">•</span>
                                <span>Profissional: {entry.employees?.name}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-emerald-600">
                                  R$ {entry.services?.price?.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleComplete(entry.id)}
                                className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition"
                                title="Completar"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleCancel(entry.id)}
                                className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition"
                                title="Cancelar"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setSelectedEntry(entry)}
                                className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                                title="Detalhes"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Completed & Cancelled */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <h3 className="font-semibold text-slate-900">Atendidos</h3>
              <span className="text-xs text-slate-500">{completedEntries.length}</span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {completedEntries.length === 0 ? (
              <p className="p-4 text-center text-slate-500 text-sm">Nenhum atendimento completo hoje</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {completedEntries.map((entry) => (
                  <div key={entry.id} className="p-4 text-sm">
                    <p className="font-medium text-slate-900">{entry.clients?.client_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {entry.services?.name} • R$ {entry.services?.price?.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cancelled */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              <h3 className="font-semibold text-slate-900">Cancelados</h3>
              <span className="text-xs text-slate-500">{cancelledEntries.length}</span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {cancelledEntries.length === 0 ? (
              <p className="p-4 text-center text-slate-500 text-sm">Nenhum cancelamento hoje</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {cancelledEntries.map((entry) => (
                  <div key={entry.id} className="p-4 text-sm">
                    <p className="font-medium text-slate-900">{entry.clients?.client_name}</p>
                    <p className="text-xs text-slate-500 mt-1">{entry.services?.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entry Details Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Detalhes do Cliente</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Nome</p>
                  <p className="font-semibold text-gray-900">{selectedEntry.clients?.client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Telefone</p>
                  <p className="font-semibold text-gray-900">{selectedEntry.clients?.client_phone}</p>
                </div>
                {selectedEntry.clients?.client_email && (
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">{selectedEntry.clients?.client_email}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Serviço</p>
                  <p className="font-semibold text-gray-900">{selectedEntry.services?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Profissional</p>
                  <p className="font-semibold text-gray-900">{selectedEntry.employees?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Valor</p>
                  <p className="font-semibold text-green-600 text-lg">
                    R$ {selectedEntry.services?.price?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duração</p>
                  <p className="font-semibold text-gray-900">{selectedEntry.services?.duration} minutos</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="mt-6 w-full px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal com QRCode */}
      <AnimatePresence>
        {showShareModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Compartilhar Fila</h2>
                <p className="text-sm text-gray-500 mt-2">
                  {formatDate(queue?.queue_date)} • {queue?.opens_at?.substring(0, 5)} - {queue?.closes_at?.substring(0, 5)}
                </p>
              </div>

              {/* QRCode */}
              <div className="flex justify-center mb-6 p-4 bg-white rounded-xl border-2 border-slate-100">
                <QRCodeCanvas
                  ref={qrCodeRef}
                  value={getQueueShareUrl()}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>

              {/* Link Input */}
              <div className="space-y-3 mb-6">
                <label className="text-sm font-semibold text-gray-700">Link da fila</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={getQueueShareUrl()}
                    readOnly
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-700 font-mono"
                  />
                  <button
                    onClick={() => handleCopyToClipboard(getQueueShareUrl())}
                    className="flex-shrink-0 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                    title="Copiar link"
                  >
                    <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full px-4 py-2 rounded-lg text-white font-semibold transition text-sm"
                style={{ backgroundColor: palette?.strong_color || "#111827" }}
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Queue Modal */}
      <AnimatePresence>
        {showEditQueue && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditQueue(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Fila</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Data</label>
                  <input
                    type="date"
                    value={editQueueDate}
                    onChange={(e) => setEditQueueDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-gray-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Início</label>
                    <input
                      type="time"
                      value={editQueueStart}
                      onChange={(e) => setEditQueueStart(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Fim</label>
                    <input
                      type="time"
                      value={editQueueEnd}
                      onChange={(e) => setEditQueueEnd(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-gray-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowEditQueue(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateQueue}
                  disabled={editQueueLoading}
                  style={{ backgroundColor: palette?.strong_color || "#111827" }}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {editQueueLoading ? "Atualizando..." : "Atualizar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
