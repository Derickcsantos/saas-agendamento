"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../../components/Footer";

export default function AppointmentsPage({ params }) {
  const router = useRouter();
  const slug = params?.slug;
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndAppointments = async () => {
      try {
        const authRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check`, {
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

    fetchUserAndAppointments();
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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors">
      <main className="flex-grow py-10 max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Meus Agendamentos</h2>
          <button
            onClick={() => router.push(`/${slug}/minha-conta`)}
            className="text-purple-600 hover:text-purple-800 transition"
          >
            ← Voltar
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-gray-500">Você ainda não possui agendamentos.</p>
            <button
              onClick={() => router.push(`/${slug}/agendar`)}
              className="mt-4 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
            >
              Agendar Serviço
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <thead>
                <tr className="bg-purple-600 text-white">
                  <th className="p-3">Data</th>
                  <th className="p-3">Serviço</th>
                  <th className="p-3">Profissional</th>
                  <th className="p-3">Horário</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="p-3">{formatDate(a.date)}</td>
                    <td className="p-3">{a.service_name}</td>
                    <td className="p-3">{a.professional_name}</td>
                    <td className="p-3">
                      {formatTime(a.start_time)} - {formatTime(a.end_time)}
                    </td>
                    <td className="p-3">
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
                    <td className="p-3">R$ {a.price?.toFixed(2)?.replace(".", ",") || "0,00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer slug={slug} />
    </div>
  );
}
