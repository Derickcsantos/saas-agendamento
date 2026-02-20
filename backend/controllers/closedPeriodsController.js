import { supabase } from "../lib/supabase.js";
import { redis } from "../lib/redis.js"; // você disse que já exporta { redis } em /lib
import { computeUnavailableDaysResponse } from "../utils/unavailableDaysCache.js";

export async function getAllClosedPeriods(req, res) {
  try {
    const { slug } = req.params;
    const employeeIdRaw = req.query.employeeId;
    const durationRaw = req.query.duration;

    const employeeId = employeeIdRaw ? Number(employeeIdRaw) : null;
    const duration = durationRaw ? Number(durationRaw) : null;

    const cacheKey = `unavailable-days:${slug}:${employeeId ?? "all"}:${duration ?? "nodur"}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          res.json(JSON.parse(cached));

          computeUnavailableDaysResponse({ slug, employeeId, duration })
            .then(async (response) => {
              try {
                await redis.set(cacheKey, JSON.stringify(response));
              } catch (e) {
                console.warn("Redis offline, não salvou cache:", e?.message || e);
              }
            })
            .catch((e) => {
              console.warn("Falha ao atualizar cache de dias indisponíveis:", e?.message || e);
            });

          return;
        }
      } catch (e) {
        console.warn("Redis offline, seguindo sem cache:", e?.message || e);
      }
    }

    const response = await computeUnavailableDaysResponse({ slug, employeeId, duration });

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(response));
      } catch (e) {
        console.warn("Redis offline, não salvou cache:", e?.message || e);
      }
    }

    return res.json(response);
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ error: error.message });
    }
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
      .eq('period_id', id)
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
      .eq('period_id', id)
      .eq('organization_id', org.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting closed period:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
