import express from 'express';
import nodemailer from 'nodemailer';

// 🔧 Criação do transporter
export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // ou o servidor SMTP que você usa
  port: 587,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: process.env.EMAIL_USER, // configure no seu .env
    pass: process.env.EMAIL_PASS, // configure no seu .env
  },
});

// 🧪 (Opcional) Testa conexão no console
transporter.verify((error, success) => {
  if (error) {
    console.error('Erro ao conectar ao servidor SMTP:', error);
  } else {
    console.log('✅ Servidor SMTP pronto para enviar e-mails');
  }
});

