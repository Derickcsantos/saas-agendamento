import { supabase } from '../lib/supabase.js';
import express from 'express';

export const getAppointmentServices =  async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, category_id, duration, price, imagem_service')
      .eq('organization_id', req.organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAppointmentServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration, imagem_service')
      .eq('category_id', categoryId)
      .eq('organization_id', req.organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Converter imagens base64 para URLs de dados
    const servicesWithImages = data.map(service => {
      return {
        ...service,
        imagem_service: service.imagem_service 
          ? service.imagem_service
          : null
      };
    });
    
    res.json(servicesWithImages);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};