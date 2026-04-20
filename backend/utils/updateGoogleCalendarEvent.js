import { google } from "googleapis";
import { supabase } from "../lib/supabase.js";
import createOAuthClient from "./createOAuthClient.js";
import findCalendarIdByEventId from "./findCalendarByEventId.js";

/**
 * Atualiza um evento no Google Calendar
 * Suporta atualização de:
 * - Data e horário (appointment_date, start_time, end_time)
 * - Título (client_name, serviceName)
 * - Descrição (preços, telefone)
 */
export default async function updateGoogleCalendarEvent({
  calendarUserId,
  googleEventId,
  appointmentDate,
  startTime,
  endTime,
  clientName,
  employeeId,
  employeeName,
  serviceId,
  originalPrice,
  finalPrice,
  normalizedClientPhone,
  organizationName,
}) {
  try {
    if (!calendarUserId || !googleEventId) {
      return { updated: false, reason: "missing_required_params" };
    }

    const { data: googleData, error: googleDataError } = await supabase
      .from("organization_google_calendar")
      .select("*")
      .eq("user_id", calendarUserId)
      .maybeSingle();

    if (googleDataError || !googleData) {
      return {
        updated: false,
        reason: "calendar_not_connected",
        error: googleDataError || null,
      };
    }

    const oauth2Client = createOAuthClient();

    oauth2Client.setCredentials({
      access_token: googleData.access_token,
      refresh_token: googleData.refresh_token,
      token_type: googleData.token_type,
      scope: googleData.scope,
      expiry_date: googleData.expiry_date,
    });

    // ✅ Verificar se token está expirado e fazer refresh se necessário
    try {
      const isTokenExpired = googleData.expiry_date && new Date() >= new Date(googleData.expiry_date);
      if (isTokenExpired && googleData.refresh_token) {
        console.log(`🔄 Token expirado para user ${calendarUserId}. Renovando...`);
        await oauth2Client.refreshAccessToken();
        
        const newCredentials = oauth2Client.credentials;
        
        // Salvar tokens renovados no banco
        const { error: updateErr } = await supabase
          .from("organization_google_calendar")
          .update({
            access_token: newCredentials.access_token,
            expiry_date: newCredentials.expiry_date,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", calendarUserId);

        if (updateErr) {
          console.warn("⚠️ Erro ao atualizar token no banco:", updateErr.message);
        }
      }
    } catch (refreshErr) {
      console.error("❌ Erro ao renovar token:", refreshErr.message);
      return {
        updated: false,
        reason: "token_refresh_failed",
        error: refreshErr,
      };
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Formar datetimes ISO para o Google Calendar
    const eventStart = new Date(`${appointmentDate}T${startTime}:00-03:00`).toISOString();
    const eventEnd = new Date(`${appointmentDate}T${endTime}:00-03:00`).toISOString();

    // Buscar cor do funcionário
    let googleColorId = "1";
    try {
      const { data: employeeColor } = await supabase
        .from("employee_calendar_color")
        .select("calendar_color_id")
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (employeeColor?.calendar_color_id) {
        const { data: googleColor } = await supabase
          .from("google_calendar_colors")
          .select("google_color_id")
          .eq("id", employeeColor.calendar_color_id)
          .single();

        if (googleColor?.google_color_id) {
          googleColorId = String(googleColor.google_color_id);
        }
      }
    } catch (colorErr) {
      console.error("⚠️ Erro ao buscar cor do calendário:", colorErr.message);
    }

    // Buscar dados do serviço
    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("is_online, name")
      .eq("id", serviceId)
      .single();

    if (serviceError) {
      console.warn("⚠️ Erro ao buscar dados do serviço:", serviceError);
    }

    // Montar body da atualização
    const eventBody = {
      summary: `Agendamento: ${clientName} - ${serviceData?.name || "Serviço"}`,
      description: `Serviço: ${serviceData?.name}\nProfissional: ${employeeName}\nPreço original: R$ ${
        Number.isFinite(Number(originalPrice)) ? Number(originalPrice).toFixed(2) : originalPrice
      }\nPreço final: R$ ${
        Number.isFinite(Number(finalPrice)) ? Number(finalPrice).toFixed(2) : finalPrice
      }\nCliente: ${clientName}\nTelefone: ${normalizedClientPhone || "-"}`,
      start: { dateTime: eventStart, timeZone: "America/Sao_Paulo" },
      end: { dateTime: eventEnd, timeZone: "America/Sao_Paulo" },
      colorId: googleColorId,
    };

    // Descobrir calendarId (geralmente é "primary", mas pode ser diferente)
    const calendarId = (await findCalendarIdByEventId(calendar, googleEventId)) || "primary";

    // Atualizar evento
    const result = await calendar.events.update({
      calendarId,
      eventId: googleEventId,
      requestBody: eventBody,
    });

    console.log("✅ Evento atualizado no Google Calendar - ID:", googleEventId);

    // ✅ Atualizar token se Google o renovou
    try {
      const newCreds = oauth2Client.credentials;
      if (newCreds.access_token && newCreds.access_token !== googleData.access_token) {
        await supabase
          .from("organization_google_calendar")
          .update({
            access_token: newCreds.access_token,
            expiry_date: newCreds.expiry_date,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", calendarUserId);

        console.log("🔄 Token atualizado após atualizar evento");
      }
    } catch (updateErr) {
      console.warn("⚠️ Erro ao atualizar token após atualizar evento:", updateErr.message);
    }

    return {
      updated: true,
      googleEventId,
      organizationName,
      calendarUserId,
    };
  } catch (error) {
    console.error("❌ Erro ao atualizar evento no Google Calendar:", error);
    return { updated: false, reason: "error", error };
  }
}
