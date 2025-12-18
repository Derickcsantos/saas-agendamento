import express from 'express';
import { supabase } from '../lib/supabase.js';

export const verifyUser = async (req, res) => {
  const { username } = req.body;
  const { slug } = req.params;

  try {
    const { org, orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)

    if (orgError) {
      console.error('Não foi possivel encontrar a organização: ', orgError)
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', org.id)
      .eq('username', username)
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