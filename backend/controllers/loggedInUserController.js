import { google } from "googleapis";
import { supabase } from "../lib/supabase.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import createOAuthClient from "../utils/createOAuthClient.js";
import findCalendarIdByEventId from "../utils/findCalendarByEventId.js";

export const getLoggedInUserAppointments = async (req, res) => {
  try {
    const email = req.user?.email || req.query.email;
    const organizationId = req.organizationId || req.user?.organization_id;

    if (!email) {
      return res.status(400).json({ error: "Email e obrigatorio" });
    }

    if (!organizationId) {
      return res.status(401).json({ error: "Organizacao nao identificada" });
    }

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        client_name,
        client_email,
        client_phone,
        appointment_date,
        start_time,
        end_time,
        status,
        created_at,
        final_price,
        services(name, price),
        employees(name)
      `)
      .eq("client_email", email)
      .eq("organization_id", organizationId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) throw error;

    const formattedData = (data || []).map((item) => ({
      id: item.id,
      date: item.appointment_date,
      start_time: item.start_time,
      end_time: item.end_time,
      status: item.status,
      service_name: item.services?.name || "Servico nao especificado",
      price: item.final_price ?? item.services?.price ?? 0,
      professional_name: item.employees?.name || "Profissional nao especificado",
      client_name: item.client_name,
      client_email: item.client_email,
      client_phone: item.client_phone,
    }));

    return res.json(formattedData);
  } catch (error) {
    console.error("Error fetching client appointments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

function formatDateBR(date) {
  return String(date || "").split("-").reverse().join("/");
}

function formatCurrencyBRL(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function isAppointmentStarted(appointment) {
  const date = appointment?.appointment_date;
  const time = appointment?.start_time;
  if (!date || !time) return false;

  const startsAt = new Date(`${date}T${String(time).slice(0, 8)}-03:00`);
  return Number.isFinite(startsAt.getTime()) && startsAt <= new Date();
}

async function deleteGoogleCalendarEventIfNeeded({ orgId, appointment }) {
  if (!appointment?.google_event_id || !appointment?.employee_id) return;

  const { data: policy, error: policyError } = await supabase
    .from("organization_policies")
    .select("sync_google_calendar")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (policyError || policy?.sync_google_calendar !== true) return;

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("user_id")
    .eq("id", appointment.employee_id)
    .maybeSingle();

  if (employeeError || !employee?.user_id) return;

  const { data: integration, error: integrationError } = await supabase
    .from("organization_google_calendar")
    .select("access_token, refresh_token, token_type, scope, expiry_date")
    .eq("user_id", employee.user_id)
    .maybeSingle();

  if (integrationError || !integration?.refresh_token) return;

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    token_type: integration.token_type,
    scope: integration.scope,
    expiry_date: integration.expiry_date,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarId =
    (await findCalendarIdByEventId(calendar, appointment.google_event_id)) || "primary";

  await calendar.events.delete({
    calendarId,
    eventId: appointment.google_event_id,
  });

  const newCreds = oauth2Client.credentials;
  if (newCreds.access_token && newCreds.access_token !== integration.access_token) {
    await supabase
      .from("organization_google_calendar")
      .update({
        access_token: newCreds.access_token,
        expiry_date: newCreds.expiry_date,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", employee.user_id);
  }
}

async function getRepresentativePhone(orgId) {
  const { data, error } = await supabase
    .from("organization_representative")
    .select(`
      representative_id,
      users (
        phone
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.users?.phone || null;
}

export const cancelLoggedInUserAppointment = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const appointmentId = Number(id);
    const user = req.user;

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ error: "Agendamento invalido" });
    }

    if (!user?.email || !user?.organization_id) {
      return res.status(401).json({ error: "Usuario nao autenticado" });
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug_organization")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organizacao nao encontrada" });
    }

    if (org.id !== user.organization_id) {
      return res.status(403).json({ error: "Acesso negado para esta organizacao" });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id,
        organization_id,
        client_name,
        client_email,
        client_phone,
        appointment_date,
        start_time,
        end_time,
        status,
        final_price,
        employee_id,
        google_event_id,
        services:service_id (name),
        employees:employee_id (name)
      `)
      .eq("id", appointmentId)
      .eq("organization_id", org.id)
      .eq("client_email", user.email)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({ error: "Agendamento nao encontrado" });
    }

    if (appointment.status === "canceled") {
      return res.status(409).json({ error: "Este agendamento ja foi cancelado" });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({ error: "Agendamentos concluidos nao podem ser cancelados" });
    }

    if (appointment.status === "no_show") {
      return res.status(400).json({ error: "Este agendamento nao pode ser cancelado" });
    }

    if (isAppointmentStarted(appointment)) {
      return res.status(400).json({ error: "Nao e possivel cancelar um agendamento que ja comecou" });
    }

    const { data: canceled, error: updateError } = await supabase
      .from("appointments")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment.id)
      .eq("organization_id", org.id)
      .eq("client_email", user.email)
      .select("id, status")
      .single();

    if (updateError) throw updateError;

    try {
      await deleteGoogleCalendarEventIfNeeded({ orgId: org.id, appointment });
    } catch (calendarError) {
      console.warn(
        "Nao foi possivel remover o evento do Google Calendar:",
        calendarError?.message || calendarError
      );
    }

    let whatsappSent = false;
    try {
      const representativePhone = await getRepresentativePhone(org.id);

      if (representativePhone) {
        const message = `
Agendamento cancelado pelo cliente

Organizacao: ${org.name || "-"}
Cliente: ${appointment.client_name || "-"}
E-mail: ${appointment.client_email || "-"}
Telefone: ${appointment.client_phone || "-"}

Servico: ${appointment.services?.name || "-"}
Profissional: ${appointment.employees?.name || "-"}
Data: ${formatDateBR(appointment.appointment_date) || "-"}
Horario: ${String(appointment.start_time || "").slice(0, 5)} - ${String(appointment.end_time || "").slice(0, 5)}
Valor: ${formatCurrencyBRL(appointment.final_price)}

ID do agendamento: ${appointment.id}
        `.trim();

        await sendWhatsAppMessage(representativePhone, message, org.id, true);
        whatsappSent = true;
      }
    } catch (whatsappError) {
      console.warn(
        "Nao foi possivel enviar WhatsApp ao representante:",
        whatsappError?.message || whatsappError
      );
    }

    return res.json({
      success: true,
      message: "Agendamento cancelado com sucesso",
      appointment: canceled,
      whatsapp_sent: whatsappSent,
    });
  } catch (error) {
    console.error("Erro ao cancelar agendamento do cliente:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
