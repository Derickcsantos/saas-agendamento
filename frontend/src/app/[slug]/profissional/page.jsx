"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CalendarCheck, Clock, CheckCircle, XCircle, TrendingUp, User } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import PWAInstallButton from "@/components/PWAInstallButton";
import EmployeeSidebar from "./components/EmployeeSidebar";
import EmployeeTopbar from "./components/EmployeeTopbar";
import StatCard from "./components/StatCard";
import AppointmentsChart from "./components/AppointmentsChart";
import StatusPieChart from "./components/StatusPieChart";
import ProfileModal from "../../components/ProfileModal";
import PersonalCalendarTab from "./calendario/page";

export default function EmployeePanel() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug;

  // ESTADOS
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [palette, setPalette] = useState(null);
  const [org, setOrg] = useState(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [topClient, setTopClient] = useState(null);
  const [appInstalled, setAppInstalled] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    monthlyData: { labels: [], values: [] },
    statusData: { labels: [], values: [] },
  });
  const perPage = 10;

  // 1) AUTH
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`);
        const data = await res.json();

        if (!data.authenticated) {
          router.push(`/${slug}/login`);
          return;
        }

        if (data.user.tipo === "comum") {
          router.push(`/${slug}/minha-conta`);
          return;
        }

        setUser(data.user);

        // ✅ Busca dados do usuário para verificar app_installed
        const userRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${data.user.id}`);
        const userData = await userRes.json();
        setAppInstalled(userData?.app_installed || false);

      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        router.push(`/${slug}/login`);
      }
    };
    checkAuth();
  }, [router, slug]);

  // 2) ORG + PALETA
  useEffect(() => {
    async function loadOrg() {
      try {
        const [orgRes, colorRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`),
        ]);

        const orgData = await orgRes.json();
        const paletteData = await colorRes.json();

        setOrg(orgData);
        setPalette(paletteData);
      } catch (err) {
        console.error("Erro ao carregar org/palette:", err);
      }
    }

    if (slug) loadOrg();
  }, [slug]);

  // 3) CARREGA AGENDAMENTOS DO PROFISSIONAL
  useEffect(() => {
    if (!user) return;

    const fetchAppointments = async () => {
      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/by-employee/${user.id}`
        );

        const appsData = await res.json();

        const appsArray = Array.isArray(appsData)
          ? appsData
          : Array.isArray(appsData?.appointments)
          ? appsData.appointments
          : [];

        setAppointments(appsArray);
        setFilteredAppointments(appsArray);
        calculateStats(appsArray);
      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  // CALCULAR ESTATÍSTICAS E CLIENTE TOP
  const calculateStats = (apps) => {
    const total = apps.length;
    const confirmed = apps.filter((a) => a.status === "confirmed").length;
    const pending = apps.filter((a) => a.status === "pending").length;
    const cancelled = apps.filter((a) => a.status === "cancelled").length;

    // Dados mensais (últimos 12 meses)
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthlyCount = Array(12).fill(0);

    apps.forEach((app) => {
      const month = new Date(app.appointment_date).getMonth();
      monthlyCount[month]++;
    });

    // Dados de status
    const statusLabels = ["Confirmados", "Pendentes", "Cancelados"];
    const statusValues = [confirmed, pending, cancelled];

    // Encontrar cliente que mais agenda
    const clientCount = {};
    apps.forEach((app) => {
      const clientName = app.client_name;
      if (clientName) {
        clientCount[clientName] = (clientCount[clientName] || 0) + 1;
      }
    });

    const topClientData = Object.entries(clientCount).sort((a, b) => b[1] - a[1])[0];
    if (topClientData) {
      setTopClient({ name: topClientData[0], count: topClientData[1] });
    }

    setStats({
      total,
      confirmed,
      pending,
      cancelled,
      monthlyData: {
        labels: monthNames,
        values: monthlyCount,
      },
      statusData: {
        labels: statusLabels,
        values: statusValues,
      },
    });
  };

  // 4) FILTRO + PAGINAÇÃO
  const safeFiltered = Array.isArray(filteredAppointments) ? filteredAppointments : [];
  const filtered = safeFiltered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(safeFiltered.length / perPage);

  const applyFilter = (status) => {
    setFilter(status);
    setPage(1);

    if (!Array.isArray(appointments)) {
      setFilteredAppointments([]);
      return;
    }

    if (status === "all") {
      setFilteredAppointments(appointments);
    } else {
      setFilteredAppointments(appointments.filter((a) => a.status === status));
    }
  };

  // FORMATAÇÕES
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const formatTime = (t) => t?.substring(0, 5);

  const statusLabel = {
    confirmed: "Confirmado",
    pending: "Pendente",
    cancelled: "Cancelado",
  };

  const statusColor = (status) => {
    switch (status) {
      case "confirmed":
        return palette?.strong_color;
      case "pending":
        return palette?.medium_color;
      case "cancelled":
        return "#d9534f";
      default:
        return "#999999";
    }
  };

  // LOGOUT
  const logout = async () => {
    await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
      method: "POST",
    });
    router.push(`/${slug}/login`);
  };

  // GERENCIAR TABS
  useEffect(() => {
    if (activeTab === "exit") {
      logout();
    } else if (activeTab === "profile") {
      setShowProfile(true);
      setActiveTab("overview");
    }
  }, [activeTab]);

  if (loading || !palette)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500 mr-2"></div>
        Carregando...
      </div>
    );

  const renderContent = () => {
    switch (activeTab) {
      case "calendar":
        return <PersonalCalendarTab />;

      case "appointments":
        return (
          <div className="space-y-6">
            {/* FILTROS */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "Todos" },
                { key: "confirmed", label: "Confirmados" },
                { key: "pending", label: "Pendentes" },
                { key: "cancelled", label: "Cancelados" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => applyFilter(btn.key)}
                  className={`px-4 py-2 rounded-lg border transition font-medium shadow-sm 
                    ${filter === btn.key ? "scale-[1.03]" : ""}`}
                  style={{
                    backgroundColor:
                      filter === btn.key ? palette?.strong_color : "white",
                    color:
                      filter === btn.key
                        ? palette?.text_light_color
                        : palette?.text_dark_color,
                    borderColor: palette?.medium_color,
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* TABELA */}
            <div
              className="overflow-x-auto shadow-lg rounded-2xl"
              style={{
                backgroundColor: "white",
                border: `1px solid ${palette?.medium_color}30`,
              }}
            >
              <table className="w-full border-collapse">
                <thead
                  style={{
                    backgroundColor: palette?.soft_color,
                    color: palette?.text_dark_color,
                  }}
                >
                  <tr>
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Horário</th>
                    <th className="p-3 text-left">Cliente</th>
                    <th className="p-3 text-left">Serviço</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-500">
                        Nenhum agendamento encontrado.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b hover:bg-gray-50 transition-all duration-150"
                        style={{
                          borderBottomColor: `${palette?.medium_color}40`,
                        }}
                      >
                        <td className="p-3">{formatDate(a.appointment_date)}</td>

                        <td className="p-3">
                          {formatTime(a.start_time)} – {formatTime(a.end_time)}
                        </td>

                        <td className="p-3">{a.client_name}</td>

                        <td className="p-3">{a.services?.name || "—"}</td>

                        <td className="p-3">
                          <span
                            className="px-3 py-1 rounded-full text-white text-sm"
                            style={{
                              backgroundColor: statusColor(a.status),
                              color: "white",
                            }}
                          >
                            {statusLabel[a.status]}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className="px-4 py-2 rounded-lg border font-medium shadow-sm transition-all"
                    style={{
                      backgroundColor:
                        i + 1 === page ? palette?.strong_color : "white",
                      color:
                        i + 1 === page
                          ? palette?.text_light_color
                          : palette?.text_dark_color,
                      borderColor: palette?.medium_color,
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <>
            {/* CARDS DE ESTATÍSTICAS */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total de Agendamentos"
                value={stats.total}
                icon={<CalendarCheck size={24} />}
                palette={palette}
              />
              <StatCard
                title="Confirmados"
                value={stats.confirmed}
                icon={<CheckCircle size={24} />}
                palette={palette}
                subtitle="Agendamentos confirmados"
              />
              <StatCard
                title="Pendentes"
                value={stats.pending}
                icon={<Clock size={24} />}
                palette={palette}
                subtitle="Aguardando confirmação"
              />
              <StatCard
                title="Cancelados"
                value={stats.cancelled}
                icon={<XCircle size={24} />}
                palette={palette}
                subtitle="Agendamentos cancelados"
              />
            </section>

            {/* CLIENTE TOP */}
            {topClient && (
              <section className="mt-6">
                <div 
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-md border p-6"
                  style={{ borderColor: `${palette?.medium_color}30` }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: palette?.strong_color }}
                    >
                      <TrendingUp size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        Cliente Mais Frequente
                      </p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">
                        {topClient.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {topClient.count} agendamento{topClient.count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* GRÁFICOS */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <AppointmentsChart data={stats.monthlyData} palette={palette} />
              <StatusPieChart data={stats.statusData} palette={palette} />
            </section>

            {/* PRÓXIMOS AGENDAMENTOS */}
            <section className="mt-6">
              <div className="bg-white rounded-xl shadow-md border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Próximos Agendamentos
                  </h3>
                  <button
                    onClick={() => setActiveTab("appointments")}
                    className="text-sm font-medium hover:underline"
                    style={{ color: palette?.strong_color }}
                  >
                    Ver todos
                  </button>
                </div>

                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhum agendamento encontrado
                    </p>
                  ) : (
                    appointments.slice(0, 5).map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-all"
                        style={{ borderColor: `${palette?.medium_color}30` }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: palette?.strong_color }}
                          >
                            {new Date(app.appointment_date).getDate()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {app.client_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {app.services?.name} • {formatTime(app.start_time)}
                            </p>
                          </div>
                        </div>

                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: statusColor(app.status) }}
                        >
                          {statusLabel[app.status]}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      {/* SIDEBAR */}
      <div className="shrink-0">
        <EmployeeSidebar
          org={org}
          slug={slug}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          palette={palette}
        />
      </div>

      {/* CONTEÚDO */}
      <div className="flex-1 flex flex-col max-w-full overflow-hidden">
        <EmployeeTopbar 
          user={user} 
          palette={palette}
          appInstalled={appInstalled}
          onAppInstalled={() => setAppInstalled(true)}
        />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-full">
          {renderContent()}
        </main>
      </div>

      {/* MODAL DE PERFIL */}
      {showProfile && (
        <ProfileModal
          user={user}
          setUser={setUser}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
