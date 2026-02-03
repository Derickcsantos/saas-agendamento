"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../../components/Footer";
import { Calendar, Clock, User, Tag } from "lucide-react";

export default function AppointmentsPage({ slug }) {

  const [appointments, setAppointments] = useState([]);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState(null);

  useEffect(() => {
    const fetchEverything = async () => {
      try {
        const authRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`, {
          credentials: "include",
        });

        const authData = await authRes.json();

        if (!authData.authenticated) {
          router.push(`/${slug}/login`);
          return;
        }

        setUser(authData.user);

        const [appointmentsRes, paletteRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/minha-conta/appointments?email=${encodeURIComponent(
              authData.user.email
            )}`
          ),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
            credentials: "include",
          }),
        ]);

        const data = await appointmentsRes.json();
        setAppointments(data || []);

        if (paletteRes.ok) {
          const paletteData = await paletteRes.json();
          setPalette(paletteData);
        }
      } catch (error) {
        console.error("Erro ao carregar agendamentos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEverything();
  }, [router, slug]);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const formatTime = (t) => (t ? t.substring(0, 5) : "");

  const strong = palette?.strong_color || "#6b4ce6";
  const light = palette?.light_color || "#f3f2f5";

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600 dark:text-gray-200">
        <div
          className="animate-spin rounded-full h-6 w-6 border-t-2 mr-2"
          style={{ borderTopColor: strong }}
        ></div>
        Carregando...
      </div>
    );

  return (
    <div
      className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
      style={{ "--primary": strong, "--primary-light": light }}
    >

      <main className="flex-grow py-10 max-w-6xl mx-auto px-4">
        <div className="mb-8 rounded-3xl shadow-2xl overflow-hidden">
          <div
            className="p-6 sm:p-8 bg-gradient-to-r text-white"
            style={{ backgroundImage: `linear-gradient(90deg, ${strong}, ${strong}CC)` }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <button
                  onClick={() => router.push(`/${slug}/minha-conta`)}
                  className="text-white/90 hover:text-white transition font-medium"
                >
                  ← Voltar
                </button>
                <h2 className="text-3xl sm:text-4xl font-bold mt-3">Meus Agendamentos</h2>
                <p className="text-white/80 mt-1">Acompanhe seus horários com facilidade</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-4 border border-white/20">
                <p className="text-xs uppercase tracking-wide text-white/70">Total</p>
                <p className="text-3xl font-bold text-white">{appointments.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-700">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: strong }}></span>
                Confirmado
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-700">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Concluído
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-700">
                <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                Cancelado
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-700">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                Não Compareceu
              </span>
            </div>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-16 sm:py-24 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${strong}1A` }}>
              <Calendar className="w-7 h-7" style={{ color: strong }} />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">Você ainda não possui agendamentos.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Que tal reservar seu próximo horário?</p>

            <button
              onClick={() => router.push(`/${slug}/agendar`)}
              className="mt-6 text-white px-6 py-3 rounded-xl shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: strong }}
            >
              Agendar Serviço
            </button>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS */}
            <div className="grid grid-cols-1 gap-6 md:hidden">
              {appointments.map((a) => (
                <div
                  key={a.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 font-semibold mb-2" style={{ color: strong }}>
                    <Calendar size={18} />
                    {formatDate(a.date)}
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Tag size={16} style={{ color: strong }} />
                    <span className="font-medium">{a.service_name}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <User size={16} style={{ color: strong }} />
                    <span>{a.professional_name}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} style={{ color: strong }} />
                    <span>
                      {formatTime(a.start_time)} - {formatTime(a.end_time)}
                    </span>
                  </div>

                  <span
                    className={`mt-3 inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-semibold ${
                      a.status === "confirmed"
                        ? "text-white"
                        : a.status === "completed"
                        ? "bg-green-500 text-white"
                        : a.status === "canceled"
                        ? "bg-gray-400 text-white"
                        : "bg-red-500 text-white"
                    }`}
                    style={a.status === "confirmed" ? { backgroundColor: strong } : undefined}
                  >
                    {a.status === "confirmed"
                      ? "Confirmado"
                      : a.status === "completed"
                      ? "Concluído"
                      : a.status === "canceled"
                      ? "Cancelado"
                      : "Não Compareceu"}
                  </span>

                  <p className="font-bold mt-3" style={{ color: strong }}>
                    R$ {a.price?.toFixed(2)?.replace(".", ",") || "0,00"}
                  </p>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: strong }}>
                    <th className="p-4">Data</th>
                    <th className="p-4">Serviço</th>
                    <th className="p-4">Profissional</th>
                    <th className="p-4">Horário</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="p-4">{formatDate(a.date)}</td>
                      <td className="p-4">{a.service_name}</td>
                      <td className="p-4">{a.professional_name}</td>
                      <td className="p-4">
                        {formatTime(a.start_time)} - {formatTime(a.end_time)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            a.status === "confirmed"
                              ? "text-white"
                              : a.status === "completed"
                              ? "bg-green-500 text-white"
                              : a.status === "canceled"
                              ? "bg-gray-400 text-white"
                              : "bg-red-500 text-white"
                          }`}
                          style={a.status === "confirmed" ? { backgroundColor: strong } : undefined}
                        >
                          {a.status === "confirmed"
                            ? "Confirmado"
                            : a.status === "completed"
                            ? "Concluído"
                            : a.status === "canceled"
                            ? "Cancelado"
                            : "Não Compareceu"}
                        </span>
                      </td>
                      <td className="p-4 font-semibold" style={{ color: strong }}>
                        R$ {a.price?.toFixed(2)?.replace(".", ",") || "0,00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer slug={slug} />
    </div>
  );
}
