import { supabase } from '../lib/supabase.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// 🚀 CACHE SYSTEM
const cacheStore = new Map(); // { organizationId: { data: [...], timestamp: number } }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function setCategoryCache(orgId, data) {
  cacheStore.set(`categories_${orgId}`, {
    data,
    timestamp: Date.now(),
  });
}

function getCategoryCache(orgId) {
  const cached = cacheStore.get(`categories_${orgId}`);
  if (!cached) return null;
  
  // Verifica se cache expirou
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cacheStore.delete(`categories_${orgId}`);
    return null;
  }
  
  return cached.data;
}

function invalidateCategoryCache(orgId) {
  cacheStore.delete(`categories_${orgId}`);
}

export async function getAllCategories(req, res) {
  try {
    const { slug } = req.params;
    const { search } = req.query; // Parâmetro de busca

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // ✅ Tenta buscar do cache se não houver search
    let categories = null;
    
    if (!search) {
      categories = getCategoryCache(org.id);
    }

    // Se não tem no cache, busca do banco
    if (!categories) {
      let query = supabase
        .from('categories')
        .select(`
          id, 
          name, 
          imagem_category  
        `)
        .eq('organization_id', org.id)
        .order('name', { ascending: true });

      // Aplica filtro de busca se fornecido
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      categories = data;

      // Salva no cache apenas se não houver filtro
      if (!search) {
        setCategoryCache(org.id, categories);
      }
    }

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organizationId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Categoria não encontrada' });

    res.json(data);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createCategory(req, res) {
  try {
    const { name } = req.body;
    const { slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    let imagePath = null;

    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `${uuidv4()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('category-images')
        .getPublicUrl(fileName);

      imagePath = publicUrl.publicUrl;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          organization_id: org.id,
          name,
          imagem_category: imagePath,
        },
      ])
      .select();

    if (error) throw error;
    
    // 🚀 Invalida cache após criar
    invalidateCategoryCache(org.id);
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id, slug } = req.params;
    const { name } = req.body;
    let imageUrl = null;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `${uuidv4()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('category-images')
        .getPublicUrl(fileName);

      imageUrl = publicUrl.publicUrl;
    }

    const updateData = {
      name,
      ...(imageUrl && { imagem_category: imageUrl } || { imagem_category: 'https://static.vecteezy.com/system/resources/thumbnails/000/584/379/small/Abstract_white_background_15.jpg' } ),
    };

    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    // 🚀 Invalida cache após atualizar
    invalidateCategoryCache(org.id);

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteCategory(req, res) {
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

    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) throw error;
    
    // 🚀 Invalida cache após deletar
    invalidateCategoryCache(org.id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
