"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Footer from "../../components/Footer";
import ProfileModal from "../../components/ProfileModal";

export default function EmployeePanel() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug;

  // =========================
  // ESTADOS
  // =========================
  const [user, setUser] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");
  const [showProfile, setShowProfile] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  // =========================
  // 1️⃣ VERIFICA AUTENTICAÇÃO
  // =========================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!data.authenticated || data.user.tipo == "comum" ) {
          router.push(`/${slug}/login`);
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        router.push(`/${slug}/login`);
      }
    };
    checkAuth();
  }, [router, slug]);

  // =========================
  // 2️⃣ CARREGA DADOS DO FUNCIONÁRIO
  // =========================
  useEffect(() => {
    if (!user) return;

    const fetchEmployeeAndAppointments = async () => {
      try {
        const empRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/employees/by-user/${user.id}`);
        const empData = await empRes.json();
        if (!empRes.ok) throw new Error(empData.error || "Erro ao carregar funcionário");

        setEmployeeId(empData.id);

        const appRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/appointments/by-employee/${empData.id}`);
        const appData = await appRes.json();
        if (!appRes.ok) throw new Error(appData.error || "Erro ao carregar agendamentos");

        setAppointments(appData);
        setFilteredAppointments(appData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeAndAppointments();
  }, [user]);

  // =========================
  // 3️⃣ FILTRO E PAGINAÇÃO
  // =========================
  const filtered = filteredAppointments.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filteredAppointments.length / perPage);

  const applyFilter = (status) => {
    setFilter(status);
    setPage(1);

    if (status === "all") {
      setFilteredAppointments(appointments);
    } else {
      setFilteredAppointments(appointments.filter((a) => a.status === status));
    }
  };

  // =========================
  // 4️⃣ FORMATAÇÕES
  // =========================
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const formatTime = (t) => t?.substring(0, 5);

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  // =========================
  // 5️⃣ TEMA E LOGOUT
  // =========================
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, { 
      method: "POST",
      credentials: "include" 
    });
    router.push(`/${slug}/login`);
  };

  // =========================
  // 6️⃣ LOADING
  // =========================
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600 dark:text-gray-200">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500 mr-2"></div>
        Carregando...
      </div>
    );

  // =========================
  // 7️⃣ RENDER
  // =========================
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition">
      {/* NAVBAR */}
      <nav className="bg-purple-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div
            onClick={() => router.push(`/${slug}/funcionario`)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img
              src="/img/LogoPaulaTrancas.png"
              alt="Logo"
              className="w-10 h-10 rounded-full border border-white"
            />
            <span className="font-semibold text-lg">Painel do Funcionário</span>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => toggleTheme()}
              className="bg-purple-900 hover:bg-purple-800 px-3 py-1 rounded-lg transition"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button
              onClick={() => setShowProfile(true)}
              className="bg-white text-purple-700 px-3 py-1 rounded-lg font-medium hover:bg-purple-100 transition"
            >
              Perfil
            </button>

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-white transition"
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

      {/* CONTEÚDO */}
      <main className="flex-grow max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Bem-vindo(a), {user?.username}
        </h1>

        {/* FILTROS */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => applyFilter("all")}
              className={`px-4 py-2 rounded-lg border ${filter === "all" ? "bg-purple-700 text-white" : "bg-white dark:bg-gray-800"}`}
            >
              Todos
            </button>
            <button
              onClick={() => applyFilter("confirmed")}
              className={`px-4 py-2 rounded-lg border ${filter === "confirmed" ? "bg-purple-700 text-white" : "bg-white dark:bg-gray-800"}`}
            >
              Confirmados
            </button>
            <button
              onClick={() => applyFilter("pending")}
              className={`px-4 py-2 rounded-lg border ${filter === "pending" ? "bg-purple-700 text-white" : "bg-white dark:bg-gray-800"}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => applyFilter("cancelled")}
              className={`px-4 py-2 rounded-lg border ${filter === "cancelled" ? "bg-purple-700 text-white" : "bg-white dark:bg-gray-800"}`}
            >
              Cancelados
            </button>
          </div>
        </div>

        {/* TABELA DE AGENDAMENTOS */}
        <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Horário</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Serviço</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    Nenhum agendamento encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="p-3">{formatDate(a.appointment_date)}</td>
                    <td className="p-3">
                      {formatTime(a.start_time)} - {formatTime(a.end_time)}
                    </td>
                    <td className="p-3">{a.client_name}</td>
                    <td className="p-3">{a.services?.name || "—"}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-white text-sm ${getStatusColor(a.status)}`}>
                        {a.status === "confirmed"
                          ? "Confirmado"
                          : a.status === "pending"
                          ? "Pendente"
                          : "Cancelado"}
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
                className={`px-3 py-1 rounded-lg border ${
                  i + 1 === page ? "bg-purple-700 text-white" : "bg-white dark:bg-gray-800"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE PERFIL */}
      {showProfile && (
        <ProfileModal user={user} setUser={setUser} onClose={() => setShowProfile(false)} />
      )}

      <Footer slug={slug} />
    </div>
  );
}
