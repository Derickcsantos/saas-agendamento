import express from "express";
import { supabase } from "../lib/supabase.js";

/* =====================================================
   GET LANDING PAGE BY SLUG
===================================================== */
export const getLandingPageBySlug = async (req, res) => {
  const { slug } = req.params;

  try {
    const { data, error } = await supabase
      .from("organization_landing")
      .select(`
        landing_id,
        slug,
        meta_title,
        meta_description,
        meta_keywords,
        whatsapp,
        instagram,
        email,
        endereco,
        telefone,
        hero_title,
        hero_subtitle,
        about_title,
        about_text,
        services_title,
        contact_title,
        gallery_title,
        gallery_subtitle,
        show_gallery,
        testimonials_title,
        testimonials_subtitle,
        show_testimonials,
        team_title,
        team_subtitle,
        show_team,
        hero_image_url,
        about_image_url,
        open_graph_title,
        open_graph_description,
        open_graph_image,
        favicon_url,
        background_image_url,
        background_pattern,
        background_opacity,
        background_blur,
        created_at,
        updated_at,

        organizations:organization_id (
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
      return res.status(404).json({ error: "Landing page não encontrada" });
    }

    res.json(data);
  } catch (err) {
    console.error("Erro ao buscar landing page:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

/* =====================================================
   CREATE LANDING PAGE (caso queira manter uma criação base)
===================================================== */
export const createLandingPage = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const payload = {
      ...req.body,
      organization_id: org.id,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("organization_landing")
      .insert([payload])
      .select("*")
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("Erro ao criar landing:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

/* =====================================================
   UPDATE LANDING PAGE
   Corrigido e atualizado para TODOS os novos campos
===================================================== */

export const updateLandingPage = async (req, res) => {
  try {
    const { slug } = req.params;

    // verifica se org existe
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const allowedFields = [
      "meta_title",
      "meta_description",
      "meta_keywords",
      "whatsapp",
      "instagram",
      "email",
      "telefone",
      "endereco",
      "hero_title",
      "hero_subtitle",
      "hero_image_url",
      "hero_button_text",
      "hero_button_url",
      "about_title",
      "about_text",
      "about_image_url",
      "services_title",
      "contact_title",
      "gallery_title",
      "gallery_subtitle",
      "show_gallery",
      "testimonials_title",
      "testimonials_subtitle",
      "show_testimonials",
      "team_title",
      "team_subtitle",
      "show_team",
      "open_graph_title",
      "open_graph_description",
      "open_graph_image",
      "favicon_url",
      "google_analytics_id",
      "facebook_pixel_id",
      "custom_css",
      "custom_js",
      "background_image_url",
      "background_pattern",
      "background_opacity",
      "background_blur",
      "published"
    ];

    // Extrai somente campos permitidos
    let updateData = {};
    for (let key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("organization_landing")
      .update(updateData)
      .eq("organization_id", org.id)
      .select("*")
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Erro ao atualizar landing:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

/* =====================================================
   DELETE LANDING PAGE (opcional)
===================================================== */

export const deleteLandingPage = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { error } = await supabase
      .from("organization_landing")
      .delete()
      .eq("organization_id", org.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao excluir landing:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
