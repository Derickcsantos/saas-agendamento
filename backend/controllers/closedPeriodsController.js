import { supabase } from "../lib/supabase.js";
import { redis } from "../lib/redis.js"; // você disse que já exporta { redis } em /lib

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

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Limita concorrência sem libs
async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let idx = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await mapper(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function getAllClosedPeriods(req, res) {
  try {
    const { slug } = req.params;
    const employeeIdRaw = req.query.employeeId;
    const durationRaw = req.query.duration;

    const employeeId = employeeIdRaw ? Number(employeeIdRaw) : null;
    const duration = durationRaw ? Number(durationRaw) : null;

    const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";

    const cacheKey = `unavailable-days:${slug}:${employeeId ?? "all"}:${duration ?? "nodur"}`;

    const CACHE_TTL_SECONDS = 100; 

    let cached = null;
      if (redis) {
        try {
          cached = await redis.get(cacheKey);
        } catch (e) {
          console.warn("Redis offline, seguindo sem cache:", e?.message || e);
        }
      }

      if (cached) return res.json(JSON.parse(cached));

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
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

    // 4) Se tiver employeeId: marcar dias que NÃO trabalha (work_schedules)
    // Estratégia:
    // - Buscar todas as linhas do employee
    // - Considerar que um dia é "trabalhável" se existir pelo menos 1 row com is_available=true
    let workingDowSet = null;

    if (employeeId) {
      const { data: schedules, error: scheduleError } = await supabase
        .from("work_schedules")
        .select("day_of_week,is_available,start_time,end_time")
        .eq("organization_id", org.id)
        .eq("employee_id", employeeId);

      if (scheduleError) throw scheduleError;

      // quais dias da semana ele trabalha (0..6)
      workingDowSet = new Set(
        (schedules || [])
          .filter((s) => s.is_available === true)
          .map((s) => Number(s.day_of_week))
          .filter((n) => Number.isFinite(n))
      );

      // se não tem nenhum dia disponível, marca tudo como indisponível
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
    }

    // 5) Se tiver duration + employeeId: verificar se existem horários disponíveis por dia
    // Só faz sentido checar dias que "trabalha" e que ainda não estão fechados por no_work/closed_period
    if (employeeId && duration && Number.isFinite(duration) && duration > 0) {
      const candidateDates = dates
        .map((d) => formatDateISO(d))
        .filter((iso) => {
          // se já indisponível por fechado/não trabalha, não precisa chamar API
          if (unavailableSet.has(iso)) return false;

          // se temos workingDowSet, filtra (segurança extra)
          if (workingDowSet) {
            const d = new Date(iso + "T00:00:00");
            const dow = getDayOfWeek(d);
            if (!workingDowSet.has(dow)) return false;
          }

          return true;
        });

      // Limite de concorrência
      const CONCURRENCY = 6;

      await mapWithConcurrency(candidateDates, CONCURRENCY, async (iso) => {
        const url =
          `${baseUrl}/api/appointments/available-times/${encodeURIComponent(slug)}` +
          `?employeeId=${encodeURIComponent(employeeId)}` +
          `&date=${encodeURIComponent(iso)}` +
          `&duration=${encodeURIComponent(duration)}`;

          console.log("available-times URL =>", url);

        const data = await fetchJson(url, { credentials: "include" });

        // Ajuste aqui conforme o retorno real da sua API.
        // Vou assumir que ela retorna um array de horários, tipo: ["09:00", "09:30"] OU { times: [] }
        const times = Array.isArray(data) ? data : (data?.times ?? data?.availableTimes ?? null);

        const hasTimes = Array.isArray(times) && times.length > 0;
        if (!hasTimes) addUnavailable(iso, "no_times");
      });
    }

    const unavailableDays = Array.from(unavailableSet).sort();

    const response = {
      organization_id: org.id,
      max_schedule_days: maxScheduleDays,
      unavailable_days: unavailableDays, // <- use isso no frontend
      reasons, // <- opcional, mas ajuda debug e UI
      closed_periods: closedPeriods || [], // <- se quiser também listar no frontend
    };

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(response), { EX: CACHE_TTL_SECONDS });
      } catch (e) {
        console.warn("Redis offline, não salvou cache:", e?.message || e);
      }
    }


    return res.json(response);
  } catch (error) {
    console.error("Error fetching unavailable days:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}


export async function getClosedPeriodsBySlug(req, res) {
  try {
    const { slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('closed_periods')
      .select('*')
      .eq('organization_id', org.id)
      .order('start_day', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching closed periods:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getClosedPeriodById(req, res) {
  try {
    const { id } = req.params;
    
    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", req.params.slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('closed_periods')
      .select('*')
      .eq('id', id)
      .eq('organization_id', org.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Período fechado não encontrado' });

    res.json(data);
  } catch (error) {
    console.error('Error fetching closed period:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createClosedPeriod(req, res) {
  try {
    const { slug } = req.params;
    const { start_day, end_day } = req.body;

    if (!start_day || !end_day) {
      return res.status(400).json({ error: 'Start day e end day são obrigatórios' });
    }

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('closed_periods')
      .insert([
        {
          organization_id: org.id,
          start_day,
          end_day,
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating closed period:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function updateClosedPeriod(req, res) {
  try {
    const { id, slug } = req.params;
    const { start_day, end_day } = req.body;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const updateData = {};
    if (start_day !== undefined) updateData.start_day = start_day;
    if (end_day !== undefined) updateData.end_day = end_day;

    const { data, error } = await supabase
      .from('closed_periods')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', org.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Período fechado não encontrado' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating closed period:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteClosedPeriod(req, res) {
  try {
    const { id, slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { error } = await supabase
      .from('closed_periods')
      .delete()
      .eq('id', id)
      .eq('organization_id', org.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting closed period:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
