import express from 'express';
import { supabase } from '../lib/supabase.js';
import sharp from 'sharp';


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
      .select('id, name, category_id, duration, price, categories(name), is_online, durability_days')
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
      .select('id, name, category_id, duration, price, categories(name), is_online, durability_days')
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
    const { category_id, name, description, duration, price, is_online, durability_days } = req.body;
    const { slug } = req.params;
    let imageUrl = null;

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

    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      // nome único do arquivo
      const fileName = `service-${Date.now()}.webp`;

      // upload para o bucket "services-image"
      const { error: uploadError } = await supabase.storage
        .from('services-images')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false, // evita sobrescrever
        });

      if (uploadError) throw uploadError;

      // gera a URL pública
      const { data: publicUrl } = supabase.storage
        .from('services-images')
        .getPublicUrl(fileName);

      imageUrl = publicUrl.publicUrl;
    }

    const { data, error } = await supabase
      .from('services')
      .insert([{ 
        category_id, 
        name, 
        description, 
        duration, 
        organization_id: orgData.id,
        price,
        imagem_service: imageUrl, 
        is_online: !!is_online,
        durability_days
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateService = async (req, res) => {
  try {
    console.log('api funcionando')
    const { slug, id } = req.params;
    const { category_id, name, description, duration, price, is_online, durability_days } = req.body;
    let imageData = null;

    // Se enviou nova imagem, converte para base64
    if (req.file) {
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 600 }) // opcional: redimensiona para largura máxima de 600px
      .webp({ quality: 80 }) // converte para webp com qualidade razoável
      .toBuffer();

      imageData = buffer.toString('base64'); // se ainda quiser salvar como base64
    }

    const updateData = { 
      category_id,
      name,
      description,
      duration,
      price,
      is_online: !!is_online,
      durability_days,
      ...(imageData && { imagem_service: imageData })
    };

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
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