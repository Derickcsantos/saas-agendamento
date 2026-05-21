import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { supabase } from "../lib/supabase.js";
import { invalidateCatalogCache } from "../utils/catalogCache.js";

// 🚀 CACHE SYSTEM
const cacheStore = new Map(); // { organizationId: { data: [...], timestamp: number } }
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 dia

function setServiceCache(orgId, data) {
  cacheStore.set(`services_${orgId}`, {
    data,
    timestamp: Date.now(),
  });
}

function getServiceCache(orgId) {
  const cached = cacheStore.get(`services_${orgId}`);
  if (!cached) return null;
  
  // Verifica se cache expirou
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cacheStore.delete(`services_${orgId}`);
    return null;
  }
  
  return cached.data;
}

function invalidateServiceCache(orgId) {
  cacheStore.delete(`services_${orgId}`);
}

function toNumberOrNull(v) {
  if (v === undefined || v === null) return null;
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBoolean(v) {
  // FormData manda string
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === "string") return v === "true" || v === "1" || v === "on";
  return false;
}

async function uploadServiceImage(file) {
  const buffer = await sharp(file.buffer)
    .resize({ width: 600 })
    .webp({ quality: 80 })
    .toBuffer();

  const fileName = `${uuidv4()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("services-images")
    .upload(fileName, buffer, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage
    .from("services-images")
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

async function getNextServiceOrder(organizationId) {
  const { data, error } = await supabase
    .from("services")
    .select("order_service")
    .eq("organization_id", organizationId)
    .order("order_service", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.order_service || 0) + 1;
}

export const getServices = async (req, res) => {
  try {
    const { name } = req.query;
    const { slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // ✅ Tenta buscar do cache se não houver search
    let services = null;
    
    if (!name) {
      services = getServiceCache(org.id);
    }

    // Se não tem no cache, busca do banco
    if (!services) {
      let query = supabase
        .from('services')
        .select('id, name, category_id, duration, price, order_service, categories(name), is_online, durability_days, imagem_service')
        .eq('organization_id', org.id)
        .order('order_service', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      // Se o parâmetro `name` for fornecido, aplica o filtro
      if (name) {
        query = query.ilike('name', `%${name}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar dados do Supabase:', error);
        throw error;
      }

      services = data;

      // Salva no cache apenas se não houver filtro
      if (!name) {
        setServiceCache(org.id, services);
      }
    }

    res.json(services);
  } catch (error) {
    console.error('Erro no servidor ao buscar serviços:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('services')
      .select('*, categories(name)')
      .eq('id', id)
      .eq('organization_id', req.organizationId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Serviço não encontrado' });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getServicesBySlug = async (req, res) => {
  try{ 
    const { slug } = req.params;
    const { name } = req.query; // 🔍 Adiciona suporte a busca

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    // Busca o organization_id correspondente ao slug
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // ✅ Tenta buscar do cache se não houver search
    let services = null;
    
    if (!name) {
      services = getServiceCache(orgData.id);
    }

    // Se não tem no cache, busca do banco
    if (!services) {
      let query = supabase
        .from('services')
        .select('id, name, category_id, duration, price, order_service, categories(name), is_online, durability_days, imagem_service')
        .eq('organization_id', orgData.id)
        .order('order_service', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      // Aplica filtro de busca se fornecido
      if (name) {
        query = query.ilike('name', `%${name}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      services = data;

      // Salva no cache apenas se não houver filtro
      if (!name) {
        setServiceCache(orgData.id, services);
      }
    }
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAdditionalServicesByServiceSlug = async (req, res) => {
  try {
    const { slug, serviceId } = req.params;
    const serviceIdInt = Number(serviceId);

    if (!slug || !Number.isInteger(serviceIdInt) || serviceIdInt <= 0) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", serviceIdInt)
      .eq("organization_id", orgData.id)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    const { data: links, error: linksError } = await supabase
      .from("additional_services")
      .select("additional_id, subservice_id")
      .eq("service_id", serviceIdInt)
      .order("additional_id", { ascending: true });

    if (linksError) throw linksError;

    const subserviceIds = [...new Set((links || []).map((item) => item.subservice_id).filter(Boolean))];

    let subservicesById = new Map();
    if (subserviceIds.length) {
      const { data: subservices, error: subservicesError } = await supabase
        .from("services")
        .select("id, name, price, duration, imagem_service")
        .in("id", subserviceIds)
        .eq("organization_id", orgData.id);

      if (subservicesError) throw subservicesError;

      subservicesById = new Map((subservices || []).map((serviceItem) => [serviceItem.id, serviceItem]));
    }

    const payload = (links || [])
      .map((item) => ({
        additional_id: item.additional_id,
        subservice_id: item.subservice_id,
        subservice: subservicesById.get(item.subservice_id) || null,
      }))
      .filter((item) => !!item.subservice);

    return res.json(payload);
  } catch (error) {
    console.error("Error fetching additional services:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateAdditionalServicesByServiceSlug = async (req, res) => {
  try {
    const { slug, serviceId } = req.params;
    const serviceIdInt = Number(serviceId);
    const incomingIds = Array.isArray(req.body?.additional_service_ids)
      ? req.body.additional_service_ids
      : [];

    if (!slug || !Number.isInteger(serviceIdInt) || serviceIdInt <= 0) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    const sanitizedIds = [...new Set(
      incomingIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0 && value !== serviceIdInt)
    )];

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", serviceIdInt)
      .eq("organization_id", orgData.id)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    if (sanitizedIds.length > 0) {
      const { data: existingSubservices, error: existingSubservicesError } = await supabase
        .from("services")
        .select("id")
        .in("id", sanitizedIds)
        .eq("organization_id", orgData.id);

      if (existingSubservicesError) throw existingSubservicesError;

      const validIds = new Set((existingSubservices || []).map((row) => row.id));
      if (validIds.size !== sanitizedIds.length) {
        return res.status(400).json({ error: "Há subserviços inválidos para esta organização" });
      }
    }

    const { error: deleteError } = await supabase
      .from("additional_services")
      .delete()
      .eq("service_id", serviceIdInt);

    if (deleteError) throw deleteError;

    if (sanitizedIds.length > 0) {
      const payload = sanitizedIds.map((subserviceId) => ({
        service_id: serviceIdInt,
        subservice_id: subserviceId,
      }));

      const { error: insertError } = await supabase
        .from("additional_services")
        .insert(payload);

      if (insertError) throw insertError;
    }

    invalidateServiceCache(orgData.id);
    invalidateCatalogCache(orgData.id);

    return res.json({ success: true });
  } catch (error) {
    console.error("Error updating additional services:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const createService = async (req, res) => {
  try {
    const { slug } = req.params;
    const { category_id, name, description, duration, price, is_online, durability_days } = req.body;

    console.log('📝 Criando serviço:', { slug, name, has_file: !!req.file });

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    let imageUrl = null;
    if (req.file) {
      try {
        imageUrl = await uploadServiceImage(req.file);
        console.log('✅ Imagem enviada com sucesso:', imageUrl);
      } catch (uploadError) {
        console.error('❌ Erro ao fazer upload da imagem:', uploadError);
        return res.status(400).json({ error: "Erro ao fazer upload da imagem" });
      }
    }

    const payload = {
      organization_id: orgData.id,
      category_id: category_id || null,
      name,
      description: description || null,
      duration: toNumberOrNull(duration),
      price: toNumberOrNull(price),
      durability_days: toNumberOrNull(durability_days) ?? 0,
      is_online: toBoolean(is_online),
      imagem_service: imageUrl,
      order_service: await getNextServiceOrder(orgData.id),
    };

    const { data, error } = await supabase.from("services").insert([payload]).select();

    if (error) throw error;
    
    // 🚀 Invalida cache após criar
    invalidateServiceCache(orgData.id);
    invalidateCatalogCache(orgData.id);
    
    console.log('✅ Serviço criado com sucesso:', data[0].id);
    return res.status(201).json(data[0]);
  } catch (error) {
    console.error("❌ Erro ao criar serviço:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const updateService = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const { category_id, name, description, duration, price, is_online, durability_days } = req.body;

    console.log('📝 Atualizando serviço:', { slug, id, name, has_file: !!req.file });

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const updateData = {
      category_id: category_id || null,
      name,
      description: description || null,
      duration: toNumberOrNull(duration),
      price: toNumberOrNull(price),
      durability_days: toNumberOrNull(durability_days) ?? 0,
      is_online: toBoolean(is_online),
    };

    // Apenas fazer upload se houver arquivo
    if (req.file) {
      try {
        const imageUrl = await uploadServiceImage(req.file);
        updateData.imagem_service = imageUrl;
        console.log('✅ Imagem enviada com sucesso:', imageUrl);
      } catch (uploadError) {
        console.error('❌ Erro ao fazer upload da imagem:', uploadError);
        return res.status(400).json({ error: "Erro ao fazer upload da imagem" });
      }
    }

    const { data, error } = await supabase
      .from("services")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", orgData.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: "Serviço não encontrado" });

    // 🚀 Invalida cache após atualizar
    invalidateServiceCache(orgData.id);
    invalidateCatalogCache(orgData.id);

    console.log('✅ Serviço atualizado com sucesso:', id);
    return res.json(data[0]);
  } catch (error) {
    console.error("❌ Erro ao atualizar serviço:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id, slug } = req.params;

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // 🚀 Invalida cache após deletar
    invalidateServiceCache(orgData.id);
    invalidateCatalogCache(orgData.id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reorderServices = async (req, res) => {
  try {
    const { slug } = req.params;
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];

    if (!ids.length || ids.length !== new Set(ids).size) {
      return res.status(400).json({ error: "Lista de servicos invalida" });
    }

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: "Organizacao nao encontrada" });
    }

    const { data: existing, error: existingError } = await supabase
      .from("services")
      .select("id, order_service")
      .eq("organization_id", orgData.id);

    if (existingError) throw existingError;

    const existingIds = new Set((existing || []).map((service) => service.id));
    const includesEveryService = (existing || []).length === ids.length
      && ids.every((id) => existingIds.has(id));

    if (!includesEveryService) {
      return res.status(400).json({ error: "Ha servicos invalidos para esta organizacao" });
    }

    const maxOrder = Math.max(
      0,
      ...(existing || []).map((service) => Number(service.order_service) || 0)
    );

    const temporaryResults = await Promise.all(
      ids.map((id, index) =>
        supabase
          .from("services")
          .update({ order_service: maxOrder + index + 1 })
          .eq("id", id)
          .eq("organization_id", orgData.id)
      )
    );

    const temporaryFailed = temporaryResults.find((result) => result.error);
    if (temporaryFailed?.error) throw temporaryFailed.error;

    const results = await Promise.all(
      ids.map((id, index) =>
        supabase
          .from("services")
          .update({ order_service: index + 1 })
          .eq("id", id)
          .eq("organization_id", orgData.id)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    invalidateServiceCache(orgData.id);
    invalidateCatalogCache(orgData.id);

    return res.json({ success: true });
  } catch (error) {
    console.error("Error reordering services:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};
