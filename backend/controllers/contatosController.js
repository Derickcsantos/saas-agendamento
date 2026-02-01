// import express from 'express';
// import { transporter } from '../lib/nodemailer.js';
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import { supabase } from '../lib/supabase.js';
import { normalizePhone } from '../utils/normalizePhone.js';

// export const emailContact = async (req, res) => {
//   const { name, email, phone, message } = req.body;

//   if (!name || !email || !message) {
//     return res.status(400).json({ error: 'Nome, email e mensagem são obrigatórios' });
//   }

//   const mailOptions = {
//     from: `"Formulário de Contato" <${email}>`,
//     to: 'salaopaulatrancas@gmail.com',
//     subject: `Nova mensagem de ${name} - Site Paula Tranças`,
//     text: `
//       Nome: ${name}
//       Email: ${email}
//       Telefone: ${phone || 'Não informado'}
      
//       Mensagem:
//       ${message}
//     `,
//     html: `
//       <h2>Nova mensagem do site Paula Tranças</h2>
//       <p><strong>Nome:</strong> ${name}</p>
//       <p><strong>Email:</strong> ${email}</p>
//       <p><strong>Telefone:</strong> ${phone || 'Não informado'}</p>
//       <p><strong>Mensagem:</strong></p>
//       <p>${message.replace(/\n/g, '<br>')}</p>
//     `
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     res.status(200).json({ message: 'Mensagem enviada com sucesso!' });
//   } catch (error) {
//     console.error('Erro ao enviar email:', error);
//     res.status(500).json({ error: 'Ocorreu um erro ao enviar a mensagem. Por favor, tente novamente mais tarde.' });
//   }
// };

export const confirmedAppointmentWhatsApp = async (req, res) => {
  try {
    const {
      client,
      service,
      category,
      employee,
      date,
      time,
      prices,
      slug
    } = req.body;

    if (!client?.phone || !service || !employee || !date || !time) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes" });
    }

     const { data: org, orgError } = await supabase
        .from("organizations")
        .select("id, name, phone, address")
        .eq("slug_organization", slug)
        .single();
  
      if (orgError || !org) {
        return res.status(404).json({ error: "Organização não encontrada" });
      }

    const formattedDate = date.split("-").reverse().join("/");

    const message = `
🎉 *Agendamento Confirmado com Sucesso!*

🏢 *${org?.name || "Nossa equipe"}*

👤 Cliente: ${client.name}
💇 Serviço: ${service.name}
📂 Categoria: ${category?.name || "-"}
🧑‍💼 Profissional: ${employee.name}

📅 Data: ${formattedDate}
⏰ Horário: ${time.start} - ${time.end}
📞 Telefone p/ contato: ${org?.phone}
📍 Endereço: ${org?.address}

💰 Valor final: ${prices?.final?.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}

🔐 Link para agendar novamente:
👉 https://marcafy.com.br/${slug}/agendar

Qualquer dúvida, estamos à disposição 💬
    `.trim();

    // ✅ Telefone será normalizado automaticamente no sendWhatsAppMessage
    // Aceita qualquer formato: +55..., 55..., 11..., (11) 9999-9999, etc.
    await sendWhatsAppMessage(client.phone, message);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("WhatsApp confirmedAppointment error:", err);
    return res.status(500).json({ error: "Erro ao enviar WhatsApp" });
  }
};