export function getCancellationEligibility(appointment, policy, now = new Date()) {
  if (appointment.status === "canceled") return { canCancel: false, reason: "Este agendamento já foi cancelado" };
  if (!["confirmed", "pending"].includes(appointment.status)) return { canCancel: false, reason: "Este agendamento não pode ser cancelado" };
  if (policy?.auto_cancellation_enabled !== true) return { canCancel: false, reason: "O cancelamento online não está disponível para esta organização" };

  const startsAt = new Date(`${appointment.appointment_date}T${String(appointment.start_time || "00:00:00").slice(0, 8)}-03:00`);
  if (!Number.isFinite(startsAt.getTime()) || startsAt <= now) return { canCancel: false, reason: "Não é possível cancelar um agendamento que já começou" };

  const noticeDays = Math.max(0, Math.trunc(Number(policy?.cancellation_notice_days) || 0));
  const remainingMilliseconds = startsAt.getTime() - now.getTime();
  if (remainingMilliseconds <= noticeDays * 24 * 60 * 60 * 1000) return { canCancel: false, reason: `O cancelamento exige mais de ${noticeDays} dia(s) de antecedência` };
  return { canCancel: true, reason: null };
}
