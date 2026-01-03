import fetch from "node-fetch";

const WASENDER_API_URL = "https://wasenderapi.com/api/send-message";
const WASENDER_API_KEY = process.env.WASENDER_API_KEY;

export async function sendWhatsAppMessage(phone, message) {
  if (!phone || !message) {
    throw new Error("Telefone e mensagem são obrigatórios");
  }

  // Normalização defensiva
  const to = phone.startsWith("+") 
    ? phone 
    : phone.startsWith("55") 
      ? `+${phone}` 
      : `+55${phone}`;

  console.log("📤 Enviando WhatsApp");
  console.log("To:", to);
  console.log("Text:", message);

  const response = await fetch(WASENDER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WASENDER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      text: message,
    }),
  });

  const rawText = await response.text();
  console.log("📩 Resposta Wasender:", rawText);

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error("Resposta inválida da Wasender (não é JSON)");
  }

  if (!response.ok) {
    throw new Error(data?.message || "Erro ao enviar WhatsApp");
  }

  return data;
}
