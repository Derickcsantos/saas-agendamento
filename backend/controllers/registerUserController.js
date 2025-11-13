// backend/controllers/registerController.js
import express from 'express';
import { supabase } from '../lib/supabase.js';
import { hashPassword } from '../utils/password.js';

export const registerUser = async (req, res) => {
  const { username, email, aniversario, phone, password_plaintext } = req.body;

  if (!username || !email || !password_plaintext) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }

  if (!req.organizationId) {
    return res.status(400).json({ error: 'Organização não identificada.' });
  }

  try {
    // Verifica existência (mesma lógica)
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', req.organizationId)
      .or(`username.eq.${username},email.eq.${email}`);

    if (existingError) throw existingError;

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Usuário ou email já cadastrado.' });
    }

    // Hash da senha antes de inserir
    const password_hash = await hashPassword(password_plaintext);

    // Insere novo usuário (não salvar password_plaintext)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          username,
          email,
          aniversario,
          phone,
          password_hash,
          tipo: 'comum',
          organization_id: req.organizationId,
          created_at: new Date().toISOString(),
        },
      ])
      .select('id, username, email, aniversario, phone, created_at')
      .single();

    if (insertError) throw insertError;

    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      user: newUser,
    });
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

export const registerBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (error || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    req.organizationId = org.id;
    return registerUser(req, res);
  } catch (err) {
    console.error("Erro ao processar cadastro multi-tenant:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};
