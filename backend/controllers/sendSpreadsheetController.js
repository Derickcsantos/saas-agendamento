import { readSpreadsheetBuffer } from "../utils/readSpreadsheet.js";
import { sendWhatsappMessage } from "../utils/waSender.js";
import crypto from "crypto";
import { supabase } from "../lib/supabase.js";

const DEFAULT_MESSAGE = `👋 E aí! Como você tá sobrevivendo à correria de hoje?
Sou o Dérick, fundador da Marcafy, e sei bem como funciona a rotina de quem vive com agenda lotada e zero tempo pra respirar. A demanda é ótima… até virar caos. A ideia aqui não é te vender um milagre — é te entregar uma plataforma de agendamentos online que organiza sua operação sem tirar sua autonomia.

📅 Agenda completamente personalizável — você dita as regras
🔗 Integração com WhatsApp — confirmações e lembretes automáticos
📆 Google Calendar sincronizado — marcou, caiu direto na sua agenda
🎥 Google Meet automático — link enviado para o cliente sem esforço
🏷 Cupons de desconto pra atrair mais clientes quando quiser
💳 Assinaturas recorrentes pra quem vende pacotes e quer receita previsível
👥 Painéis para cliente, funcionário e admin
🌐 Landing page + galeria pra destacar seu trabalho sem drama
⚡ Criação de conta sem burocracia — 2 min e você já está operando

👉 www.marcafy.com.br

📲 Se quiser conversar, é só me chamar. 🚀`;

export async function sendSpreadsheetController(req, res) {
  try {
    const file = req.file;
    const message = req.body.message?.trim() || DEFAULT_MESSAGE;

    // 🔹 Delay simples (segundos → ms)
    const delay = Number(req.body.delay || 1) * 1000;

    if (!file) {
      return res.status(400).json({ error: "Arquivo não enviado" });
    }

    const fileName = `leads-${Date.now()}-${crypto.randomUUID()}.xlsx`;

    await supabase.storage
      .from("planilhas-leads")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    const phones = readSpreadsheetBuffer(file.buffer);

    for (let i = 0; i < phones.length; i++) {
      const phone = phones[i];

      try {
        await sendWhatsappMessage(phone, message);
      } catch (err) {
        console.error(`Erro ao enviar para ${phone}:`, err);
        // continua o loop normalmente
      }

      // ⏱ delay entre envios (mesmo se falhar)
      if (i < phones.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return res.json({
      success: true,
      total: phones.length,
      delay_seconds: delay / 1000,
      file: fileName,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao processar planilha e enviar mensagens",
    });
  }
}