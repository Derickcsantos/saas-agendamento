import express from 'express'
import { supabase } from '../lib/supabase.js';
import { hashPassword } from '../utils/password.js';

export const getUserRepresentatives = async (req, res) => {
  try {

    const { data, error } = await supabase
      .from('organization_representative')
      .select(`
        representative_id, 
        users (
          id,
          username,
          email,
          phone
        ), 
        organizations (
          id,
          name,
          address,
          document_type,
          document_number,
          slug_organization,
          logo_organization
        ),
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserRepresentativeBySlug = async (req, res) => {
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
      .from('organization_representative')
      .select(`
        representative_id,
        organization_id,
        users (
          id,
          username,
          email,
          phone
        ), 
        organizations (
          id,
          name,
          address,
          document_type,
          document_number,
          slug_organization,
          logo_organization
        ),
        created_at
      `)
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    
    // Garantir que organization_id esteja disponível no nível raiz
    const response = {
      ...data,
      organization_id: data.organization_id || data.organizations?.id
    };
    
    console.log("✅ Representante retornado com organization_id:", response.organization_id);
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserRepresentativeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('organization_representative')
      .select(`
        representative_id, 
        users (
          id,
          username,
          email,
          phone
        ), 
        organizations (
          id,
          name,
          address,
          document_type,
          document_number,
          slug_organization,
          logo_organization
        ),
        created_at
      `)
      .eq('id', id)
      .eq('organization_id', req.organizationId)  
      // .single();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Usuário não encontrado nessa organização' });
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const createUserRepresentative = async (req, res) => {
  try {
    const { userId } = req.body;
    const { slug } = req.params;

    console.log("Slug recebido no users:", slug);
    console.log("User id recebido no users representative:", userId);

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    console.log("Organizacao encontrada:", org);
    console.log("Erro ao buscar org:", orgError);

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    if (!userId || !org.id) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    console.log("✅ Criando representante para org:", org.id, "e user:", userId);

    const { data: newUser, error: insertError } = await supabase
      .from('organization_representative')
      .insert([
        {
          organization_id: org.id,
          user_id: userId,
        },
      ])
      .select('*')
      .single();

    if (insertError) {
      console.error("❌ Erro ao inserir representante:", insertError);
      throw insertError;
    }

    console.log("✅ Representante criado com sucesso:", newUser);

    res.status(201).json(newUser);
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};


export const updateUserRepresentative = async (req, res) => {
  try {
    const { slug, id } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    console.log(org.id)

    if (!org.id) {
      return res.status(400).json({ error: 'Organização não identificada.' });
    }

    // Monta dados de atualização
    const updateData = {
      user_id: id,
      organization_id: org.id,
    };

    const { data, error } = await supabase
      .from('organization_representative')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', org.id)
      .select('*')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

export const deleteUserRepresentative = async (req, res) => {
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

    const { data: existingUser, error: userError } = await supabase
      .from('organization_representative')
      .select('id')
      .eq('id', id)
      .eq('organization_id', org.id)
      .single();

    if (userError || !existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado nessa organização' });
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('organization_id', org.id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};