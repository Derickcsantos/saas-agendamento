import { supabase } from "../lib/supabase.js";
import { google } from "googleapis";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_SECRET_KEY,
  GOOGLE_REDIRECT_URI,
} = process.env;

const OAUTH_CLIENT_SECRET = GOOGLE_CLIENT_SECRET || GOOGLE_SECRET_KEY;

function createOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

function formatDateISO(d) {
  // yyyy-mm-dd (sem timezone shift)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getDayOfWeek(date) {
  // 0..6 (Dom..Sab)
  return date.getDay();
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return (
    (aStart >= bStart && aStart < bEnd) ||
    (aEnd > bStart && aEnd <= bEnd) ||
    (aStart <= bStart && aEnd >= bEnd)
  );
}

export async function computeUnavailableDaysResponse({ slug, employeeId, duration }) {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug_organization", slug)
    .single();

  if (orgError || !org) {
    const err = new Error("Organização não encontrada");
    err.status = 404;
    throw err;
  }

  const { data: policy, error: policyError } = await supabase
    .from("organization_policies")
    .select("max_schedule_days")
    .eq("organization_id", org.id)
    .single();

  const maxScheduleDays = policyError || !policy?.max_schedule_days ? 30 : Number(policy.max_schedule_days);

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endDate = addDays(startDate, maxScheduleDays);

  const dates = [];
  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    dates.push(new Date(d));
  }

  const unavailableSet = new Set();
  const reasons = {};

  const addUnavailable = (iso, reason) => {
    unavailableSet.add(iso);
    if (!reasons[iso]) reasons[iso] = [];
    if (!reasons[iso].includes(reason)) reasons[iso].push(reason);
  };

  const { data: closedPeriods, error: closedError } = await supabase
    .from("closed_periods")
    .select("*")
    .eq("organization_id", org.id)
    .order("start_day", { ascending: true });

  if (closedError) throw closedError;

  for (const p of closedPeriods || []) {
    if (!p.start_day) continue;

    const pStart = new Date(p.start_day);
    const pEnd = p.end_day ? new Date(p.end_day) : new Date(p.start_day);

    const ps = new Date(pStart.getFullYear(), pStart.getMonth(), pStart.getDate());
    const pe = new Date(pEnd.getFullYear(), pEnd.getMonth(), pEnd.getDate());

    for (let d = ps; d <= pe; d = addDays(d, 1)) {
      if (d < startDate || d > endDate) continue;
      addUnavailable(formatDateISO(d), "closed_period");
    }
  }

  // 4) Se tiver employeeId: carregar dados do funcionário, agenda e eventos
  let schedules = [];
  let workingDowSet = null;
  let scheduleByDow = new Map();
  let appointmentsByDate = new Map();
  let googleBusyByDate = new Map();

  if (employeeId) {
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, user_id, is_active")
      .eq("id", employeeId)
      .single();

    if (employeeError || !employee || !employee.is_active) {
      for (const d of dates) addUnavailable(formatDateISO(d), "no_work");
    } else {
      const { data: scheduleRows, error: scheduleError } = await supabase
        .from("work_schedules")
        .select("day_of_week,is_available,start_time,end_time")
        .eq("organization_id", org.id)
        .eq("employee_id", employeeId);

      if (scheduleError) throw scheduleError;

      schedules = scheduleRows || [];

      workingDowSet = new Set(
        schedules
          .filter((s) => s.is_available === true)
          .map((s) => Number(s.day_of_week))
          .filter((n) => Number.isFinite(n))
      );

      for (const s of schedules) {
        if (s.is_available === true && Number.isFinite(Number(s.day_of_week))) {
          if (!scheduleByDow.has(Number(s.day_of_week))) {
            scheduleByDow.set(Number(s.day_of_week), s);
          }
        }
      }

      if (workingDowSet.size === 0) {
        for (const d of dates) addUnavailable(formatDateISO(d), "no_work");
      } else {
        for (const d of dates) {
          const dow = getDayOfWeek(d);
          if (!workingDowSet.has(dow)) {
            addUnavailable(formatDateISO(d), "no_work");
          }
        }
      }

      if (duration && Number.isFinite(duration) && duration > 0) {
        const startIso = formatDateISO(startDate);
        const endIso = formatDateISO(endDate);

        const { data: appointments, error: appointmentsError } = await supabase
          .from("appointments")
          .select("appointment_date,start_time,end_time,status")
          .eq("employee_id", employeeId)
          .eq("organization_id", org.id)
          .in("status", ["confirmed", "completed"])
          .gte("appointment_date", startIso)
          .lte("appointment_date", endIso)
          .order("start_time", { ascending: true });

        if (appointmentsError) throw appointmentsError;

        for (const appt of appointments || []) {
          if (!appointmentsByDate.has(appt.appointment_date)) {
            appointmentsByDate.set(appt.appointment_date, []);
          }
          appointmentsByDate.get(appt.appointment_date).push({
            start: new Date(`${appt.appointment_date}T${appt.start_time}`),
            end: new Date(`${appt.appointment_date}T${appt.end_time}`),
          });
        }

        const { data: policy, error: policyError } = await supabase
          .from("organization_policies")
          .select("sync_google_calendar")
          .eq("organization_id", org.id)
          .maybeSingle();

        if (policyError) throw policyError;

        if (policy?.sync_google_calendar === true && employee.user_id) {
          const { data: googleData } = await supabase
            .from("organization_google_calendar")
            .select("access_token, refresh_token, token_type, scope, expiry_date")
            .eq("user_id", employee.user_id)
            .maybeSingle();

          if (googleData?.refresh_token) {
            const oauth2Client = createOAuthClient();
            oauth2Client.setCredentials({
              access_token: googleData.access_token,
              refresh_token: googleData.refresh_token,
              token_type: googleData.token_type,
              scope: googleData.scope,
              expiry_date: googleData.expiry_date,
            });

            const calendar = google.calendar({ version: "v3", auth: oauth2Client });
            const calendars = await calendar.calendarList.list();

            const allowedAccess = new Set(["owner", "writer", "reader"]);
            const isHolidayCalendar = (cal) => {
              const text = `${cal.summary || ""} ${cal.description || ""}`.toLowerCase();
              const id = String(cal.id || "").toLowerCase();
              if (text.includes("feriad") || text.includes("holiday")) return true;
              if (id.includes("holiday@") || id.includes("group.v.calendar.google.com")) return true;
              return false;
            };

            const validCalendars =
              (calendars.data.items || []).filter((cal) => {
                if (!allowedAccess.has(cal.accessRole)) return false;
                if (isHolidayCalendar(cal)) return false;
                return true;
              });

            const timeMin = new Date(`${startIso}T00:00:00`).toISOString();
            const timeMax = new Date(`${endIso}T23:59:59`).toISOString();

            for (const cal of validCalendars) {
              const { data } = await calendar.events.list({
                calendarId: cal.id,
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: "startTime",
                showDeleted: false,
                maxResults: 2500,
              });

              for (const ev of data.items || []) {
                const summary = (ev.summary || "").toLowerCase().trim();
                if (summary.startsWith("agendamento cancelado:")) continue;

                const startStr = ev.start?.dateTime || ev.start?.date;
                const endStr = ev.end?.dateTime || ev.end?.date;
                if (!startStr || !endStr) continue;

                const eventStart = startStr.includes("T")
                  ? new Date(startStr)
                  : new Date(`${startStr}T00:00:00`);
                const eventEnd = endStr.includes("T")
                  ? new Date(endStr)
                  : new Date(`${endStr}T00:00:00`);

                const dayCursor = new Date(eventStart);
                dayCursor.setHours(0, 0, 0, 0);

                const endCursor = new Date(eventEnd);
                endCursor.setHours(0, 0, 0, 0);

                while (dayCursor <= endCursor) {
                  const iso = formatDateISO(dayCursor);

                  const dayStart = new Date(`${iso}T00:00:00`);
                  const dayEnd = new Date(`${iso}T23:59:59.999`);

                  const busyStart = eventStart < dayStart ? dayStart : eventStart;
                  const busyEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

                  if (busyStart < busyEnd) {
                    if (!googleBusyByDate.has(iso)) googleBusyByDate.set(iso, []);
                    googleBusyByDate.get(iso).push({ start: busyStart, end: busyEnd });
                  }

                  dayCursor.setDate(dayCursor.getDate() + 1);
                }
              }
            }
          }
        }
      }
    }
  }

  // 5) Se tiver duration + employeeId: verificar se existem horários disponíveis por dia
  if (employeeId && duration && Number.isFinite(duration) && duration > 0) {
    for (const d of dates) {
      const iso = formatDateISO(d);

      if (unavailableSet.has(iso)) continue;

      if (workingDowSet) {
        const dow = getDayOfWeek(d);
        if (!workingDowSet.has(dow)) continue;
      }

      const schedule = scheduleByDow.get(getDayOfWeek(d));
      if (!schedule || !schedule.is_available) {
        addUnavailable(iso, "no_work");
        continue;
      }

      const workStart = new Date(`${iso}T${schedule.start_time}`);
      const workEnd = new Date(`${iso}T${schedule.end_time}`);
      const interval = 15 * 60 * 1000;
      const durationMs = Number(duration) * 60 * 1000;

      const busyFromDb = appointmentsByDate.get(iso) || [];
      const busyFromGoogle = googleBusyByDate.get(iso) || [];
      const allBusy = [...busyFromDb, ...busyFromGoogle];

      let currentSlot = new Date(workStart);
      let hasAvailable = false;

      while (currentSlot.getTime() + durationMs <= workEnd.getTime()) {
        const slotStart = new Date(currentSlot);
        const slotEnd = new Date(slotStart.getTime() + durationMs);

        const isAvailable = !allBusy.some((busy) =>
          rangesOverlap(slotStart, slotEnd, busy.start, busy.end)
        );

        if (isAvailable) {
          hasAvailable = true;
          break;
        }

        currentSlot = new Date(currentSlot.getTime() + interval);
      }

      if (!hasAvailable) addUnavailable(iso, "no_times");
    }
  }

  const unavailableDays = Array.from(unavailableSet).sort();

  return {
    organization_id: org.id,
    max_schedule_days: maxScheduleDays,
    unavailable_days: unavailableDays,
    reasons,
    closed_periods: closedPeriods || [],
  };
}