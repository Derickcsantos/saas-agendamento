"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Footer from "../../components/Footer";
import ProfileModal from "../../components/ProfileModal";

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
  const [theme, setTheme] = useState("light");
  const [showProfile, setShowProfile] = useState(false);
  const [palette, setPalette] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  // 1) AUTH
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!data.authenticated) {
          router.push(`/${slug}/login`);
          return;
        }

        if (data.user.tipo === "comum") {
          router.push(`/${slug}/minha-conta`);
          return;
        }

        setUser(data.user); // user.id = 18 etc.
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
        const [landingRes, colorRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`),
        ]);

        const landingData = await landingRes.json();
        const paletteData = await colorRes.json();

        setOrgData(landingData);
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
        // aqui o id não pode ser undefined
        console.log("User para buscar agendamentos:", user);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/by-employee/${user.id}`,
          { credentials: "include" }
        );

        const appsData = await res.json();

        // garante que é sempre array
        const appsArray = Array.isArray(appsData)
          ? appsData
          : Array.isArray(appsData?.appointments)
          ? appsData.appointments
          : [];

        setAppointments(appsArray);
        setFilteredAppointments(appsArray);
      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  // 4) FILTRO + PAGINAÇÃO (proteção para não-array)
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

  // =========================
  // 5️⃣ FORMATAÇÕES
  // =========================
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

  // =========================
  // 6️⃣ TEMA E LOGOUT
  // =========================
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push(`/${slug}/login`);
  };

  // =========================
  // 7️⃣ LOADING
  // =========================
  if (loading || !palette)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600 dark:text-gray-200">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500 mr-2"></div>
        Carregando...
      </div>
    );

  // =========================
  // 8️⃣ RENDER
  // =========================
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 transition">

      {/* NAVBAR */}
      <nav
        className="shadow-sm"
        style={{
          backgroundColor: palette?.strong_color,
          color: palette?.text_light_color,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* LOGO + REDIRECIONAMENTO */}
          <div
            onClick={() => router.push(`/${slug}/profissional`)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img
              src={orgData?.organizations.logo_organization}
              alt="Logo"
              className="w-10 h-10 rounded-full border border-white"
            />
            <span className="font-semibold text-lg">
              Painel do Profissional
            </span>
          </div>

          {/* BOTÕES */}
          <div className="flex gap-3 items-center">
            <button
              onClick={toggleTheme}
              className="px-3 py-1 rounded-lg"
              style={{
                backgroundColor: palette?.medium_color,
                color: palette?.text_light_color,
              }}
            >
              {theme === "dark" ? <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 50 50">
<path d="M 24.90625 3.96875 C 24.863281 3.976563 24.820313 3.988281 24.78125 4 C 24.316406 4.105469 23.988281 4.523438 24 5 L 24 11 C 23.996094 11.359375 24.183594 11.695313 24.496094 11.878906 C 24.808594 12.058594 25.191406 12.058594 25.503906 11.878906 C 25.816406 11.695313 26.003906 11.359375 26 11 L 26 5 C 26.011719 4.710938 25.894531 4.433594 25.6875 4.238281 C 25.476563 4.039063 25.191406 3.941406 24.90625 3.96875 Z M 10.65625 9.84375 C 10.28125 9.910156 9.980469 10.183594 9.875 10.546875 C 9.769531 10.914063 9.878906 11.304688 10.15625 11.5625 L 14.40625 15.8125 C 14.648438 16.109375 15.035156 16.246094 15.410156 16.160156 C 15.78125 16.074219 16.074219 15.78125 16.160156 15.410156 C 16.246094 15.035156 16.109375 14.648438 15.8125 14.40625 L 11.5625 10.15625 C 11.355469 9.933594 11.054688 9.820313 10.75 9.84375 C 10.71875 9.84375 10.6875 9.84375 10.65625 9.84375 Z M 39.03125 9.84375 C 38.804688 9.875 38.59375 9.988281 38.4375 10.15625 L 34.1875 14.40625 C 33.890625 14.648438 33.753906 15.035156 33.839844 15.410156 C 33.925781 15.78125 34.21875 16.074219 34.589844 16.160156 C 34.964844 16.246094 35.351563 16.109375 35.59375 15.8125 L 39.84375 11.5625 C 40.15625 11.265625 40.246094 10.800781 40.0625 10.410156 C 39.875 10.015625 39.460938 9.789063 39.03125 9.84375 Z M 24.90625 15 C 24.875 15.007813 24.84375 15.019531 24.8125 15.03125 C 24.75 15.035156 24.6875 15.046875 24.625 15.0625 C 24.613281 15.074219 24.605469 15.082031 24.59375 15.09375 C 19.289063 15.320313 15 19.640625 15 25 C 15 30.503906 19.496094 35 25 35 C 30.503906 35 35 30.503906 35 25 C 35 19.660156 30.746094 15.355469 25.46875 15.09375 C 25.433594 15.09375 25.410156 15.0625 25.375 15.0625 C 25.273438 15.023438 25.167969 15.003906 25.0625 15 C 25.042969 15 25.019531 15 25 15 C 24.96875 15 24.9375 15 24.90625 15 Z M 24.9375 17 C 24.957031 17 24.980469 17 25 17 C 25.03125 17 25.0625 17 25.09375 17 C 29.46875 17.050781 33 20.613281 33 25 C 33 29.421875 29.421875 33 25 33 C 20.582031 33 17 29.421875 17 25 C 17 20.601563 20.546875 17.035156 24.9375 17 Z M 4.71875 24 C 4.167969 24.078125 3.78125 24.589844 3.859375 25.140625 C 3.9375 25.691406 4.449219 26.078125 5 26 L 11 26 C 11.359375 26.003906 11.695313 25.816406 11.878906 25.503906 C 12.058594 25.191406 12.058594 24.808594 11.878906 24.496094 C 11.695313 24.183594 11.359375 23.996094 11 24 L 5 24 C 4.96875 24 4.9375 24 4.90625 24 C 4.875 24 4.84375 24 4.8125 24 C 4.78125 24 4.75 24 4.71875 24 Z M 38.71875 24 C 38.167969 24.078125 37.78125 24.589844 37.859375 25.140625 C 37.9375 25.691406 38.449219 26.078125 39 26 L 45 26 C 45.359375 26.003906 45.695313 25.816406 45.878906 25.503906 C 46.058594 25.191406 46.058594 24.808594 45.878906 24.496094 C 45.695313 24.183594 45.359375 23.996094 45 24 L 39 24 C 38.96875 24 38.9375 24 38.90625 24 C 38.875 24 38.84375 24 38.8125 24 C 38.78125 24 38.75 24 38.71875 24 Z M 15 33.875 C 14.773438 33.90625 14.5625 34.019531 14.40625 34.1875 L 10.15625 38.4375 C 9.859375 38.679688 9.722656 39.066406 9.808594 39.441406 C 9.894531 39.8125 10.1875 40.105469 10.558594 40.191406 C 10.933594 40.277344 11.320313 40.140625 11.5625 39.84375 L 15.8125 35.59375 C 16.109375 35.308594 16.199219 34.867188 16.039063 34.488281 C 15.882813 34.109375 15.503906 33.867188 15.09375 33.875 C 15.0625 33.875 15.03125 33.875 15 33.875 Z M 34.6875 33.875 C 34.3125 33.941406 34.011719 34.214844 33.90625 34.578125 C 33.800781 34.945313 33.910156 35.335938 34.1875 35.59375 L 38.4375 39.84375 C 38.679688 40.140625 39.066406 40.277344 39.441406 40.191406 C 39.8125 40.105469 40.105469 39.8125 40.191406 39.441406 C 40.277344 39.066406 40.140625 38.679688 39.84375 38.4375 L 35.59375 34.1875 C 35.40625 33.988281 35.148438 33.878906 34.875 33.875 C 34.84375 33.875 34.8125 33.875 34.78125 33.875 C 34.75 33.875 34.71875 33.875 34.6875 33.875 Z M 24.90625 37.96875 C 24.863281 37.976563 24.820313 37.988281 24.78125 38 C 24.316406 38.105469 23.988281 38.523438 24 39 L 24 45 C 23.996094 45.359375 24.183594 45.695313 24.496094 45.878906 C 24.808594 46.058594 25.191406 46.058594 25.503906 45.878906 C 25.816406 45.695313 26.003906 45.359375 26 45 L 26 39 C 26.011719 38.710938 25.894531 38.433594 25.6875 38.238281 C 25.476563 38.039063 25.191406 37.941406 24.90625 37.96875 Z"></path>
</svg>: <img width="30" height="30" src="https://img.icons8.com/ios/50/crescent-moon.png" alt="crescent-moon"/>}
            </button>

            <button
              onClick={() => setShowProfile(true)}
              className="bg-white text-black px-3 py-1 rounded-lg font-medium hover:bg-gray-100 transition"
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

      {/* CABEÇALHO BONITO */}
      <header className="max-w-6xl mx-auto w-full px-6 mt-10">
        <div
          className="rounded-xl p-8 shadow-sm"
          style={{
            backgroundColor: palette?.soft_color,
            border: `1px solid ${palette?.medium_color}40`,
          }}
        >
          <h1
            className="text-3xl font-semibold mb-2"
            style={{ color: palette?.text_dark_color }}
          >
            Olá, {user?.username}
          </h1>

          <p
            className="text-gray-600 dark:text-gray-300 text-sm"
            style={{ color: palette?.text_dark_color }}
          >
            Acompanhe seus agendamentos e mantenha sua rotina organizada ✨
          </p>
        </div>
      </header>

      {/* FILTROS */}
      <section className="max-w-6xl mx-auto w-full px-6 mt-8">
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
              className="px-4 py-2 rounded-lg border transition"
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
      </section>

      {/* TABELA DE AGENDAMENTOS */}
      <section className="max-w-6xl mx-auto w-full px-6 mt-6 mb-10">
        <div
          className="overflow-x-auto shadow-sm rounded-xl"
          style={{
            backgroundColor: "white",
            border: `1px solid ${palette?.medium_color}40`,
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
                    className="border-b text-gray-950 hover:bg-gray-50 transition"
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
                className="px-3 py-1 rounded-lg border transition"
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
      </section>

      {showProfile && (
        <ProfileModal user={user} setUser={setUser} onClose={() => setShowProfile(false)} />
      )}

      <Footer slug={slug} />
    </div>
  );
}
