import fetch from "node-fetch";

const WASENDER_API_URL = "https://api.wasender.com.br/send-message";
const WASENDER_API_KEY = process.env.WASENDER_API_KEY;

/**
 * Envia mensagem via WhatsApp (Wasender)
 * @param {string} phone - Número com DDI + DDD + número (ex: 5511999999999)
 * @param {string} message - Texto da mensagem
 */
export async function sendWhatsAppMessage(phone, message) {
  if (!phone || !message) {
    throw new Error("Telefone e mensagem são obrigatórios");
  }

  const response = await fetch(WASENDER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${WASENDER_API_KEY}`,
    },
    body: JSON.stringify({
      phone,
      message,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro Wasender:", data);
    throw new Error("Falha ao enviar mensagem WhatsApp");
  }

  return data;
}
