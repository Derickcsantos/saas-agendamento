import { supabase } from "../lib/supabase.js";
import { redis } from "../lib/redis.js";
import { computeUnavailableDaysResponse } from "./unavailableDaysCache.js";

let employeeQueue = [];
let queueIndex = 0;

async function buildEmployeeQueue() {
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, duration, organization_id");

  if (servicesError) throw servicesError;

  const serviceDurationById = new Map(
    (services || []).map((srv) => [srv.id, Number(srv.duration)])
  );

  const { data: employeeServices, error: employeeServicesError } = await supabase
    .from("employee_services")
    .select("employee_id, service_id, organization_id");

  if (employeeServicesError) throw employeeServicesError;

  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, slug_organization");

  if (orgsError) throw orgsError;

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id, organization_id, is_active");

  if (employeesError) throw employeesError;

  const orgSlugById = new Map((orgs || []).map((o) => [o.id, o.slug_organization]));

  const durationsByEmployee = new Map();

  for (const row of employeeServices || []) {
    const duration = serviceDurationById.get(row.service_id);
    if (!duration || !Number.isFinite(duration)) continue;

    const key = `${row.organization_id}:${row.employee_id}`;
    if (!durationsByEmployee.has(key)) durationsByEmployee.set(key, new Set());
    durationsByEmployee.get(key).add(duration);
  }

  const queue = [];

  for (const emp of employees || []) {
    if (!emp?.is_active) continue;

    const slug = orgSlugById.get(emp.organization_id);
    if (!slug) continue;

    const key = `${emp.organization_id}:${emp.id}`;
    const durationsSet = durationsByEmployee.get(key);
    if (!durationsSet || durationsSet.size === 0) continue;

    queue.push({
      slug,
      employeeId: emp.id,
      durations: Array.from(durationsSet),
    });
  }

  employeeQueue = queue;
  queueIndex = 0;
}

async function runNextEmployeeCacheJob() {
  if (!redis) return;

  if (!employeeQueue.length || queueIndex >= employeeQueue.length) {
    await buildEmployeeQueue();
  }

  if (!employeeQueue.length) return;

  const task = employeeQueue[queueIndex];
  queueIndex = (queueIndex + 1) % employeeQueue.length;

  for (const duration of task.durations) {
    const cacheKey = `unavailable-days:${task.slug}:${task.employeeId}:${duration}`;

    const response = await computeUnavailableDaysResponse({
      slug: task.slug,
      employeeId: task.employeeId,
      duration,
    });

    await redis.set(cacheKey, JSON.stringify(response));
  }
}

export function startUnavailableDaysCacheJob({ intervalMs = 180000 } = {}) {
  runNextEmployeeCacheJob().catch((e) => {
    console.warn("Falha ao executar job de cache de dias indisponíveis:", e?.message || e);
  });

  setInterval(() => {
    runNextEmployeeCacheJob().catch((e) => {
      console.warn("Falha ao executar job de cache de dias indisponíveis:", e?.message || e);
    });
  }, intervalMs);
}