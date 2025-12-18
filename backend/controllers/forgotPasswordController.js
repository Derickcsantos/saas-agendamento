import express from 'express';
import updateUserPassword from '../utils/updateUserPassword.js';
import generatePassword from '../utils/PasswordGenerator.js'
import findUserByEmail from '../utils/findUserByEmail.js';
import { supabase } from '../lib/supabase.js';

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const { slug } = req.params;

    if (!slug) {
      return res.status(404).json({ success: false, error: 'Slug da organização não informado.' });
    }
    
    const user = await findUserByEmail(email, slug); 
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Email não encontrado' });
    }

    const newPassword = generatePassword();
    
    await updateUserPassword(user.id, newPassword);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Recuperação de Senha - Salão de Beleza',
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Você solicitou uma nova senha para acessar o sistema do Salão de Beleza.</p>
        <p>Sua nova senha é: <strong>${newPassword}</strong></p>
        <p>Recomendamos que você altere esta senha após o login.</p>
        <p>Caso não tenha solicitado esta alteração, por favor ignore este email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    res.status(500).json({ success: false, error: 'Erro ao processar solicitação' });
  }
};