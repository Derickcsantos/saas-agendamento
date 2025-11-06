import { supabase } from '../lib/supabase.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export async function getOrganizations(req, res) {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, email, phone, adress, is_active, logo_organization, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching organizações:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getOrganizationById(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, email, phone, adress, is_active, logo_organization, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Organização não encontrada' });

    res.json(data);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createOrganization(req, res) {
  try {
    const { name, email, phone, adress} = req.body;

    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `${uuidv4()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('organizations-logos')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('organizations-logos')
        .getPublicUrl(fileName);

      imagePath = publicUrl.publicUrl;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          name, 
          email, 
          phone, 
          adress, 
          is_active: true,
          logo_organization: imagePath,
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

export async function updateOrganization(req, res) {
  try {
    const { id } = req.params;
    const { name, email, phone, adress, is_active } = req.body;
    let imageUrl = null;

    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `${uuidv4()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('organizations-logos')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('organizations-logos')
        .getPublicUrl(fileName);

      imageUrl = publicUrl.publicUrl;
    }

    const updateData = {
      name, 
      email, 
      phone, 
      adress, 
      is_active,
      ...(imageUrl && { logo_organization: imageUrl }),
    };

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteOrganization(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
