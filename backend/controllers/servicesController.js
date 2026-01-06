import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { supabase } from "../lib/supabase.js";

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

    let query = supabase
      .from('services')
      .select('id, name, category_id, duration, price, categories(name), is_online, durability_days, imagem_service')
      .eq('organization_id', org.id)
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

    res.json(data);
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
    const { slug } = req.params

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

    const { data, error } = await supabase
      .from('services')
      .select('id, name, category_id, duration, price, categories(name), is_online, durability_days, imagem_service')
      .eq('organization_id', orgData.id)


    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Serviço não encontrado' });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const createService = async (req, res) => {
  try {
    const { slug } = req.params;
    const { category_id, name, description, duration, price, is_online, durability_days } = req.body;

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
      imageUrl = await uploadServiceImage(req.file);
    }

    const payload = {
      organization_id: orgData.id,
      category_id: category_id || null,
      name,
      description: description || null,
      duration: toNumberOrNull(duration),          // ✅ numeric
      price: toNumberOrNull(price),                // ✅ numeric (null se "")
      durability_days: toNumberOrNull(durability_days) ?? 0, // ✅ numeric
      is_online: toBoolean(is_online),             // ✅ boolean real
      imagem_service: imageUrl,
    };

    const { data, error } = await supabase.from("services").insert([payload]).select();

    if (error) throw error;
    return res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error creating service:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const updateService = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const { category_id, name, description, duration, price, is_online, durability_days } = req.body;

    // (Opcional, mas recomendo) garantir que o serviço pertence à org do slug
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
      imageUrl = await uploadServiceImage(req.file); // ✅ agora faz upload igual categorias
    }

    const updateData = {
      category_id: category_id || null,
      name,
      description: description || null,
      duration: toNumberOrNull(duration),
      price: toNumberOrNull(price),
      durability_days: toNumberOrNull(durability_days) ?? 0,
      is_online: toBoolean(is_online),
      ...(imageUrl ? { imagem_service: imageUrl } : {}),
    };

    const { data, error } = await supabase
      .from("services")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", orgData.id) // ✅ evita editar serviço de outra org
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: "Serviço não encontrado" });

    return res.json(data[0]);
  } catch (error) {
    console.error("Error updating service:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};