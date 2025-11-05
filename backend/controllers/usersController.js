import express from 'express'
import { supabase } from '../lib/supabase.js';

export const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, tipo, created_at')
      .eq('organization_id', req.organizationId)
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
  const { username, email, password_plaintext, tipo = 'comum', id_employee } = req.body;

  // console.log("EU SOU O REQ ORGANIZATIONID: ",req.organizationId)
  // console.log("EU SOU O REQ BODY ORGANIZATIONID: ",req.body.organizationId)

  try {
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', req.organizationId)    // ALTERADO
      .or(`username.eq.${username},email.eq.${email}`);

    if (userError) throw userError;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        error: 'Usuário ou email já cadastrado'
      });
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        organization_id: req.organizationId,  // ALTERADO
        username,
        email,
        password_plaintext,
        tipo,
        id_employee: tipo === 'funcionario' ? id_employee : null,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (insertError) throw insertError;

    res.json(newUser);
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password_plaintext, phone, aniversario, tipo, id_employee } = req.body;
    const organization_id = req.organizationId

    if (!username || !email) {
      return res.status(400).json({ error: 'Nome de usuário e e-mail são obrigatórios' });
    }

    const updateData = {
      username,
      email,
      phone,
      aniversario,
      updated_at: new Date().toISOString(),
      ...(tipo && { tipo }),
      ...(password_plaintext && { password_plaintext }),
      id_employee: tipo === 'funcionario' ? id_employee : null
    };

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organization_id)
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const organization_id = req.organizationId

    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organization_id)
      .single();

    if (userError || !existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado nessa organização' });
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization_id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};