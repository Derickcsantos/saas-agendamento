import { supabase } from '../lib/supabase.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export async function getAllCategories(req, res) {
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
      .from('categories')
      .select(`
        id, 
        name, 
        imagem_category  
      `)
      .eq('organization_id', org.id)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
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
      ...(imageUrl && { imagem_category: imageUrl }),
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

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id, slug } = req.params;
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
