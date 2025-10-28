import express from 'express'
import { supabase } from '../lib/supabase'
import generateAccessToken from '../utils/jwt.js'
import setTokenCookie from '../utils/setTokenCookie.js'

export const login = async (req, res) => {
  const { login, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, aniversario, password_plaintext, phone, tipo')
      .eq('organization_id', req.organizationId)
      .or(`username.eq.${login},email.eq.${login}`)
      .single();

    if (error || !user || user.password_plaintext !== password) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Se a autenticação for bem-sucedida, define o cookie com os dados do usuário
    const userData = {
      id: user.id,
      username: user.username,
      aniversario: user.aniversario,
      email: user.email,
      phone: user.phone,
      organization_id: req.organizationId,
      tipo: user.tipo
    };

    const token = generateAccessToken(userData);
    setTokenCookie(res, token);


    return res.json({
      success: true,
      message: 'login bem sucedido',
      user: userData
    });


  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};