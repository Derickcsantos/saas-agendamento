import express from 'express';
import { transporter } from '../lib/nodemailer'

export const emailContact = async (req, res) => {
    const { name, email, phone, message } = req.body;

    // Validação básica
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Nome, email e mensagem são obrigatórios' });
    }


    // Configuração do email
    const mailOptions = {
        from: `"Formulário de Contato" <${email}>`,
        to: 'salaopaulatrancas@gmail.com',
        subject: `Nova mensagem de ${name} - Site Paula Tranças`,
        text: `
            Nome: ${name}
            Email: ${email}
            Telefone: ${phone || 'Não informado'}
            
            Mensagem:
            ${message}
        `,
        html: `
            <h2>Nova mensagem do site Paula Tranças</h2>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Telefone:</strong> ${phone || 'Não informado'}</p>
            <p><strong>Mensagem:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        res.status(500).json({ error: 'Ocorreu um erro ao enviar a mensagem. Por favor, tente novamente mais tarde.' });
    }
};
