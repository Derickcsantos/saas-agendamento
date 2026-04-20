import { google } from "googleapis";
import { supabase } from "../lib/supabase.js";
import createOAuthClient from "./createOAuthClient.js";

function isHolidayCalendar(cal) {
  const text = `${cal.summary || ""} ${cal.description || ""}`.toLowerCase();
  const id = String(cal.id || "").toLowerCase();

  if (text.includes("feriad") || text.includes("holiday")) return true;
  if (id.includes("holiday@") || id.includes("group.v.calendar.google.com")) return true;
  return false;
}

function isCanceledEvent(summary) {
  return String(summary || "").toLowerCase().trim().startsWith("agendamento cancelado:");
}

function toDateTime(value) {
  if (!value) return null;
  return value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return (
    (aStart >= bStart && aStart < bEnd) ||
    (aEnd > bStart && aEnd <= bEnd) ||
    (aStart <= bStart && aEnd >= bEnd)
  );
}

async function refreshTokensIfNeeded({ oauth2Client, integration, userId }) {
  const isTokenExpired = integration.expiry_date && new Date() >= new Date(integration.expiry_date);

  if (!isTokenExpired || !integration.refresh_token) {
    return oauth2Client;
  }

  console.log(`🔄 Token expirado para user ${userId}. Renovando...`);
  await oauth2Client.refreshAccessToken();

  const newCredentials = oauth2Client.credentials;
  const { error: updateErr } = await supabase
    .from("organization_google_calendar")
    .update({
      access_token: newCredentials.access_token,
      expiry_date: newCredentials.expiry_date,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateErr) {
    console.warn("⚠️ Erro ao atualizar token no banco:", updateErr.message);
  }

  return oauth2Client;
}

async function collectBusyFromEvents(calendar, calendarIds, timeMin, timeMax) {
  const busyIntervals = [];

  for (const calendarId of calendarIds) {
    const { data } = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      showDeleted: false,
      maxResults: 2500,
    });

    for (const ev of data.items || []) {
      if (isCanceledEvent(ev.summary)) continue;

      const startStr = ev.start?.dateTime || ev.start?.date;
      const endStr = ev.end?.dateTime || ev.end?.date;
      if (!startStr || !endStr) continue;

      const start = toDateTime(startStr);
      const end = toDateTime(endStr);
      if (!start || !end) continue;

      busyIntervals.push({ id: ev.id || null, start, end, calendarId, summary: ev.summary || "Evento" });
    }
  }

  return busyIntervals;
}

async function collectBusyFromFreeBusy(calendar, calendarIds, timeMin, timeMax) {
  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: calendarIds.map((id) => ({ id })),
    },
  });

  const busyIntervals = [];
  const calendars = data.calendars || {};

  for (const [calendarId, info] of Object.entries(calendars)) {
    for (const busy of info.busy || []) {
      const start = toDateTime(busy.start);
      const end = toDateTime(busy.end);
      if (!start || !end) continue;
      busyIntervals.push({ id: null, start, end, calendarId, summary: "busy" });
    }
  }

  return busyIntervals;
}

export function slotOverlapsBusyIntervals(start, end, busyIntervals = []) {
  return busyIntervals.some((busy) => rangesOverlap(start, end, busy.start, busy.end));
}

export async function getEmployeeGoogleBusyIntervals({ userId, timeMin, timeMax }) {
  try {
    if (!userId || !timeMin || !timeMax) {
      return { ok: false, reason: "missing_params", busyIntervals: [] };
    }

    const { data: integration, error } = await supabase
      .from("organization_google_calendar")
      .select("access_token, refresh_token, token_type, scope, expiry_date")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!integration?.refresh_token) {
      return { ok: false, reason: "calendar_not_connected", busyIntervals: [] };
    }

    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      token_type: integration.token_type,
      scope: integration.scope,
      expiry_date: integration.expiry_date,
    });

    try {
      await refreshTokensIfNeeded({ oauth2Client, integration, userId });
    } catch (refreshErr) {
      console.error("❌ Erro ao renovar token do Google Calendar:", refreshErr.message);
      return { ok: false, reason: "token_refresh_failed", busyIntervals: [], error: refreshErr };
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    let calendarIds = ["primary"];
    try {
      const calendars = await calendar.calendarList.list();
      const allowedAccess = new Set(["owner", "writer", "reader"]);
      const validCalendars = (calendars.data.items || []).filter((cal) => {
        if (!allowedAccess.has(cal.accessRole)) return false;
        if (isHolidayCalendar(cal)) return false;
        return true;
      });

      if (validCalendars.length > 0) {
        calendarIds = validCalendars.map((cal) => cal.id);
      }

      const busyIntervals = await collectBusyFromEvents(calendar, calendarIds, timeMin, timeMax);
      return {
        ok: true,
        source: "events",
        busyIntervals,
        calendarIds,
      };
    } catch (eventsError) {
      console.warn("⚠️ Falha ao ler eventos do Google Calendar. Tentando freebusy...", eventsError.message);

      try {
        const busyIntervals = await collectBusyFromFreeBusy(calendar, calendarIds, timeMin, timeMax);
        return {
          ok: true,
          source: "freebusy",
          busyIntervals,
          calendarIds,
        };
      } catch (freeBusyError) {
        console.error("❌ Falha ao consultar freebusy do Google Calendar:", freeBusyError.message);
        return {
          ok: false,
          reason: "google_calendar_unavailable",
          busyIntervals: [],
          error: freeBusyError,
        };
      }
    }
  } catch (error) {
    console.error("❌ Erro ao obter busy intervals do Google Calendar:", error.message);
    return {
      ok: false,
      reason: "error",
      busyIntervals: [],
      error,
    };
  }
}
