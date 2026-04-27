import { supabase } from "../lib/supabase.js";
import { isUserAdmin } from "../middlewares/authMiddleware.js";
import {
  getEmployeeIntervalsForDate,
  hasIntervalConflict,
  normalizeTime,
  rangesOverlap,
  toSaoPauloDateTime,
} from "../utils/employeeIntervals.js";

async function getOrganizationBySlug(slug) {
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug_organization", slug)
    .single();

  if (error || !org) return null;
  return org;
}

async function getEmployeeByUser({ organizationId, userId }) {
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function ensureEmployeeBelongsToOrganization({ organizationId, employeeId }) {
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

function validateIntervalPayload(payload) {
  const {
    interval_type,
    specific_date,
    day_of_week,
    recurring_start_date,
    recurring_end_date,
    start_time,
    end_time,
  } = payload;

  const type = String(interval_type || "single").toLowerCase();
  if (!["single", "recurring"].includes(type)) {
    return { ok: false, message: "interval_type inválido. Use 'single' ou 'recurring'." };
  }

  if (!start_time || !end_time) {
    return { ok: false, message: "start_time e end_time são obrigatórios." };
  }

  const normalizedStartTime = normalizeTime(start_time);
  const normalizedEndTime = normalizeTime(end_time);

  const startDate = toSaoPauloDateTime("2026-01-01", normalizedStartTime);
  const endDate = toSaoPauloDateTime("2026-01-01", normalizedEndTime);

  if (!(startDate < endDate)) {
    return { ok: false, message: "Intervalo inválido: start_time deve ser menor que end_time." };
  }

  if (type === "single") {
    if (!specific_date) {
      return { ok: false, message: "specific_date é obrigatório para intervalos únicos." };
    }

    return {
      ok: true,
      data: {
        interval_type: "single",
        specific_date,
        day_of_week: null,
        recurring_start_date: null,
        recurring_end_date: null,
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
      },
    };
  }

  if (!Number.isInteger(Number(day_of_week)) || Number(day_of_week) < 0 || Number(day_of_week) > 6) {
    return { ok: false, message: "day_of_week deve estar entre 0 e 6 para intervalos recorrentes." };
  }

  if (!recurring_start_date) {
    return { ok: false, message: "recurring_start_date é obrigatório para intervalos recorrentes." };
  }

  if (recurring_end_date && recurring_end_date < recurring_start_date) {
    return { ok: false, message: "recurring_end_date deve ser maior ou igual a recurring_start_date." };
  }

  return {
    ok: true,
    data: {
      interval_type: "recurring",
      specific_date: null,
      day_of_week: Number(day_of_week),
      recurring_start_date,
      recurring_end_date: recurring_end_date || null,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
    },
  };
}

function dateRangesOverlap(startA, endA, startB, endB) {
  const aStart = new Date(`${startA}T00:00:00-03:00`);
  const bStart = new Date(`${startB}T00:00:00-03:00`);
  const aEnd = endA ? new Date(`${endA}T23:59:59-03:00`) : new Date("9999-12-31T23:59:59-03:00");
  const bEnd = endB ? new Date(`${endB}T23:59:59-03:00`) : new Date("9999-12-31T23:59:59-03:00");
  return aStart <= bEnd && bStart <= aEnd;
}

async function ensureNoOverlap({
  organizationId,
  employeeId,
  payload,
  ignoreIntervalId = null,
}) {
  if (payload.interval_type === "single") {
    const result = await getEmployeeIntervalsForDate({
      organizationId,
      employeeId,
      date: payload.specific_date,
    });

    const start = toSaoPauloDateTime(payload.specific_date, payload.start_time);
    const end = toSaoPauloDateTime(payload.specific_date, payload.end_time);

    const hasConflict = (result.ranges || []).some((item) => {
      if (ignoreIntervalId && Number(item.id) === Number(ignoreIntervalId)) return false;
      return rangesOverlap(start, end, item.start, item.end);
    });

    if (hasConflict) {
      throw new Error("Já existe um intervalo sobreposto para este funcionário nesta data.");
    }

    return;
  }

  const { data: recurring, error } = await supabase
    .from("employee_intervals")
    .select("id, day_of_week, recurring_start_date, recurring_end_date, start_time, end_time")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .eq("interval_type", "recurring")
    .eq("day_of_week", payload.day_of_week);

  if (error) throw error;

  const newStart = toSaoPauloDateTime("2026-01-01", payload.start_time);
  const newEnd = toSaoPauloDateTime("2026-01-01", payload.end_time);

  const hasRecurringConflict = (recurring || []).some((item) => {
    if (ignoreIntervalId && Number(item.id) === Number(ignoreIntervalId)) return false;

    const overlapByDate = dateRangesOverlap(
      payload.recurring_start_date,
      payload.recurring_end_date,
      item.recurring_start_date,
      item.recurring_end_date
    );

    if (!overlapByDate) return false;

    const existingStart = toSaoPauloDateTime("2026-01-01", item.start_time);
    const existingEnd = toSaoPauloDateTime("2026-01-01", item.end_time);
    return rangesOverlap(newStart, newEnd, existingStart, existingEnd);
  });

  if (hasRecurringConflict) {
    throw new Error("Já existe um intervalo recorrente sobreposto para este funcionário.");
  }
}

export async function getEmployeeIntervals(req, res) {
  try {
    const { slug } = req.params;
    const employeeIdQuery = req.query.employee_id ? Number(req.query.employee_id) : null;

    const org = await getOrganizationBySlug(slug);
    if (!org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const admin = isUserAdmin(req);
    let effectiveEmployeeId = employeeIdQuery;

    if (!admin) {
      const ownEmployee = await getEmployeeByUser({
        organizationId: org.id,
        userId: req.user?.id,
      });

      if (!ownEmployee) {
        return res.status(403).json({ error: "Usuário sem vínculo com funcionário na organização." });
      }

      effectiveEmployeeId = ownEmployee.id;
    } else if (employeeIdQuery && !Number.isInteger(employeeIdQuery)) {
      return res.status(400).json({ error: "employee_id inválido." });
    }

    let query = supabase
      .from("employee_intervals")
      .select("*, employees(name)")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false });

    if (effectiveEmployeeId) {
      query = query.eq("employee_id", effectiveEmployeeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    console.error("Erro ao listar intervalos de funcionários:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createEmployeeInterval(req, res) {
  try {
    const { slug } = req.params;
    const {
      employee_id,
      interval_type,
      specific_date,
      day_of_week,
      recurring_start_date,
      recurring_end_date,
      start_time,
      end_time,
      title,
      is_active,
    } = req.body || {};

    const employeeId = Number(employee_id);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({ error: "employee_id inválido." });
    }

    const org = await getOrganizationBySlug(slug);
    if (!org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const admin = isUserAdmin(req);
    if (!admin) {
      const ownEmployee = await getEmployeeByUser({
        organizationId: org.id,
        userId: req.user?.id,
      });

      if (!ownEmployee || ownEmployee.id !== employeeId) {
        return res.status(403).json({ error: "Você só pode criar intervalos para a sua agenda." });
      }
    }

    const employeeBelongs = await ensureEmployeeBelongsToOrganization({
      organizationId: org.id,
      employeeId,
    });

    if (!employeeBelongs) {
      return res.status(404).json({ error: "Funcionário não encontrado na organização." });
    }

    const validation = validateIntervalPayload({
      interval_type,
      specific_date,
      day_of_week,
      recurring_start_date,
      recurring_end_date,
      start_time,
      end_time,
    });

    if (!validation.ok) {
      return res.status(400).json({ error: validation.message });
    }

    await ensureNoOverlap({
      organizationId: org.id,
      employeeId,
      payload: validation.data,
    });

    const payload = {
      organization_id: org.id,
      employee_id: employeeId,
      ...validation.data,
      title: title || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    };

    const { data, error } = await supabase
      .from("employee_intervals")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    console.error("Erro ao criar intervalo do funcionário:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

export async function updateEmployeeInterval(req, res) {
  try {
    const { slug, id } = req.params;
    const intervalId = Number(id);

    if (!Number.isInteger(intervalId) || intervalId <= 0) {
      return res.status(400).json({ error: "id inválido." });
    }

    const org = await getOrganizationBySlug(slug);
    if (!org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data: existing, error: existingError } = await supabase
      .from("employee_intervals")
      .select("*")
      .eq("id", intervalId)
      .eq("organization_id", org.id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: "Intervalo não encontrado." });
    }

    const admin = isUserAdmin(req);
    if (!admin) {
      const ownEmployee = await getEmployeeByUser({
        organizationId: org.id,
        userId: req.user?.id,
      });

      if (!ownEmployee || ownEmployee.id !== existing.employee_id) {
        return res.status(403).json({ error: "Você só pode atualizar intervalos da sua agenda." });
      }
    }

    const merged = {
      ...existing,
      ...req.body,
      interval_type: req.body.interval_type ?? existing.interval_type,
      specific_date: req.body.specific_date ?? existing.specific_date,
      day_of_week: req.body.day_of_week ?? existing.day_of_week,
      recurring_start_date: req.body.recurring_start_date ?? existing.recurring_start_date,
      recurring_end_date: req.body.recurring_end_date ?? existing.recurring_end_date,
      start_time: req.body.start_time ?? existing.start_time,
      end_time: req.body.end_time ?? existing.end_time,
    };

    const validation = validateIntervalPayload(merged);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.message });
    }

    await ensureNoOverlap({
      organizationId: org.id,
      employeeId: existing.employee_id,
      payload: validation.data,
      ignoreIntervalId: existing.id,
    });

    const updatePayload = {
      ...validation.data,
      title: req.body.title !== undefined ? req.body.title : existing.title,
      is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : existing.is_active,
    };

    const { data: updated, error: updateError } = await supabase
      .from("employee_intervals")
      .update(updatePayload)
      .eq("id", existing.id)
      .eq("organization_id", org.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar intervalo do funcionário:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

export async function deleteEmployeeInterval(req, res) {
  try {
    const { slug, id } = req.params;
    const intervalId = Number(id);

    if (!Number.isInteger(intervalId) || intervalId <= 0) {
      return res.status(400).json({ error: "id inválido." });
    }

    const org = await getOrganizationBySlug(slug);
    if (!org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data: existing, error: existingError } = await supabase
      .from("employee_intervals")
      .select("id, employee_id")
      .eq("id", intervalId)
      .eq("organization_id", org.id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: "Intervalo não encontrado." });
    }

    const admin = isUserAdmin(req);
    if (!admin) {
      const ownEmployee = await getEmployeeByUser({
        organizationId: org.id,
        userId: req.user?.id,
      });

      if (!ownEmployee || ownEmployee.id !== existing.employee_id) {
        return res.status(403).json({ error: "Você só pode remover intervalos da sua agenda." });
      }
    }

    const { error } = await supabase
      .from("employee_intervals")
      .delete()
      .eq("id", intervalId)
      .eq("organization_id", org.id);

    if (error) throw error;

    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao remover intervalo do funcionário:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
