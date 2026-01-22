"use client";
import React, { useEffect, useState, useRef } from "react";
import { ChevronDown, Search, TrendingUp, Users, DollarSign, ShoppingBag, X } from "lucide-react";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { toast } from "react-toastify";

export default function ClientsTab({ org }) {
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
      ? clientsData.sort((a, b) => b.appointmentCount - a.appointmentCount)[0]
      : null,
    totalRevenue: clientsData.reduce((sum, c) => sum + c.totalRevenue, 0),
  };

  const strong = palette?.strong_color || "#5E3BEE";
  const light = palette?.light_color || "#F5F5F5";

  return (
    <div className="space-y-6">
      {/* ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Clientes */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total de Clientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: light }}>
              <Users size={24} style={{ color: strong }} />
            </div>
          </div>
        </div>

        {/* Cliente com Mais Agendamentos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Cliente TOP</p>
              <p className="text-lg font-bold text-gray-900 mt-2 truncate">
                {stats.topClient ? stats.topClient.client_name : "-"}
              </p>
              {stats.topClient && (
                <p className="text-xs text-gray-500 mt-1">
                  {stats.topClient.appointmentCount} agendamentos
                </p>
              )}
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: light }}>
              <TrendingUp size={24} style={{ color: strong }} />
            </div>
          </div>
        </div>

        {/* Receita Total */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                R$ {stats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: light }}>
              <DollarSign size={24} style={{ color: strong }} />
            </div>
          </div>
        </div>

        {/* Média por Cliente */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Receita Média</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                R$ {(stats.totalClients > 0 ? stats.totalRevenue / stats.totalClients : 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: light }}>
              <ShoppingBag size={24} style={{ color: strong }} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              style={{ focusColor: strong }}
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
            className="px-4 py-2 border rounded-lg focus:outline-none"
            style={{ borderColor: "#E5E7EB" }}
          >
            <option value="appointments">Mais Agendamentos</option>
            <option value="revenue">Maior Receita</option>
            <option value="name">Nome (A-Z)</option>
          </select>
        </div>
      </div>

      {/* TABELA DE CLIENTES */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando clientes...</div>
        ) : paginatedClients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum cliente encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: light }}>
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Cliente</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Agendamentos</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Receita</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Serviço TOP</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedClients.map((client) => (
                  <React.Fragment key={client.client_id}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedClientDetail(client)}
                          className="text-left hover:opacity-70 transition"
                        >
                          <div>
                            <p className="font-semibold text-gray-900 hover:underline cursor-pointer" style={{ color: strong }}>
                              {client.client_name}
                            </p>
                            {client.client_email && (
                              <p className="text-xs text-gray-500">{client.client_email}</p>
                            )}
                            {client.client_phone && (
                              <p className="text-xs text-gray-500">{client.client_phone}</p>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-3 py-1 rounded-full text-white text-sm font-medium"
                          style={{ backgroundColor: strong }}
                        >
                          {client.appointmentCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        R$ {client.totalRevenue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {client.topService !== "-" ? (
                          <div>
                            <p className="text-sm">{client.topService}</p>
                            <p className="text-xs text-gray-500">{client.topServiceCount}x</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            setExpandedClient(
                              expandedClient === client.client_id ? null : client.client_id
                            )
                          }
                          className="p-2 rounded-lg hover:bg-gray-200 transition"
                        >
                          <ChevronDown
                            size={18}
                            className={`transition-transform ${
                              expandedClient === client.client_id ? "rotate-180" : ""
                            }`}
                            style={{ color: strong }}
                          />
                        </button>
                      </td>
                    </tr>

                    {/* HISTÓRICO EXPANDIDO */}
                    {expandedClient === client.client_id && (
                      <tr className="bg-gray-50 border-t">
                        <td colSpan="5" className="px-6 py-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900">
                              Histórico de Agendamentos
                            </h4>
                            <div className="max-h-64 overflow-y-auto space-y-2">
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
                                      className="p-3 bg-white rounded-lg border border-gray-200"
                                    >
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div>
                                          <p className="font-medium text-gray-900">
                                            {apt.services?.name || "Serviço"}
                                          </p>
                                          <p className="text-sm text-gray-500">
                                            {formattedDate} às {apt.start_time}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                                              apt.status === "confirmed"
                                                ? "bg-green-500"
                                                : apt.status === "pending"
                                                ? "bg-yellow-500"
                                                : "bg-red-500"
                                            }`}
                                          >
                                            {apt.status === "confirmed"
                                              ? "Confirmado"
                                              : apt.status === "pending"
                                              ? "Pendente"
                                              : "Cancelado"}
                                          </span>
                                          <p className="font-semibold text-gray-900">
                                            R$ {apt.final_price.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    );
                                  })
                              ) : (
                                <p className="text-gray-500 text-sm">Nenhum agendamento</p>
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

        {/* PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES DO CLIENTE */}
      {selectedClientDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* HEADER DO MODAL */}
            <div 
              className="sticky top-0 flex items-center justify-between p-6 border-b"
              style={{ backgroundColor: light }}
            >
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Cliente</h2>
              <button
                onClick={() => setSelectedClientDetail(null)}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <X size={24} style={{ color: strong }} />
              </button>
            </div>

            {/* CONTEÚDO DO MODAL */}
            <div className="p-6 space-y-6">
              {/* INFORMAÇÕES GERAIS */}
              <div className="bg-gray-50 p-6 rounded-lg border">
                <h3 className="font-bold text-gray-900 mb-4" style={{ color: strong }}>
                  Informações Gerais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Nome</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {selectedClientDetail.client_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Email</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {selectedClientDetail.client_email || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Telefone</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {selectedClientDetail.client_phone || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Cadastrado em</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {new Date(selectedClientDetail.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>

              {/* OBSERVAÇÕES */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="font-bold text-gray-900 mb-4" style={{ color: strong }}>
                  Observações
                </h3>
                <div className="space-y-3">
                  <textarea
                    value={observationDraft}
                    onChange={(e) => setObservationDraft(e.target.value)}
                    className="w-full min-h-[120px] p-3 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: light, focusColor: strong }}
                    placeholder="Adicione ou edite observações do cliente..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setObservationDraft(selectedClientDetail.client_observation || "")}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
                      disabled={savingObservation}
                    >
                      Desfazer
                    </button>
                    <button
                      onClick={handleSaveObservation}
                      style={{ backgroundColor: strong, color: "white" }}
                      className="px-4 py-2 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-60"
                      disabled={savingObservation}
                    >
                      {savingObservation ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* ESTATÍSTICAS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 font-medium">Total de Agendamentos</p>
                  <p 
                    className="text-3xl font-bold mt-2"
                    style={{ color: strong }}
                  >
                    {selectedClientDetail.appointmentCount}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 font-medium">Receita Total</p>
                  <p 
                    className="text-3xl font-bold mt-2"
                    style={{ color: strong }}
                  >
                    R$ {selectedClientDetail.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 font-medium">Serviço Favorito</p>
                  <p 
                    className="text-lg font-bold mt-2 truncate"
                    style={{ color: strong }}
                  >
                    {selectedClientDetail.topService !== "-" 
                      ? `${selectedClientDetail.topService} (${selectedClientDetail.topServiceCount}x)`
                      : "-"
                    }
                  </p>
                </div>
              </div>

              {/* HISTÓRICO COMPLETO */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4" style={{ color: strong }}>
                  Histórico de Agendamentos
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedClientDetail.appointments && selectedClientDetail.appointments.length > 0 ? (
                    selectedClientDetail.appointments
                      .sort((a, b) =>
                        new Date(b.appointment_date) - new Date(a.appointment_date)
                      )
                      .map((apt, idx) => {
                        const formattedDate = new Date(apt.appointment_date).toLocaleDateString("pt-BR");
                        const statusColors = {
                          confirmed: "bg-green-100 text-green-800 border-green-300",
                          pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
                          cancelled: "bg-red-100 text-red-800 border-red-300",
                        };
                        return (
                          <div
                            key={idx}
                            className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {apt.services?.name || "Serviço"}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  📅 {formattedDate} às {apt.start_time} - {apt.end_time}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                    statusColors[apt.status] || statusColors.pending
                                  }`}
                                >
                                  {apt.status === "confirmed"
                                    ? "✅ Confirmado"
                                    : apt.status === "pending"
                                    ? "⏳ Pendente"
                                    : "❌ Cancelado"}
                                </span>
                                <p className="font-bold text-gray-900 whitespace-nowrap">
                                  R$ {apt.final_price?.toFixed(2) || "0.00"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                      Nenhum agendamento registrado
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER DO MODAL */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setSelectedClientDetail(null)}
                style={{ backgroundColor: strong, color: "white" }}
                className="px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
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
