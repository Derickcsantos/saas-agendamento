import express from 'express';
import { supabase } from '../lib/supabase.js';

export const getLandingPageBySlug = async (req, res) => {
  const { slug } = req.params;

  try {
    const { data, error } = await supabase
      .from("organization_landing")
      .select(`
        *,
        organizations (
          id,
          name,
          email,
          phone,
          address,
          logo_organization
        )
      `)
      .eq("slug", slug)
      .single();


    if (error || !data) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    res.json(data);
  } catch (err) {
    console.error("Erro ao buscar organização:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};