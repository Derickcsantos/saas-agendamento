import fetch from "node-fetch";
import { supabase } from "./supabase.js";

const WASENDER_API_URL = "https://wasenderapi.com/api/send-message";
const WASENDER_API_KEY = process.env.WASENDER_API_KEY;

/**
 * Envia mensagem WhatsApp usando:
 * 1. WhatsApp da organização (se conectado)
 * 2. Fallback: WASENDER_API_KEY do .env
 * 
 * @param {string} phone - Telefone do destinatário
 * @param {string} message - Mensagem a enviar
 * @param {string|null} organizationId - ID da organização (opcional)
 */
export async function sendWhatsAppMessage(phone, message, organizationId = null) {
  if (!phone || !message) {
    throw new Error("Telefone e mensagem são obrigatórios");
  }

  // Normalização defensiva
  const to = phone.startsWith("+") 
    ? phone 
    : phone.startsWith("55") 
      ? `+${phone}` 
      : `+55${phone}`;

  let apiKey = WASENDER_API_KEY; // Fallback padrão
  let source = "API_KEY_PADRAO";

  // ✅ Verificar se organização tem WhatsApp conectado
  if (organizationId) {
    try {
      const { data: orgWhatsapp, error } = await supabase
        .from("whatsapp_organization")
        .select("whatsapp_api_key")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (!error && orgWhatsapp?.whatsapp_api_key) {
        apiKey = orgWhatsapp.whatsapp_api_key;
        source = "WHATSAPP_ORGANIZACAO";
        console.log("✅ Usando WhatsApp da organização:", organizationId);
      } else {
        console.log("⚠️ Organização sem WhatsApp conectado, usando API key padrão");
      }
    } catch (err) {
      console.error("⚠️ Erro ao buscar WhatsApp da organização, usando fallback:", err.message);
    }
  }

  console.log(`📤 Enviando WhatsApp via ${source}`);
  console.log("To:", to);
  console.log("Text:", message);

  const response = await fetch(WASENDER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
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
