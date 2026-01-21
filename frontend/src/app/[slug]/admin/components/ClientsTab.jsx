"use client";
import React, { useEffect, useState, useRef } from "react";
import { ChevronDown, Search, TrendingUp, Users, DollarSign, ShoppingBag } from "lucide-react";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

export default function ClientsTab({ org }) {
  const { palette } = useOrganizationColors(org.slug_organization);
  const cacheRef = useRef(null);
  const cacheTimestampRef = useRef(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const [allAppointments, setAllAppointments] = useState([]);
  const [clientsData, setClientsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("appointments");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedClient, setExpandedClient] = useState(null);
  const itemsPerPage = 10;

  // Carregar agendamentos com cache
  async function loadAppointments() {
    const now = Date.now();
    
    // Se está em cache e ainda é válido, usar cache
    if (cacheRef.current && (now - cacheTimestampRef.current) < CACHE_DURATION) {
      processAppointments(cacheRef.current);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}`,
        { credentials: "include" }
      );
      const data = await res.json();
      
      // Armazenar em cache
      cacheRef.current = data;
      cacheTimestampRef.current = now;
      
      processAppointments(data);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  }

  function processAppointments(appointments) {
    setAllAppointments(appointments);
    
    // Agrupar por cliente
    const groupedClients = {};
    
    appointments.forEach((apt) => {
      const email = apt.client_email;
      if (!email) return;
      
      if (!groupedClients[email]) {
        groupedClients[email] = {
          email,
          name: apt.client_name,
          phone: apt.client_phone,
          appointments: [],
          totalRevenue: 0,
        };
      }
      
      groupedClients[email].appointments.push(apt);
      groupedClients[email].totalRevenue += apt.final_price || 0;
    });

    // Converter para array e calcular estatísticas
    const clientsArray = Object.values(groupedClients).map((client) => {
      const services = {};
      client.appointments.forEach((apt) => {
        const serviceName = apt.service_name || "Serviço";
        services[serviceName] = (services[serviceName] || 0) + 1;
      });

      const topService = Object.entries(services).sort(([, a], [, b]) => b - a)[0];

      return {
        ...client,
        appointmentCount: client.appointments.length,
        topService: topService ? topService[0] : "-",
        topServiceCount: topService ? topService[1] : 0,
        lastAppointment: client.appointments.sort((a, b) => new Date(b.date) - new Date(a.date))[0],
      };
    });

    setClientsData(clientsArray);
  }

  useEffect(() => {
    loadAppointments();
  }, [org.slug_organization]);

  // Filtrar e ordenar clientes
  const filteredClients = clientsData
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "appointments":
          return b.appointmentCount - a.appointmentCount;
        case "revenue":
          return b.totalRevenue - a.totalRevenue;
        case "name":
          return a.name.localeCompare(b.name);
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
                {stats.topClient ? stats.topClient.name : "-"}
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
                  <React.Fragment key={client.email}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-500">{client.email}</p>
                          {client.phone && (
                            <p className="text-xs text-gray-500">{client.phone}</p>
                          )}
                        </div>
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
                              expandedClient === client.email ? null : client.email
                            )
                          }
                          className="p-2 rounded-lg hover:bg-gray-200 transition"
                        >
                          <ChevronDown
                            size={18}
                            className={`transition-transform ${
                              expandedClient === client.email ? "rotate-180" : ""
                            }`}
                            style={{ color: strong }}
                          />
                        </button>
                      </td>
                    </tr>

                    {/* HISTÓRICO EXPANDIDO */}
                    {expandedClient === client.email && (
                      <tr className="bg-gray-50 border-t">
                        <td colSpan="5" className="px-6 py-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900">
                              Histórico de Agendamentos
                            </h4>
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              {client.appointments
                                .sort(
                                  (a, b) =>
                                    new Date(b.date) - new Date(a.date)
                                )
                                .map((apt, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 bg-white rounded-lg border border-gray-200"
                                  >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                      <div>
                                        <p className="font-medium text-gray-900">
                                          {apt.service_name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                          {new Date(apt.date).toLocaleDateString()} às{" "}
                                          {apt.start_time}
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
                                ))}
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
    </div>
  );
}
