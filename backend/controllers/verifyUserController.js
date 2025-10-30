import express from 'express';
import { supabase } from '../lib/supabase.js';

export const verifyUser = async (req, res) => {
  const { username } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .eq('organization_id', req.organizationId)
      .single();

    if (error || !user) {
      return res.json({ exists: false });
    }

    res.json({ exists: true });
  } catch (err) {
    console.error('Erro ao verificar usuário:', err);
    res.status(500).json({ exists: false });
  }
};