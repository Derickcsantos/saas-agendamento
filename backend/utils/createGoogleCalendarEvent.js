import { google } from "googleapis";
import { supabase } from "../lib/supabase.js";
import createOAuthClient from "./createOAuthClient.js";

export default async function createGoogleCalendarEvent({
  calendarUserId,
  appointmentId,
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
  includeConference = true,
}) {
  try {
    if (!calendarUserId) {
      return { created: false, reason: "calendar_user_id_missing" };
    }

    const { data: googleData, error: googleDataError } = await supabase
      .from("organization_google_calendar")
      .select("*")
      .eq("user_id", calendarUserId)
      .maybeSingle();

    if (googleDataError || !googleData) {
      return {
        created: false,
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

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const eventStart = new Date(`${appointmentDate}T${startTime}:00-03:00`).toISOString();
    const eventEnd = new Date(`${appointmentDate}T${endTime}:00-03:00`).toISOString();

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
          .eq("calendar_color_id", employeeColor.calendar_color_id)
          .single();

        if (googleColor?.google_color_id) {
          googleColorId = String(googleColor.google_color_id);
        }
      }
    } catch (colorErr) {
      console.error("⚠️ Erro ao buscar cor do calendário:", colorErr.message);
      googleColorId = "1";
    }

    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("is_online, name")
      .eq("id", serviceId)
      .single();

    if (serviceError) {
      console.warn("⚠️ Erro ao buscar dados do serviço:", serviceError);
    }

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

    if (includeConference && serviceData?.is_online) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: `${appointmentId}-${Date.now()}-${calendarUserId}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: eventBody,
      conferenceDataVersion: includeConference && serviceData?.is_online ? 1 : 0,
    });

    const googleEvent = result.data;

    let meetingUrl = null;

    if (serviceData?.is_online && includeConference) {
      meetingUrl =
        googleEvent?.conferenceData?.entryPoints?.find(
          (entry) => entry.entryPointType === "video"
        )?.uri || null;
    }

    return {
      created: true,
      googleEventId: googleEvent.id,
      meetingUrl,
      organizationName,
      calendarUserId,
    };
  } catch (error) {
    console.error("❌ Erro ao criar evento no Google Calendar:", error);
    return { created: false, reason: "error", error };
  }
}
