import express from 'express';
import { supabase } from '../lib/supabase.js';

export const registerUser = async (req, res) => {
  const { username, email, aniversario, phone, password_plaintext } = req.body;

  try {
    // Verifica se já existe usuário com mesmo username ou email
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', req.organizationId)
      .or(`username.eq.${username},email.eq.${email}`);

    if (userError) {
      throw userError;
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        error: 'Usuário ou email já cadastrado'
      });
    }

    // Insere novo usuário com tipo "comum"
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        aniversario,
        phone,
        password_plaintext, // Em produção: criptografar
        tipo: 'comum',
        organization_id: req.organizationId,
        created_at: new Date().toISOString()
      }])
      .select('id, username, email, aniversario, phone, created_at')
      .eq('organization_id', req.organizationId)
      .single();

    if (insertError) {
      throw insertError;
    }

    res.json({
      success: true,
      user: newUser
    });

  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};