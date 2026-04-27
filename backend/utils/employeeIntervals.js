import { supabase } from "../lib/supabase.js";

export function normalizeTime(value) {
  const raw = String(value || "");
  if (raw.length === 5) return `${raw}:00`;
  return raw;
}

export function toSaoPauloDateTime(day, time) {
  return new Date(`${day}T${normalizeTime(time)}-03:00`);
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

export function getDayOfWeekInSaoPaulo(day) {
  return new Date(`${day}T12:00:00-03:00`).getDay();
}

export async function getEmployeeIntervalsForDate({ organizationId, employeeId, date }) {
  const dayOfWeek = getDayOfWeekInSaoPaulo(date);

  const { data: singleIntervals, error: singleError } = await supabase
    .from("employee_intervals")
    .select("id, interval_type, specific_date, day_of_week, recurring_start_date, recurring_end_date, start_time, end_time, title")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .eq("interval_type", "single")
    .eq("specific_date", date);

  if (singleError) throw singleError;

  const { data: recurringIntervals, error: recurringError } = await supabase
    .from("employee_intervals")
    .select("id, interval_type, specific_date, day_of_week, recurring_start_date, recurring_end_date, start_time, end_time, title")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .eq("interval_type", "recurring")
    // Inclui intervalos recorrentes definidos para "todo dia" (day_of_week = 7)
    .or(`day_of_week.eq.7,day_of_week.eq.${dayOfWeek}`)
    .lte("recurring_start_date", date)
    .or(`recurring_end_date.is.null,recurring_end_date.gte.${date}`);

  if (recurringError) throw recurringError;

  const allIntervals = [...(singleIntervals || []), ...(recurringIntervals || [])];

  const ranges = allIntervals.map((item) => ({
    id: item.id,
    title: item.title || null,
    start: toSaoPauloDateTime(date, item.start_time),
    end: toSaoPauloDateTime(date, item.end_time),
  }));

  return {
    dayOfWeek,
    intervals: allIntervals,
    ranges,
  };
}

export function hasIntervalConflict({ startDateTime, endDateTime, intervalRanges }) {
  return (intervalRanges || []).some((interval) =>
    rangesOverlap(startDateTime, endDateTime, interval.start, interval.end)
  );
}
