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

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/minha-conta/appointments?email=${encodeURIComponent(
            authData.user.email
          )}`
        );

        const data = await res.json();
        setAppointments(data || []);
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

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600 dark:text-gray-200">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500 mr-2"></div>
        Carregando...
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">

      <main className="flex-grow py-10 max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push(`/${slug}/minha-conta`)}
            className="text-gray-600 hover:text-gray-800 dark:hover:text-purple-300 transition font-medium "
          >
            ← Voltar
          </button>
          <h2 className="text-3xl font-bold ml-8">Meus Agendamentos</h2>
        
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-gray-500 dark:text-gray-400">Você ainda não possui agendamentos.</p>

            <button
              onClick={() => router.push(`/${slug}/agendar`)}
              className="mt-4 bg-gray-600 text-white px-6 py-3 rounded-xl shadow hover:bg-gray-700 transition"
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
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300 font-semibold mb-2">
                    <Calendar size={18} />
                    {formatDate(a.date)}
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Tag size={16} className="text-purple-500" />
                    <span className="font-medium">{a.service_name}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <User size={16} className="text-purple-500" />
                    <span>{a.professional_name}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-purple-500" />
                    <span>
                      {formatTime(a.start_time)} - {formatTime(a.end_time)}
                    </span>
                  </div>

                  <span
                    className={`mt-3 inline-block px-4 py-1 rounded-full text-sm font-semibold ${
                      a.status === "confirmed"
                        ? "bg-blue-500 text-white"
                        : a.status === "completed"
                        ? "bg-green-500 text-white"
                        : a.status === "canceled"
                        ? "bg-gray-400 text-white"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {a.status === "confirmed"
                      ? "Confirmado"
                      : a.status === "completed"
                      ? "Concluído"
                      : a.status === "canceled"
                      ? "Cancelado"
                      : "Não Compareceu"}
                  </span>

                  <p className="font-bold mt-3 text-purple-700 dark:text-purple-300">
                    R$ {a.price?.toFixed(2)?.replace(".", ",") || "0,00"}
                  </p>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse bg-white dark:bg-gray-800 shadow-lg rounded-xl">
                <thead>
                  <tr className="bg-purple-600 text-white">
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
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
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
                              ? "bg-blue-500 text-white"
                              : a.status === "completed"
                              ? "bg-green-500 text-white"
                              : a.status === "canceled"
                              ? "bg-gray-400 text-white"
                              : "bg-red-500 text-white"
                          }`}
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
                      <td className="p-4 font-semibold">
                        R$ {a.price?.toFixed(2)?.replace(".", ",") || "0,00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <Footer slug={slug} />
    </div>
  );
}
