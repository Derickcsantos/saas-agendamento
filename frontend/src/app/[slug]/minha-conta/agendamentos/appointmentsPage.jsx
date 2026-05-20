"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import Footer from "../../../components/Footer";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";

export default function AppointmentsPage({ slug }) {
  const router = useRouter();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchEverything = async () => {
      try {
        const authRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`);
        const authData = await authRes.json();

        if (!authData.authenticated) {
          router.push(`/${slug}/login`);
          return;
        }

        const [appointmentsRes, paletteRes] = await Promise.all([
          fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/minha-conta/appointments`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
            credentials: "include",
          }),
        ]);

        if (!appointmentsRes.ok) {
          throw new Error("Nao foi possivel carregar seus agendamentos.");
        }

        const data = await appointmentsRes.json();
        setAppointments(Array.isArray(data) ? data : []);

        if (paletteRes.ok) {
          setPalette(await paletteRes.json());
        }
      } catch (error) {
        console.error("Erro ao carregar agendamentos:", error);
        setFeedback({
          type: "error",
          message: error.message || "Nao foi possivel carregar seus agendamentos.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEverything();
  }, [router, slug]);

  const strong = palette?.strong_color || "#6b4ce6";
  const light = palette?.light_color || "#f3f2f5";

  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status !== "canceled").length,
    [appointments]
  );

  const formatDate = (date) =>
    new Date(`${date}T00:00:00-03:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatTime = (time) => (time ? String(time).substring(0, 5) : "");

  const formatPrice = (price) =>
    Number(price || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const getStatusLabel = (status) => {
    if (status === "confirmed") return "Confirmado";
    if (status === "pending") return "Pendente";
    if (status === "completed") return "Concluido";
    if (status === "canceled") return "Cancelado";
    return "Nao compareceu";
  };

  const canCancel = (appointment) => {
    if (!["confirmed", "pending"].includes(appointment.status)) return false;

    const startsAt = new Date(
      `${appointment.date}T${String(appointment.start_time || "00:00:00").slice(0, 8)}-03:00`
    );

    return Number.isFinite(startsAt.getTime()) && startsAt > new Date();
  };

  const statusBadgeClass = (status) => {
    if (status === "pending") return "bg-amber-500 text-white";
    if (status === "completed") return "bg-green-500 text-white";
    if (status === "canceled") return "bg-gray-400 text-white";
    if (status === "confirmed") return "text-white";
    return "bg-red-500 text-white";
  };

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;

    setCancelingId(cancelTarget.id);
    setFeedback(null);

    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/minha-conta/${slug}/appointments/${cancelTarget.id}`,
        { method: "DELETE" }
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel cancelar o agendamento.");
      }

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === cancelTarget.id ? { ...appointment, status: "canceled" } : appointment
        )
      );

      setCancelTarget(null);
      setFeedback({
        type: "success",
        message: payload.whatsapp_sent
          ? "Agendamento cancelado e equipe avisada no WhatsApp."
          : "Agendamento cancelado. O aviso por WhatsApp nao foi confirmado agora.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.message || "Nao foi possivel cancelar o agendamento.",
      });
    } finally {
      setCancelingId(null);
    }
  };

  const StatusBadge = ({ appointment }) => (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(
        appointment.status
      )}`}
      style={appointment.status === "confirmed" ? { backgroundColor: strong } : undefined}
    >
      {getStatusLabel(appointment.status)}
    </span>
  );

  const CancelButton = ({ appointment, compact = false }) => {
    if (!canCancel(appointment)) {
      return compact ? <span className="text-sm text-gray-400">-</span> : null;
    }

    return (
      <button
        type="button"
        onClick={() => setCancelTarget(appointment)}
        disabled={cancelingId === appointment.id}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900 ${
          compact ? "px-3 py-2" : "w-full px-4 py-3"
        }`}
      >
        {cancelingId === appointment.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        {compact ? "Cancelar" : "Cancelar agendamento"}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-600 dark:text-gray-200">
        <div className="mr-2 h-6 w-6 animate-spin rounded-full border-t-2" style={{ borderTopColor: strong }} />
        Carregando...
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      style={{ "--primary": strong, "--primary-light": light }}
    >
      <main className="mx-auto max-w-6xl flex-grow px-4 py-10">
        <div className="mb-8 overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-r p-6 text-white sm:p-8" style={{ backgroundImage: `linear-gradient(90deg, ${strong}, ${strong}CC)` }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <button
                  onClick={() => router.push(`/${slug}/minha-conta`)}
                  className="font-medium text-white/90 transition hover:text-white"
                >
                  Voltar
                </button>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Meus Agendamentos</h2>
                <p className="mt-1 text-white/80">Acompanhe seus horarios e cancele quando precisar</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-wide text-white/70">Ativos</p>
                <p className="text-3xl font-bold text-white">{activeAppointments}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 dark:bg-gray-700">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: strong }} />
                Confirmado
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 dark:bg-gray-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Pendente
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 dark:bg-gray-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Concluido
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 dark:bg-gray-700">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Cancelado
              </span>
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 shadow-sm ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium">{feedback.message}</p>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="shrink-0 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Fechar aviso"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {appointments.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white py-16 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:py-24">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: `${strong}1A` }}>
              <Calendar className="h-7 w-7" style={{ color: strong }} />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">Voce ainda nao possui agendamentos.</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Que tal reservar seu proximo horario?</p>

            <button
              onClick={() => router.push(`/${slug}/agendar`)}
              className="mt-6 rounded-xl px-6 py-3 text-white shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: strong }}
            >
              Agendar Servico
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:hidden">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-2 flex items-center gap-2 font-semibold" style={{ color: strong }}>
                    <Calendar size={18} />
                    {formatDate(appointment.date)}
                  </div>

                  <div className="mb-1 flex items-center gap-2">
                    <Tag size={16} style={{ color: strong }} />
                    <span className="font-medium">{appointment.service_name}</span>
                  </div>

                  <div className="mb-1 flex items-center gap-2">
                    <User size={16} style={{ color: strong }} />
                    <span>{appointment.professional_name}</span>
                  </div>

                  <div className="mb-3 flex items-center gap-2">
                    <Clock size={16} style={{ color: strong }} />
                    <span>
                      {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                    </span>
                  </div>

                  <StatusBadge appointment={appointment} />

                  <p className="mt-3 font-bold" style={{ color: strong }}>
                    {formatPrice(appointment.price)}
                  </p>

                  <div className="mt-4">
                    <CancelButton appointment={appointment} />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="text-white" style={{ backgroundColor: strong }}>
                      <th className="p-4">Data</th>
                      <th className="p-4">Servico</th>
                      <th className="p-4">Profissional</th>
                      <th className="p-4">Horario</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                      >
                        <td className="p-4">{formatDate(appointment.date)}</td>
                        <td className="p-4">{appointment.service_name}</td>
                        <td className="p-4">{appointment.professional_name}</td>
                        <td className="p-4">
                          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                        </td>
                        <td className="p-4">
                          <StatusBadge appointment={appointment} />
                        </td>
                        <td className="p-4 font-semibold" style={{ color: strong }}>
                          {formatPrice(appointment.price)}
                        </td>
                        <td className="p-4 text-right">
                          <CancelButton appointment={appointment} compact />
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

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="p-6">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-200">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cancelar agendamento?</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {cancelTarget.service_name} em {formatDate(cancelTarget.date)}, das{" "}
                    {formatTime(cancelTarget.start_time)} as {formatTime(cancelTarget.end_time)}.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                A equipe sera avisada automaticamente pelo WhatsApp apos o cancelamento.
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  disabled={cancelingId === cancelTarget.id}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Manter agendamento
                </button>
                <button
                  type="button"
                  onClick={handleCancelAppointment}
                  disabled={cancelingId === cancelTarget.id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelingId === cancelTarget.id && <Loader2 size={16} className="animate-spin" />}
                  Confirmar cancelamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer slug={slug} />
    </div>
  );
}
