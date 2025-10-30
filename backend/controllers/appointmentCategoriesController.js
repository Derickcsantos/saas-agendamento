import { supabase } from '../lib/supabase.js';
import express from 'express';

export const getAppointmentCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, imagem_category')
      .eq('organization_id', req.organizationId)
      .not('name', 'eq', 'Interno')
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Converter imagens base64 para URLs de dados
    const categoriesWithImages = data.map(category => {
      return {
        ...category,
        imagem_category: category.imagem_category 
          ? category.imagem_category
          : null
      };
    });
    
    res.json(categoriesWithImages);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
