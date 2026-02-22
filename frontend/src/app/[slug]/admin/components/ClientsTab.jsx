"use client";
import React, { useEffect, useState, useRef } from "react";
import { 
  ChevronDown, 
  Search, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingBag, 
  X,
  Star,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  Eye
} from "lucide-react";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { toast } from "react-toastify";
import TrialExpiredModal from "./TrialExpireModal";

export default function ClientsTab({ org, setActiveTab }) {
  const { palette } = useOrganizationColors(org.slug_organization);
  const cacheRef = useRef(null);
  const cacheTimestampRef = useRef(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const [clientsData, setClientsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("appointments");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedClient, setExpandedClient] = useState(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState(null);
  const [observationDraft, setObservationDraft] = useState("");
  const [savingObservation, setSavingObservation] = useState(false);
  const itemsPerPage = 10;

  const [showPaywall, setShowPaywall] = useState(false);

  // Carregar clientes da API
  async function loadClients() {
    const now = Date.now();
    
    // Se está em cache e ainda é válido, usar cache
    if (cacheRef.current && (now - cacheTimestampRef.current) < CACHE_DURATION) {
      setClientsData(cacheRef.current);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/clients/${org.slug_organization}`,
        { credentials: "include" }
      );

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      if (!res.ok) {
        const errorData = await res.text();
        console.error("Erro ao carregar clientes:", res.status, errorData);
        throw new Error(`Erro ao carregar clientes: ${res.status} ${errorData}`);
      }

      const data = await res.json();
      
      // Armazenar em cache
      cacheRef.current = data;
      cacheTimestampRef.current = now;
      
      setClientsData(data);
    } catch (err) {
      console.error("Erro completo ao carregar clientes:", err);
      setClientsData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, [org.slug_organization]);

  // Sincronizar rascunho de observação quando abre modal
  useEffect(() => {
    if (selectedClientDetail) {
      setObservationDraft(selectedClientDetail.client_observation || "");
    }
  }, [selectedClientDetail]);

  async function handleSaveObservation() {
    if (!selectedClientDetail) return;
    setSavingObservation(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/clients/${org.slug_organization}/${selectedClientDetail.client_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ client_observation: observationDraft }),
        }
      );

      if (!res.ok) {
        const errorData = await res.text();
        console.error("Erro ao salvar observação:", res.status, errorData);
        throw new Error(`Erro ao salvar observação: ${res.status} ${errorData}`);
      }

      const updated = await res.json();

      // Atualiza cliente no modal e na lista
      setSelectedClientDetail((prev) => ({ ...prev, client_observation: updated.client_observation }));
      setClientsData((prev) =>
        prev.map((c) =>
          c.client_id === updated.client_id
            ? { ...c, client_observation: updated.client_observation }
            : c
        )
      );
      toast.success('Observação atualizada');
    } catch (err) {
      console.error("Erro completo ao salvar observação:", err);
      toast.error('Atualização falhou');
    } finally {
      setSavingObservation(false);
    }
  }

  // Filtrar e ordenar clientes
  const filteredClients = clientsData
    .filter((c) =>
      c.client_name.toLowerCase().includes(search.toLowerCase()) ||
      c.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      c.client_phone?.includes(search)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "appointments":
          return b.appointmentCount - a.appointmentCount;
        case "revenue":
          return b.totalRevenue - a.totalRevenue;
        case "name":
          return a.client_name.localeCompare(b.client_name);
        default:
          return 0;
      }
    });

  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  // Estatísticas
  const stats = {
    totalClients: clientsData.length,
    topClient: clientsData.length > 0 
      ? [...clientsData].sort((a, b) => b.appointmentCount - a.appointmentCount)[0]
      : null,
    totalRevenue: clientsData.reduce((sum, c) => sum + c.totalRevenue, 0),
    avgRevenue: clientsData.length > 0 
      ? clientsData.reduce((sum, c) => sum + c.totalRevenue, 0) / clientsData.length 
      : 0,
  };

  const strong = palette?.strong_color || "#5E3BEE";
  const light = palette?.light_color || "#F5F5F5";
  const medium = palette?.medium_color || "#9F7FFF";

  return (
    <div className="space-y-6">

      <TrialExpiredModal
        open={showPaywall}
        org={org}
        setActiveTab={setActiveTab}
      />

      {/* CARDS DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Clientes */}
        <div 
          className="rounded-xl shadow-md border p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
          style={{ 
            background: `linear-gradient(135deg, ${strong}15 0%, ${light} 100%)`,
            borderColor: `${medium}30`
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Total de Clientes
              </p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                {stats.totalClients}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Cadastrados na plataforma
              </p>
            </div>
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: strong }}
            >
              <Users size={32} />
            </div>
          </div>
        </div>

        {/* Receita Total */}
        <div 
          className="rounded-xl shadow-md border p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
          style={{ 
            background: `linear-gradient(135deg, ${strong}15 0%, ${light} 100%)`,
            borderColor: `${medium}30`
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Receita Total
              </p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(stats.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Gerada pelos clientes
              </p>
            </div>
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: strong }}
            >
              <DollarSign size={32} />
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div 
          className="rounded-xl shadow-md border p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
          style={{ 
            background: `linear-gradient(135deg, ${strong}15 0%, ${light} 100%)`,
            borderColor: `${medium}30`
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Ticket Médio
              </p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(stats.avgRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Receita média por cliente
              </p>
            </div>
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: strong }}
            >
              <ShoppingBag size={32} />
            </div>
          </div>
        </div>

        {/* Cliente TOP */}
        <div 
          className="rounded-xl shadow-md border p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
          style={{ 
            background: `linear-gradient(135deg, ${strong}15 0%, ${light} 100%)`,
            borderColor: `${medium}30`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Cliente TOP
              </p>
              <p className="text-xl font-bold text-gray-900 mt-2 truncate" title={stats.topClient?.client_name}>
                {stats.topClient ? stats.topClient.client_name : "-"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.topClient ? `${stats.topClient.appointmentCount} agendamentos` : "Nenhum cliente"}
              </p>
            </div>
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
              style={{ backgroundColor: strong }}
            >
              <Star size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white p-6 rounded-xl shadow-md border">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{ 
                borderColor: '#E5E7EB',
                focusRingColor: strong 
              }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="px-6 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 font-medium transition-all cursor-pointer"
            style={{ 
              borderColor: '#E5E7EB',
              color: strong
            }}
          >
            <option value="appointments">📊 Mais Agendamentos</option>
            <option value="revenue">💰 Maior Receita</option>
            <option value="name">🔤 Nome (A-Z)</option>
          </select>
        </div>
      </div>

      {/* TABELA DE CLIENTES */}
      <div className="bg-white rounded-xl shadow-md border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-current" style={{ borderTopColor: strong }}></div>
            <p className="mt-4 text-gray-500 font-medium">Carregando clientes...</p>
          </div>
        ) : paginatedClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm text-gray-400 mt-2">Ajuste os filtros ou adicione novos clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: `${strong}10` }}>
                  <th className="px-6 py-4 text-left font-bold text-gray-700 uppercase text-xs tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-gray-700 uppercase text-xs tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-4 text-center font-bold text-gray-700 uppercase text-xs tracking-wider">
                    Agendamentos
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-gray-700 uppercase text-xs tracking-wider">
                    Receita Total
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-gray-700 uppercase text-xs tracking-wider">
                    Serviço Favorito
                  </th>
                  <th className="px-6 py-4 text-center font-bold text-gray-700 uppercase text-xs tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedClients.map((client) => (
                  <React.Fragment key={client.client_id}>
                    <tr className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-5">
                        <button
                          onClick={() => setSelectedClientDetail(client)}
                          className="text-left hover:opacity-80 transition-opacity group"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                              style={{ backgroundColor: strong }}
                            >
                              {client.client_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:underline text-base">
                                {client.client_name}
                              </p>
                              {client.lastAppointment && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <Calendar size={12} />
                                  Último: {new Date(client.lastAppointment).toLocaleDateString('pt-BR')}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          {client.client_email && (
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Mail size={14} className="text-gray-400" />
                              {client.client_email}
                            </p>
                          )}
                          {client.client_phone && (
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Phone size={14} className="text-gray-400" />
                              {client.client_phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span
                          className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-white text-lg font-bold shadow-md"
                          style={{ backgroundColor: strong }}
                        >
                          {client.appointmentCount}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-bold text-gray-900 text-lg">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(client.totalRevenue)}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        {client.topService !== "-" ? (
                          <div className="flex items-start gap-2">
                            <Star size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{client.topService}</p>
                              <p className="text-xs text-gray-500">{client.topServiceCount} vezes</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Nenhum serviço</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedClientDetail(client)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={20} style={{ color: strong }} />
                          </button>
                          <button
                            onClick={() =>
                              setExpandedClient(
                                expandedClient === client.client_id ? null : client.client_id
                              )
                            }
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Ver histórico"
                          >
                            <ChevronDown
                              size={20}
                              className={`transition-transform duration-200 ${
                                expandedClient === client.client_id ? "rotate-180" : ""
                              }`}
                              style={{ color: strong }}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* HISTÓRICO EXPANDIDO */}
                    {expandedClient === client.client_id && (
                      <tr style={{ backgroundColor: `${strong}05` }}>
                        <td colSpan="6" className="px-6 py-6">
                          <div className="bg-white rounded-xl p-6 shadow-sm border">
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <Calendar size={20} style={{ color: strong }} />
                              Histórico de Agendamentos
                            </h4>
                            <div className="max-h-80 overflow-y-auto space-y-3">
                              {client.appointments && client.appointments.length > 0 ? (
                                client.appointments
                                  .sort((a, b) =>
                                    new Date(b.appointment_date) - new Date(a.appointment_date)
                                  )
                                  .map((apt, idx) => {
                                    const formattedDate = new Date(apt.appointment_date).toLocaleDateString("pt-BR");
                                    return (
                                    <div
                                      key={idx}
                                      className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-all"
                                    >
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div className="flex-1">
                                          <p className="font-bold text-gray-900 mb-1">
                                            {apt.services?.name || "Serviço"}
                                          </p>
                                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                            <span className="flex items-center gap-1">
                                              <Calendar size={14} />
                                              {formattedDate}
                                            </span>
                                            <span>às {apt.start_time}</span>
                                            {apt.employees?.name && (
                                              <span className="text-gray-500">
                                                com {apt.employees.name}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span
                                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide ${
                                              apt.status === "confirmed"
                                                ? "bg-green-100 text-green-700"
                                                : apt.status === "pending"
                                                ? "bg-yellow-100 text-yellow-700"
                                                : "bg-red-100 text-red-700"
                                            }`}
                                          >
                                            {apt.status === "confirmed" ? "Confirmado" : apt.status === "pending" ? "Pendente" : "Cancelado"}
                                          </span>
                                          <p className="font-bold text-gray-900 text-lg">
                                            {new Intl.NumberFormat('pt-BR', {
                                              style: 'currency',
                                              currency: 'BRL'
                                            }).format(apt.services?.price || 0)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    );
                                  })
                              ) : (
                                <p className="text-center text-gray-500 py-4">Nenhum agendamento encontrado</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINAÇÃO */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-md border p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-600">
            Mostrando <span className="font-bold text-gray-900">{paginatedClients.length}</span> de{" "}
            <span className="font-bold text-gray-900">{filteredClients.length}</span> clientes
            <span className="text-gray-400 mx-2">•</span>
            Página <span className="font-bold" style={{ color: strong }}>{currentPage}</span> de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-6 py-2.5 border-2 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md"
              style={{ 
                borderColor: strong,
                color: strong,
                backgroundColor: currentPage === 1 ? 'transparent' : 'white'
              }}
            >
              ← Anterior
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-6 py-2.5 rounded-xl font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md"
              style={{ backgroundColor: strong }}
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DO CLIENTE */}
      {selectedClientDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            {/* HEADER DO MODAL */}
            <div 
              className="sticky top-0 flex items-center justify-between p-6 border-b-2 z-10"
              style={{ 
                background: `linear-gradient(135deg, ${strong}15 0%, ${light} 100%)`,
                borderColor: `${medium}30`
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md"
                  style={{ backgroundColor: strong }}
                >
                  {selectedClientDetail.client_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedClientDetail.client_name}
                  </h2>
                  <p className="text-sm text-gray-600">Detalhes do cliente</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientDetail(null)}
                className="p-3 hover:bg-white hover:bg-opacity-50 rounded-xl transition-all"
              >
                <X size={24} style={{ color: strong }} />
              </button>
            </div>

            {/* CONTEÚDO DO MODAL */}
            <div className="p-6 space-y-6">
              {/* CARDS DE ESTATÍSTICAS DO CLIENTE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className="p-5 rounded-xl border-2 shadow-md"
                  style={{ 
                    background: `linear-gradient(135deg, ${strong}10 0%, white 100%)`,
                    borderColor: `${medium}30`
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar size={20} style={{ color: strong }} />
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                      Agendamentos
                    </p>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">
                    {selectedClientDetail.appointmentCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total realizados</p>
                </div>

                <div 
                  className="p-5 rounded-xl border-2 shadow-md"
                  style={{ 
                    background: `linear-gradient(135deg, ${strong}10 0%, white 100%)`,
                    borderColor: `${medium}30`
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign size={20} style={{ color: strong }} />
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                      Receita Total
                    </p>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(selectedClientDetail.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Valor total gerado</p>
                </div>

                <div 
                  className="p-5 rounded-xl border-2 shadow-md"
                  style={{ 
                    background: `linear-gradient(135deg, ${strong}10 0%, white 100%)`,
                    borderColor: `${medium}30`
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Star size={20} style={{ color: strong }} />
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                      Favorito
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 truncate" title={selectedClientDetail.topService}>
                    {selectedClientDetail.topService !== "-" 
                      ? selectedClientDetail.topService
                      : "Nenhum"
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedClientDetail.topService !== "-" 
                      ? `${selectedClientDetail.topServiceCount} vezes`
                      : "Sem serviços"
                    }
                  </p>
                </div>
              </div>

              {/* INFORMAÇÕES DE CONTATO */}
              <div className="bg-white p-6 rounded-xl border-2 shadow-sm" style={{ borderColor: `${medium}20` }}>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <Users size={22} style={{ color: strong }} />
                  Informações de Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedClientDetail.client_email && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail size={18} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-medium">Email</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {selectedClientDetail.client_email}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedClientDetail.client_phone && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone size={18} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-medium">Telefone</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedClientDetail.client_phone}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar size={18} className="text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Cadastrado em</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(selectedClientDetail.created_at).toLocaleDateString("pt-BR", {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  {selectedClientDetail.lastAppointment && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar size={18} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-medium">Último Atendimento</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(selectedClientDetail.lastAppointment).toLocaleDateString("pt-BR", {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* OBSERVAÇÕES */}
              <div className="bg-white p-6 rounded-xl border-2 shadow-sm" style={{ borderColor: `${medium}20` }}>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <MessageSquare size={22} style={{ color: strong }} />
                  Observações
                </h3>
                <div className="space-y-3">
                  <textarea
                    value={observationDraft}
                    onChange={(e) => setObservationDraft(e.target.value)}
                    className="w-full min-h-[140px] p-4 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all resize-none"
                    style={{ 
                      borderColor: `${medium}30`,
                      focusRingColor: strong 
                    }}
                    placeholder="Adicione observações importantes sobre o cliente: preferências, restrições, histórico de atendimento, etc..."
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setObservationDraft(selectedClientDetail.client_observation || "")}
                      className="px-5 py-2.5 border-2 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                      style={{ borderColor: `${medium}50` }}
                      disabled={savingObservation}
                    >
                      ↺ Desfazer
                    </button>
                    <button
                      onClick={handleSaveObservation}
                      className="px-6 py-2.5 rounded-xl font-semibold text-white hover:opacity-90 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                      style={{ backgroundColor: strong }}
                      disabled={savingObservation}
                    >
                      {savingObservation ? "⏳ Salvando..." : "✓ Salvar Observação"}
                    </button>
                  </div>
                </div>
              </div>

              {/* HISTÓRICO DE AGENDAMENTOS */}
              <div className="bg-white p-6 rounded-xl border-2 shadow-sm" style={{ borderColor: `${medium}20` }}>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <Calendar size={22} style={{ color: strong }} />
                  Histórico de Agendamentos ({selectedClientDetail.appointments?.length || 0})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {selectedClientDetail.appointments && selectedClientDetail.appointments.length > 0 ? (
                    selectedClientDetail.appointments
                      .sort((a, b) =>
                        new Date(b.appointment_date) - new Date(a.appointment_date)
                      )
                      .map((apt, idx) => {
                        const formattedDate = new Date(apt.appointment_date).toLocaleDateString("pt-BR", {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        });
                        return (
                          <div
                            key={idx}
                            className="p-4 bg-gray-50 rounded-xl border hover:shadow-md transition-all"
                            style={{ borderColor: `${medium}20` }}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-bold text-gray-900 text-base mb-1">
                                  {apt.services?.name || "Serviço"}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    {formattedDate}
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <span>{apt.start_time} - {apt.end_time}</span>
                                  {apt.employees?.name && (
                                    <>
                                      <span className="text-gray-400">•</span>
                                      <span className="text-gray-500">
                                        {apt.employees.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide ${
                                    apt.status === "confirmed"
                                      ? "bg-green-100 text-green-700 border border-green-300"
                                      : apt.status === "pending"
                                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                      : "bg-red-100 text-red-700 border border-red-300"
                                  }`}
                                >
                                  {apt.status === "confirmed" ? "✓ Confirmado" : apt.status === "pending" ? "⏳ Pendente" : "✗ Cancelado"}
                                </span>
                                <p className="font-bold text-gray-900 text-lg whitespace-nowrap">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(apt.final_price || apt.services?.price || 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="p-8 bg-gray-50 rounded-xl text-center">
                      <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Nenhum agendamento registrado</p>
                      <p className="text-sm text-gray-400 mt-1">Este cliente ainda não realizou nenhum serviço</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER DO MODAL */}
            <div 
              className="p-6 border-t-2 flex justify-end gap-3"
              style={{ 
                backgroundColor: `${strong}05`,
                borderColor: `${medium}20`
              }}
            >
              <button
                onClick={() => setSelectedClientDetail(null)}
                className="px-8 py-3 rounded-xl font-bold text-white hover:opacity-90 transition-all shadow-md hover:shadow-lg"
                style={{ backgroundColor: strong }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
