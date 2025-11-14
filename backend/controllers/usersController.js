import express from 'express'
import { supabase } from '../lib/supabase.js';
import { hashPassword } from '../utils/password.js';

export const getUsers = async (req, res) => {
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
      .from('users')
      .select('id, username, email, tipo, created_at')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organizationId)  // ALTERADO
      // .single();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Usuário não encontrado nessa organização' });
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const createUser = async (req, res) => {
  try {
    const { username, email, password_plaintext, tipo = 'comum', id_employee } = req.body;
    const { slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    if (!username || !email || !password_plaintext) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    // Verifica se usuário já existe
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', org.id)
      .or(`username.eq.${username},email.eq.${email}`);

    if (userError) throw userError;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'Usuário ou email já cadastrado.' });
    }

    // Gera hash da senha antes de inserir
    const password_hash = await hashPassword(password_plaintext);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          organization_id: org.id,
          username,
          email,
          password_hash, // salva apenas o hash
          tipo,
          id_employee: tipo === 'funcionario' ? id_employee : null,
          created_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (insertError) throw insertError;

    res.status(201).json(newUser);
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};


export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password_plaintext, phone, aniversario, tipo, id_employee } = req.body;
    const { slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    console.log(organization_id)

    if (!organization_id) {
      return res.status(400).json({ error: 'Organização não identificada.' });
    }

    if (!username || !email) {
      return res.status(400).json({ error: 'Nome de usuário e e-mail são obrigatórios.' });
    }

    // Monta dados de atualização
    const updateData = {
      username,
      email,
      phone,
      aniversario,
      updated_at: new Date().toISOString(),
      ...(tipo && { tipo }),
      id_employee: tipo === 'funcionario' ? id_employee : null,
    };

    console.log(updateData.password)

    // Se veio senha nova, gera o hash
    if (password_plaintext) {
      updateData.password = await hashPassword(password_plaintext);
    }

    const { data, error } = await supabase
      .from('users')
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

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data: existingUser, error: userError } = await supabase
      .from('users')
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