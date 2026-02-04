"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";

export default function QueuePage({ slug }) {
  const router = useRouter();

  // Estado
  const [palette, setPalette] = useState(null);
  const [org, setOrg] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState(null);
  const [queueEntries, setQueueEntries] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [myQueueEntry, setMyQueueEntry] = useState(null);
  const [removingFromQueue, setRemovingFromQueue] = useState(false);
  const [publicToken, setPublicToken] = useState(null);

  // Estados para edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMyEntry, setEditingMyEntry] = useState(false);
  const [editServiceId, setEditServiceId] = useState(null);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [editServices, setEditServices] = useState([]);
  const [editEmployees, setEditEmployees] = useState([]);
  const [loadingEditServices, setLoadingEditServices] = useState(false);
  const [loadingEditEmployees, setLoadingEditEmployees] = useState(false);

  // Modal de Entrada
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [joinLoading, setJoinLoading] = useState(false);

  // Dados do formulário
  const [joinData, setJoinData] = useState({
    step: 1,
    category: null,
    service: null,
    employee: null,
    clientName: "",
    clientEmail: "",
    clientPhone: "",
  });

  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState({
    loading: false,
    valid: null,
    message: "",
    discount: null,
    discountType: null,
  });
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Calcular tempo estimado
  const calculateEstimatedTime = (position) => {
    if (!queueEntries.length) return 0;
    let totalMinutes = 0;
    for (let i = 0; i < position - 1; i++) {
      const entry = queueEntries[i];
      const serviceDuration = entry.services?.duration || 30;
      totalMinutes += serviceDuration;
    }
    return totalMinutes;
  };

  const getOriginalPrice = () => Number(joinData?.service?.price ?? 0);

  const getFinalPrice = () => {
    const original = getOriginalPrice();
    if (!couponStatus.valid || !couponStatus.discount) return original;
    if (couponStatus.discountType === "percentage" || couponStatus.discountType === "porcentagem") {
      return Math.max(0, original - (original * Number(couponStatus.discount)) / 100);
    }
    return Math.max(0, original - Number(couponStatus.discount));
  };

  const validateCoupon = async () => {
    if (!couponInput || !joinData.service?.id) {
      setCouponStatus({ loading: false, valid: false, message: "Informe um cupom e selecione um serviço", discount: null, discountType: null });
      return;
    }

    try {
      setCouponStatus((prev) => ({ ...prev, loading: true, message: "" }));
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/coupons/validate-coupon/${slug}?code=${encodeURIComponent(
          couponInput.trim()
        )}&serviceId=${joinData.service.id}`
      );
      const data = await res.json();

      if (!data?.valid) {
        setAppliedCoupon(null);
        setCouponStatus({ loading: false, valid: false, message: data?.message || "Cupom inválido", discount: null, discountType: null });
        return;
      }

      setAppliedCoupon(couponInput.trim().toUpperCase());
      setCouponStatus({
        loading: false,
        valid: true,
        message: data?.message || "Cupom aplicado",
        discount: data?.discount,
        discountType: data?.discountType,
      });
    } catch (err) {
      console.error("Erro ao validar cupom:", err);
      setAppliedCoupon(null);
      setCouponStatus({ loading: false, valid: false, message: "Erro ao validar cupom", discount: null, discountType: null });
    }
  };

  // Handler de mensagens WebSocket
  const handleWebSocketMessage = (data) => {
    console.log('📨 WebSocket:', data.type);

    if (data.type === "connection_established") {
      setWsConnected(true);
    } else if (data.type === "new_entry") {
      setQueueEntries((prev) => {
        const exists = prev.find(e => e.id === data.entry?.id);
        if (exists) return prev;
        const updated = [...prev, data.entry].sort((a, b) => a.position - b.position);
        return updated;
      });
    } else if (data.type === "client_called") {
      setQueueEntries((prev) =>
        prev.map((e) => (e.id === data.entryId ? { ...e, status: "calling" } : e))
      );
    } else if (data.type === "entry_completed") {
      setQueueEntries((prev) =>
        prev.filter((e) => e.id !== data.entryId)
      );
    } else if (data.type === "entry_canceled") {
      setQueueEntries((prev) =>
        prev.filter((e) => e.id !== data.entryId)
      );
    } else if (data.type === "entry_removed") {
      setQueueEntries((prev) => prev.filter((e) => e.id !== data.entryId));
    } else if (data.type === "queue_reordered") {
      setQueueEntries(data.entries || []);
    } else if (data.type === "queue_status_changed") {
      setQueueOpen(data.status === "open");
      setQueue((prev) => (prev ? { ...prev, status: data.status } : prev));
      if (data.status !== "open") {
        setShowJoinModal(false);
      }
    } else if (data.type === "entry_updated") {
      console.log('🔄 Entrada atualizada:', { entryId: data.entryId, entry: data.entry });
      setQueueEntries((prev) =>
        prev.map((e) =>
          e.id === data.entryId ? { ...e, ...data.entry } : e
        )
      );
      // Atualizar myQueueEntry se for a entrada do usuário
      if (myQueueEntry && myQueueEntry.id === data.entryId) {
        setMyQueueEntry({ ...myQueueEntry, ...data.entry });
      }
    }
  };

  // Hook WebSocket
  useEffect(() => {
    console.log('🔌 WebSocket Debug:', {
      slug,
      queue_id: queue?.queue_id,
      org_name: org?.name,
      org_slug: org?.slug_organization
    });
  }, [org, queue, slug]);

  const { isConnected: checkWsConnected } = useQueueWebSocket(
    slug,
    queue?.queue_id,
    handleWebSocketMessage
  );

  // ================================
  // 1️⃣ VERIFICAR AUTENTICAÇÃO
  // ================================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.authenticated && data.user) {
          setAuthenticated(true);
          setUser(data.user);
          setJoinData((prev) => ({
            ...prev,
            clientName: data.user.username || "",
            clientEmail: data.user.email || "",
            clientPhone: data.user.phone || "",
          }));
        } else {
          setAuthenticated(false);
        }
      } catch (e) {
        console.warn("Erro de autenticação:", e);
        setAuthenticated(false);
      }
    };
    checkAuth();
  }, [slug]);

  // ================================
  // 2️⃣ CARREGAR DADOS GERAIS
  // ================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgRes, colorRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
            credentials: "include",
          }),
        ]);

        if (orgRes.ok) setOrg(await orgRes.json());
        if (colorRes.ok) setPalette(await colorRes.json());
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        toast.error("Erro ao carregar dados da organização");
      }
    };
    fetchData();
  }, [slug]);

  // ================================
  // 3️⃣ CARREGAR FILA E CATEGORIAS
  // ================================
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setLoading(true);
        const [queueRes, categoriesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/today`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/appointments/categories/${slug}`),
        ]);

        if (queueRes.ok) {
          const queueData = await queueRes.json();
          setQueue(queueData);
          setQueueOpen(queueData.status === "open");
          setQueueEntries(queueData.queue_entries || []);
        }

        if (categoriesRes.ok) {
          const catData = await categoriesRes.json();
          setCategories(
            (catData || []).filter(
              (cat) => cat.name?.toLowerCase().trim() !== "serviços internos"
            )
          );
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
  // 4️⃣✨ CARREGAR TOKEN DO LOCALSTORAGE (PRIMEIRO)
  // ================================
  useEffect(() => {
    const storedToken = localStorage.getItem(`queue_token_${slug}`);
    if (storedToken) {
      setPublicToken(storedToken);
      console.log('🔑 Token carregado do localStorage:', storedToken);
    }
  }, [slug]);

  // ================================
  // 4️⃣ MONITORAR ENTRADA DO USUÁRIO (APENAS POR TOKEN)
  // ================================
  useEffect(() => {
    if (queueEntries.length === 0 || !publicToken) return;

    console.log('🔍 Procurando entrada por token...', {
      publicToken,
      queueEntriesCount: queueEntries.length
    });

    const myEntry = queueEntries.find(e => e.public_token === publicToken);
    
    if (myEntry) {
      console.log('✅ Entrada encontrada:', myEntry.id, 'Posição:', myEntry.position);
    } else {
      console.log('❌ Nenhuma entrada encontrada para este token');
    }

    setMyQueueEntry(myEntry || null);
  }, [queueEntries, publicToken]);

  // ================================
  // 4️⃣B SINCRONIZAR ENTRADA QUANDO FILA MUDA (WEBSOCKET)
  // ================================
  useEffect(() => {
    if (!publicToken || !myQueueEntry) return;
    
    // Se já encontramos uma entrada, verificar se ela ainda existe na fila com dados atualizados
    const updatedEntry = queueEntries.find(e => e.id === myQueueEntry.id);
    
    if (updatedEntry) {
      // Garantir que a entrada local sempre tem os dados mais recentes
      if (JSON.stringify(updatedEntry) !== JSON.stringify(myQueueEntry)) {
        console.log('🔄 Sincronizando entrada com dados do WebSocket:', {
          id: updatedEntry.id,
          positionBefore: myQueueEntry.position,
          positionAfter: updatedEntry.position
        });
        setMyQueueEntry(updatedEntry);
      }
    } else {
      // Se a entrada não existe mais, tentar encontrar por token novamente
      console.log('⚠️ Entrada não encontrada por ID, procurando por token');
      const entryByToken = queueEntries.find(e => e.public_token === publicToken);
      if (entryByToken && entryByToken.id !== myQueueEntry.id) {
        console.log('✅ Entrada encontrada com novo ID:', entryByToken.id);
        setMyQueueEntry(entryByToken);
      }
    }
  }, [queueEntries, myQueueEntry, publicToken]);

  // ================================
  // 5️⃣ CARREGAR SERVIÇOS
  // ================================
  const loadServices = async (categoryId) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/services/${categoryId}/${slug}`
      );
      const data = await res.json();
      setServices(data || []);
    } catch (err) {
      console.error("Erro ao carregar serviços:", err);
      toast.error("Erro ao carregar serviços");
    }
  };

  // ================================
  // 6️⃣ CARREGAR FUNCIONÁRIOS
  // ================================
  const loadEmployees = async (serviceId) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/employees/${serviceId}`
      );
      const data = await res.json();
      setEmployees((data || []).filter((e) => e.id));
    } catch (err) {
      console.error("Erro ao carregar funcionários:", err);
      toast.error("Erro ao carregar funcionários");
    }
  };

  // ================================
  // 7️⃣ ENTRAR NA FILA
  // ================================
  const handleJoinQueue = async () => {
    if (!queueOpen) {
      toast.warning("A fila está fechada para novas entradas");
      return;
    }

    if (!joinData.service || !joinData.employee || !joinData.clientName || !joinData.clientPhone) {
      toast.error("Preencha todos os dados obrigatórios");
      return;
    }

    try {
      setJoinLoading(true);

      const originalPrice = getOriginalPrice();
      const finalPrice = getFinalPrice();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: joinData.clientName,
          client_email: joinData.clientEmail || null,
          client_phone: joinData.clientPhone,
          service_id: joinData.service.id,
          employee_id: joinData.employee.id,
          coupon_code: appliedCoupon || null,
          original_price: originalPrice,
          final_price: finalPrice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao entrar na fila");
        return;
      }

      // 🔑 Armazenar public_token no localStorage
      if (data.public_token) {
        localStorage.setItem(`queue_token_${slug}`, data.public_token);
        setPublicToken(data.public_token);
        console.log('🔑 Token salvo no localStorage:', data.public_token);
      }

      toast.success(
        `Você está na posição ${data.position}! Serviço: ${joinData.service.name} - R$ ${joinData.service.price?.toFixed(2)}`,
        { autoClose: 5000 }
      );
      
      // Atualizar fila imediatamente após entrar
      try {
        const queueRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/entries/${queue.queue_id}`,
          { cache: 'no-store' }
        );
        if (queueRes.ok) {
          const entries = await queueRes.json();
          setQueueEntries(entries);
          if (authenticated && user?.client_id) {
            const myEntry = entries.find(e => e.client_id === user.client_id);
            setMyQueueEntry(myEntry || null);
          }
          console.log('✅ Fila atualizada imediatamente após entrada');
        }
      } catch (err) {
        console.error('Erro ao atualizar fila:', err);
      }
      
      setShowJoinModal(false);
      setJoinData({
        step: 1,
        category: null,
        service: null,
        employee: null,
        clientName: authenticated ? user?.username || "" : "",
        clientEmail: authenticated ? user?.email || "" : "",
        clientPhone: authenticated ? user?.phone || "" : "",
      });
    } catch (err) {
      console.error("Erro ao entrar na fila:", err);
      toast.error("Erro ao entrar na fila");
    } finally {
      setJoinLoading(false);
    }
  };

  // ================================
  // COMPONENTE OTIMIZADO: Item da Fila
  // ================================
  const QueueItem = React.memo(({ entry, idx, isMyEntry }) => {
    const estimatedTime = calculateEstimatedTime(entry.position);
    const estimatedMinutes = Math.max(0, estimatedTime);

    return (
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05 }}
        className={`p-4 sm:p-6 transition-all border-l-4 ${
          entry.status === "calling"
            ? "border-l-amber-500 bg-amber-50/50"
            : entry.status === "completed"
            ? "border-l-green-500 bg-green-50/30 opacity-60"
            : isMyEntry
            ? "border-l-purple-500 bg-purple-50/30"
            : "border-l-indigo-500 bg-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          {/* Position Badge */}
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${
              entry.status === "calling"
                ? "bg-gradient-to-br from-amber-500 to-orange-600 animate-pulse"
                : "bg-gradient-to-br"
            }`}
            style={
              entry.status === "calling"
                ? undefined
                : {
                    background: isMyEntry
                      ? `linear-gradient(135deg, ${palette?.strong_color}99 0%, ${palette?.strong_color}dd 100%)`
                      : palette?.strong_color,
                  }
            }
          >
            {entry.position}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                {entry.clients?.client_name}
              </h3>
              {isMyEntry && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  Você
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1 truncate">
                <span>🔧</span>
                <span className="truncate">{entry.services?.name}</span>
              </span>
              <span className="hidden sm:flex">•</span>
              <span className="flex items-center gap-1 truncate">
                <span>👤</span>
                <span className="truncate">{entry.employees?.name}</span>
              </span>
            </div>
          </div>

          {/* Status & Time */}
          <div className="flex flex-col sm:flex-col sm:items-end gap-3">
            <div>
              {entry.status === "calling" ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-amber-100 text-amber-700">
                  <span>📞</span> Sendo Atendido
                </span>
              ) : entry.status === "completed" ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-green-100 text-green-700">
                  <span>✅</span> Atendido
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-700">
                  <span>⏳</span> Aguardando
                </span>
              )}
            </div>
            
            {entry.status === "confirmed" && estimatedMinutes > 0 && (
              <div className="text-xs text-gray-600 text-center sm:text-right">
                <p className="font-medium text-gray-900">
                  {estimatedMinutes > 0 ? `≈ ${estimatedMinutes} min` : "Próximo"}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  });

  // ================================
  // 8️⃣ SAIR DA FILA
  // ================================
  const handleLeaveQueue = async () => {
    // Priorizar uso do token público
    const token = publicToken || localStorage.getItem(`queue_token_${slug}`);
    
    console.log('🚪 Tentando sair da fila...', {
      token,
      myQueueEntry: myQueueEntry?.id,
      queueId: queue?.queue_id
    });
    
    if (!token && (!myQueueEntry || !queue?.queue_id)) {
      toast.error('😕 Não foi possível identificar sua entrada na fila');
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja sair da fila? ${myQueueEntry ? `Você está na posição ${myQueueEntry.position}.` : ''}`
    );

    if (!confirmed) return;

    try {
      setRemovingFromQueue(true);
      
      let res;
      // Se tiver token, usar endpoint público
      if (token) {
        console.log('❌ Saindo da fila com token público:', token);
        res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/queues/public/${token}/leave`,
          { method: "DELETE" }
        );
      } else {
        // Fallback para endpoint antigo (autenticado)
        console.log('❌ Saindo da fila (método antigo):', myQueueEntry.id);
        res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/queues/${slug}/${queue.queue_id}/${myQueueEntry.id}`,
          { method: 'DELETE' }
        );
      }

      console.log('📬 Resposta ao sair:', { status: res.status, ok: res.ok });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao sair da fila');
      }

      // Limpar token do localStorage
      localStorage.removeItem(`queue_token_${slug}`);
      setPublicToken(null);
      setMyQueueEntry(null);

      console.log('✅ Saída bem-sucedida');
      toast.success('✅ Você saiu da fila', { autoClose: 3000 });
    } catch (err) {
      console.error('❌ Erro ao sair da fila:', err);
      toast.error(err.message || '😕 Erro ao sair da fila');
    } finally {
      setRemovingFromQueue(false);
    }
  };

  // ================================
  // 🆕 EDITAR MINHA ENTRADA
  // ================================
  const handleOpenEditMyEntry = async () => {
    if (!myQueueEntry) {
      toast.error('Você não está na fila');
      return;
    }

    setEditServiceId(myQueueEntry.service_id);
    setEditEmployeeId(myQueueEntry.employee_id);
    setShowEditModal(true);

    // Carregar funcionários disponíveis para o serviço atual
    if (myQueueEntry.service_id) {
      try {
        setLoadingEditEmployees(true);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/employees/${myQueueEntry.service_id}/${slug}`
        );
        if (res.ok) {
          const data = await res.json();
          setEditEmployees(data);
        }
      } catch (err) {
        console.error('Erro ao carregar funcionários:', err);
      } finally {
        setLoadingEditEmployees(false);
      }
    }
  };

  const loadEditServicesForCategory = async (categoryId) => {
    try {
      setLoadingEditServices(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/services/${categoryId}/${slug}`
      );
      if (res.ok) {
        const data = await res.json();
        setEditServices(data);
      }
    } catch (err) {
      console.error('Erro ao carregar serviços:', err);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoadingEditServices(false);
    }
  };

  const loadEditEmployeesForService = async (serviceId) => {
    try {
      setLoadingEditEmployees(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/employees/${serviceId}/${slug}`
      );
      if (res.ok) {
        const data = await res.json();
        setEditEmployees(data);
      }
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoadingEditEmployees(false);
    }
  };

  const handleUpdateMyEntry = async () => {
    const token = publicToken || localStorage.getItem(`queue_token_${slug}`);
    
    console.log('📝 Tentando atualizar entrada...', {
      token,
      editServiceId,
      editEmployeeId,
      myQueueEntry: myQueueEntry?.id
    });
    
    if (!token) {
      toast.error('Token não encontrado. Não é possível atualizar.');
      return;
    }

    if (!editServiceId || !editEmployeeId) {
      toast.error('Selecione um serviço e um profissional');
      return;
    }

    try {
      setEditingMyEntry(true);
      console.log('🚀 Enviando requisição de atualização...', {
        url: `${process.env.NEXT_PUBLIC_API_URL}/api/queues/public/${token}/update`,
        body: { service_id: editServiceId, employee_id: editEmployeeId }
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queues/public/${token}/update`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: editServiceId,
            employee_id: editEmployeeId,
          }),
        }
      );

      console.log('📬 Resposta recebida:', { status: res.status, ok: res.ok });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('❌ Erro na resposta:', errData);
        throw new Error(errData.error || 'Erro ao atualizar');
      }

      const data = await res.json();
      console.log('✅ Atualização bem-sucedida:', data);

      toast.success('✅ Atendimento atualizado!', { autoClose: 2000 });
      setShowEditModal(false);
      setEditServiceId(null);
      setEditEmployeeId(null);
      setEditServices([]);
      setEditEmployees([]);
    } catch (err) {
      console.error('❌ Erro ao atualizar:', err);
      toast.error(err.message || 'Erro ao atualizar atendimento');
    } finally {
      setEditingMyEntry(false);
    }
  };

  // ================================
  // ================================
  // MODAL: Entrar na Fila
  // ================================
  const renderJoinQueueModal = () => {
    if (!showJoinModal) return null;

    return (
      <AnimatePresence>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="bg-gradient-to-br from-white to-gray-50 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 border border-gray-100"
        >
          {/* Progress Bar */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step <= joinData.step
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Categoria */}
            {joinData.step === 1 && (
              <motion.div 
                key="step1" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Escolha uma Categoria</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setJoinData((prev) => ({ ...prev, category: cat }));
                        loadServices(cat.id);
                        setJoinData((prev) => ({ ...prev, step: 2 }));
                      }}
                      className="p-3 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-center"
                    >
                      <img
                        src={cat.imagem_category || "/placeholder.png"}
                        alt={cat.name}
                        className="w-10 h-10 rounded-full mx-auto mb-2 object-cover"
                      />
                      <p className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-2">{cat.name}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Serviço */}
            {joinData.step === 2 && (
              <motion.div 
                key="step2" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Escolha o Serviço</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {services.map((srv) => (
                    <button
                      key={srv.id}
                      onClick={() => {
                        setJoinData((prev) => ({ ...prev, service: srv }));
                        loadEmployees(srv.id);
                        setCouponInput("");
                        setAppliedCoupon(null);
                        setCouponStatus({ loading: false, valid: null, message: "", discount: null, discountType: null });
                        setJoinData((prev) => ({ ...prev, step: 3 }));
                      }}
                      className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={srv.imagem_service || "/placeholder.png"}
                          alt={srv.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{srv.name}</p>
                          <div className="flex gap-2 items-center text-xs sm:text-sm text-gray-500">
                            <p>R$ {srv.price?.toFixed(2)}</p>
                            {srv.duration && <p>• {srv.duration}min</p>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Funcionário */}
            {joinData.step === 3 && (
              <motion.div 
                key="step3" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Escolha o Profissional</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setJoinData((prev) => ({ ...prev, employee: emp, step: 4 }));
                      }}
                      className="p-3 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-center"
                    >
                      <img
                        src={emp.imagem_funcionario || "/placeholder.png"}
                        alt={emp.name}
                        className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
                      />
                      <p className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-2">{emp.name}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirmação */}
            {joinData.step === 4 && (
              <motion.div 
                key="step4" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Confirme os Dados</h2>
                <div className="space-y-3 mb-6">
                  <div>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={joinData.clientName}
                      onChange={(e) => setJoinData((prev) => ({ ...prev, clientName: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    {authenticated && <p className="text-xs text-gray-500 mt-1">✓ Dados preenchidos automaticamente (editável)</p>}
                  </div>
                  <input
                    type="email"
                    placeholder="E-mail (opcional)"
                    value={joinData.clientEmail}
                    onChange={(e) => setJoinData((prev) => ({ ...prev, clientEmail: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />
                  <input
                    type="tel"
                    placeholder="Telefone (obrigatório)"
                    value={joinData.clientPhone}
                    onChange={(e) => setJoinData((prev) => ({ ...prev, clientPhone: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />

                  {/* Cupom */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">Cupom de desconto (opcional)</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Digite o cupom"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />
                      <button
                        onClick={validateCoupon}
                        disabled={couponStatus.loading || !couponInput}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                      >
                        {couponStatus.loading ? "Validando..." : "Aplicar"}
                      </button>
                    </div>
                    {couponStatus.message && (
                      <p className={`text-xs ${couponStatus.valid ? "text-emerald-600" : "text-rose-600"}`}>
                        {couponStatus.message}
                      </p>
                    )}
                  </div>

                  {/* Resumo */}
                  <div className="bg-gray-100 rounded-lg p-4 space-y-2 text-sm">
                    <p className="text-gray-600">
                      <strong>Categoria:</strong> {joinData.category?.name}
                    </p>
                    <p className="text-gray-600">
                      <strong>Serviço:</strong> {joinData.service?.name}
                    </p>
                    <p className="text-gray-600">
                      <strong>Profissional:</strong> {joinData.employee?.name}
                    </p>
                    <div className="text-gray-600">
                      <strong>Valor:</strong>{" "}
                      {couponStatus.valid ? (
                        <span>
                          <span className="line-through text-gray-400 mr-2">
                            R$ {getOriginalPrice().toFixed(2)}
                          </span>
                          <span className="font-semibold text-emerald-600">
                            R$ {getFinalPrice().toFixed(2)}
                          </span>
                        </span>
                      ) : (
                        <span>R$ {getOriginalPrice().toFixed(2)}</span>
                      )}
                    </div>
                    {joinData.service?.duration && (
                      <p className="text-gray-600">
                        <strong>Duração:</strong> {joinData.service?.duration} min
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setJoinData((prev) => ({ ...prev, step: 3 }))}
                    className="w-full sm:flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleJoinQueue}
                    disabled={joinLoading}
                    className="w-full sm:flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg transition disabled:opacity-50"
                  >
                    {joinLoading ? "Entrando..." : "Entrar na Fila"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close Button */}
          <button
            onClick={() => {
              setShowJoinModal(false);
              setJoinData((prev) => ({ ...prev, step: 1 }));
              setCouponInput("");
              setAppliedCoupon(null);
              setCouponStatus({ loading: false, valid: null, message: "", discount: null, discountType: null });
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </motion.div>
      </div>
      </AnimatePresence>
    );
  };

  // ================================
  // RENDER
  // ================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando fila...</p>
        </div>
      </div>
    );
  }

  if (!queue) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-100 max-w-md">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Fila não encontrada</h1>
          <p className="text-gray-600 mb-6">Não há fila aberta no momento para esta organização.</p>
          <button
            onClick={() => router.push(`/${slug}`)}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg border-b border-white/20 bg-white/80 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push(`/${slug}`)}
              className="text-gray-400 hover:text-gray-600 transition text-lg"
            >
              ←
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">{org?.name}</h1>
              <p className="text-xs sm:text-sm text-gray-500">Fila em Tempo Real</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            {wsConnected && (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
                Conectado
              </span>
            )}

            {!queueOpen && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                Fila Fechada
              </span>
            )}
            
            {/* Se estiver na fila, mostrar botões de ação */}
            {myQueueEntry ? (
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <span className="text-xs sm:text-sm text-gray-700 bg-indigo-50 px-3 py-1 rounded-full font-medium">
                  Posição: {myQueueEntry.position}
                </span>
                <button
                  onClick={handleOpenEditMyEntry}
                  style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-all"
                >
                  Editar
                </button>
                <button
                  onClick={handleLeaveQueue}
                  disabled={removingFromQueue}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {removingFromQueue ? 'Saindo...' : 'Sair'}
                </button>
              </div>
            ) : queueOpen ? (
              <button
                onClick={() => setShowJoinModal(true)}
                style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-white font-semibold text-sm sm:text-base hover:shadow-lg transition-all"
              >
                + Entrar
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {!queueOpen && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            A fila está fechada para novas entradas, mas os atendimentos em andamento continuam.
          </div>
        )}
        {/* Queue List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Fila Atual</h2>
            <p className="text-sm text-gray-600 mt-1">
              Atendimento de {queue?.opens_at?.substring(0, 5)} até {queue?.closes_at?.substring(0, 5)}
            </p>
          </div>

          {(() => {
            const activeEntries = queueEntries.filter(e => e.status !== "completed" && e.status !== "canceled");
            return activeEntries.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Fila Vazia!</h3>
                <p className="text-gray-600 text-sm sm:text-base">Seja o primeiro a entrar na fila e evite esperar!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeEntries.map((entry, idx) => (
                  <QueueItem 
                    key={entry.id} 
                    entry={entry} 
                    idx={idx} 
                    isMyEntry={myQueueEntry?.id === entry.id}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      </main>

      {/* Modal de Entrar na Fila */}
      {renderJoinQueueModal()}

      {/* Modal de Editar Minha Entrada */}
      <AnimatePresence>
        {showEditModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowEditModal(false);
              setEditServiceId(null);
              setEditEmployeeId(null);
              setEditServices([]);
              setEditEmployees([]);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Atendimento</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-700 mb-4">
                    Você está na <span className="font-bold">posição {myQueueEntry?.position}</span>
                  </p>
                </div>

                {/* Categoria */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">Categoria</label>
                  <select
                    onChange={(e) => {
                      const categoryId = e.target.value;
                      if (categoryId) {
                        loadEditServicesForCategory(categoryId);
                        setEditServiceId(null);
                        setEditEmployeeId(null);
                        setEditEmployees([]);
                      }
                    }}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Serviço */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">Serviço</label>
                  <select
                    value={editServiceId || ""}
                    onChange={(e) => {
                      const serviceId = e.target.value;
                      setEditServiceId(serviceId);
                      if (serviceId) {
                        loadEditEmployeesForService(serviceId);
                        setEditEmployeeId(null);
                      }
                    }}
                    disabled={loadingEditServices || editServices.length === 0}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm disabled:bg-gray-100"
                  >
                    <option value="">
                      {loadingEditServices ? "Carregando..." : editServices.length === 0 ? "Selecione uma categoria primeiro" : "Selecione um serviço"}
                    </option>
                    {editServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - R$ {service.price?.toFixed(2)} ({service.duration}min)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Funcionário */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">Profissional</label>
                  <select
                    value={editEmployeeId || ""}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    disabled={loadingEditEmployees || editEmployees.length === 0}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm disabled:bg-gray-100"
                  >
                    <option value="">
                      {loadingEditEmployees ? "Carregando..." : editEmployees.length === 0 ? "Selecione um serviço primeiro" : "Selecione um profissional"}
                    </option>
                    {editEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={handleUpdateMyEntry}
                  disabled={!editServiceId || !editEmployeeId || editingMyEntry}
                  style={{ backgroundColor: palette?.strong_color || "#4f46e5" }}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingMyEntry ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditServiceId(null);
                    setEditEmployeeId(null);
                    setEditServices([]);
                    setEditEmployees([]);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
