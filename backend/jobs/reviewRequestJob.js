import crypto from "node:crypto";
import { supabase } from "../lib/supabase.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import { normalizePhone } from "../utils/normalizePhone.js";
import { dateInTimeZone, localAppointmentEnd } from "../utils/reviewSchedule.js";

const DEFAULT_INTERVAL_MS = 60 * 1000;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const DEFAULT_TIMEZONE = "America/Sao_Paulo";
let running = false;

async function deliverInvitation(invitation, appointment, organization) {
  const claimId = crypto.randomUUID();
  const { data: claimed } = await supabase.from("review_invitations")
    .update({ status: "processing", last_error: claimId, updated_at: new Date().toISOString() })
    .eq("id", invitation.id)
    .in("status", ["pending", "failed", "processing"])
    .select("id")
    .maybeSingle();
  if (!claimed) return false;

  try {
    const phone = normalizePhone(appointment.client_phone)?.whatsappPlus;
    if (!phone) throw new Error("Telefone do cliente inválido");
    const baseUrl = (process.env.PUBLIC_FRONTEND_URL || "https://www.marcafy.com.br").replace(/\/$/, "");
    const reviewUrl = `${baseUrl}/${organization.slug_organization}/avaliar?token=${invitation.token}`;
    const message = `Olá, ${appointment.client_name}! Esperamos que tenha gostado do atendimento na *${organization.name}*.\n\nSua opinião é muito importante e leva menos de um minuto:\n${reviewUrl}\n\nAgradecemos por confiar no nosso trabalho!`;
    await sendWhatsAppMessage(phone, message, organization.id);
    await supabase.from("review_invitations").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      attempts: invitation.attempts + 1,
      next_retry_at: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", invitation.id).eq("last_error", claimId);
    return true;
  } catch (error) {
    const attempts = invitation.attempts + 1;
    await supabase.from("review_invitations").update({
      status: "failed",
      attempts,
      next_retry_at: attempts < 5 ? new Date(Date.now() + Math.min(60, 5 * 2 ** attempts) * 60000).toISOString() : null,
      last_error: String(error.message || error).slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq("id", invitation.id).eq("last_error", claimId);
    return false;
  }
}

export async function processReviewRequests(now = new Date()) {
  if (running) return { skipped: true };
  running = true;
  try {
    const { data: policies, error: policyError } = await supabase.from("organization_policies")
      .select("organization_id, organizations (id, name, slug_organization)")
      .eq("client_review", true);
    if (policyError) throw policyError;

    let sent = 0;
    for (const policy of policies || []) {
      const organization = policy.organizations;
      if (!organization) continue;
      const timezone = DEFAULT_TIMEZONE;
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: appointments, error } = await supabase.from("appointments")
        .select("id, client_name, client_phone, appointment_date, end_time, status")
        .eq("organization_id", organization.id)
        .gte("appointment_date", dateInTimeZone(start, timezone))
        .lte("appointment_date", dateInTimeZone(now, timezone))
        .in("status", ["confirmed", "completed"])
        .not("client_phone", "is", null);
      if (error) throw error;

      for (const appointment of appointments || []) {
        const scheduledAt = new Date(localAppointmentEnd(appointment, timezone).getTime() + THREE_HOURS_MS);
        if (scheduledAt > now) continue;

        const token = crypto.randomUUID();
        const { data: inserted, error: insertError } = await supabase.from("review_invitations").insert({
          appointment_id: appointment.id,
          organization_id: organization.id,
          token,
          scheduled_at: scheduledAt.toISOString(),
        }).select("*").maybeSingle();

        let invitation = inserted;
        if (insertError?.code === "23505") {
          const { data } = await supabase.from("review_invitations").select("*")
            .eq("appointment_id", appointment.id).maybeSingle();
          invitation = data;
        } else if (insertError) throw insertError;

        const retryDue = invitation?.status === "failed" && invitation.attempts < 5 &&
          (!invitation.next_retry_at || new Date(invitation.next_retry_at) <= now);
        const staleProcessing = invitation?.status === "processing" &&
          new Date(invitation.updated_at).getTime() <= now.getTime() - 15 * 60 * 1000;
        if (invitation?.status === "pending" || retryDue || staleProcessing) {
          if (await deliverInvitation(invitation, appointment, organization)) sent++;
        }
      }
    }
    return { success: true, sent };
  } catch (error) {
    console.error("REVIEW REQUEST JOB ERROR:", error);
    return { success: false, error: error.message };
  } finally {
    running = false;
  }
}

export function startReviewRequestJob({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const execute = () => processReviewRequests().catch((error) => console.error("Review job failed:", error));
  const timer = setInterval(execute, Math.max(intervalMs, 60000));
  timer.unref?.();
  setTimeout(execute, 15000).unref?.();
  return timer;
}
