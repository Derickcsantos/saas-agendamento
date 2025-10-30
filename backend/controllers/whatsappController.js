import express from 'express'


export const sendWhatsappConfirmation = async (req, res) => {
    try {
    const { clientPhone, appointmentDetails } = req.body;

    if (!whatsappClient) {
      return res.status(500).json({ 
        success: false, 
        error: "WhatsApp não conectado. Por favor, reinicie o servidor." 
      });
    }

    // Validação dos dados
    if (!clientPhone || !appointmentDetails) {
      return res.status(400).json({
        success: false,
        error: "Dados incompletos"
      });
    }

    const formattedPhone = `55${clientPhone.replace(/\D/g, '')}@c.us`;
    const message = `📅 *Confirmação de Agendamento* \n\n` +
      `✅ *Serviço:* ${appointmentDetails.service}\n` +
      `👩🏾‍💼 *Profissional:* ${appointmentDetails.professional}\n` +
      `📆 *Data:* ${appointmentDetails.date}\n` +
      `⏰ *Horário:* ${appointmentDetails.time}\n\n` +
      `_Agradecemos sua preferência!_`;

    // Envia a mensagem
    await whatsappClient.sendText(formattedPhone, message);
    
    res.json({ success: true });

  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Falha no envio" 
    });
  }
};

