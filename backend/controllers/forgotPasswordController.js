import express from 'express';
import updateUserPassword from '../utils/updateUserPassword.js';
import generatePassword from '../utils/PasswordGenerator.js'
import findUserByEmail from '../utils/findUserByEmail.js';

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Aqui você deve verificar se o email existe no seu banco de dados
    // Esta é uma implementação simulada - substitua pela sua lógica real
    const user = await findUserByEmail(email); // Você precisa implementar esta função
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Email não encontrado' });
    }

    // Gera nova senha
    const newPassword = generatePassword();
    
    // Atualiza a senha no banco de dados (implemente esta função)
    await updateUserPassword(user.id, newPassword);
    
    // Envia email com a nova senha
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