import fetch from "node-fetch";
import { supabase } from "./supabase.js";

const WASENDER_API_URL = "https://wasenderapi.com/api/send-message";
const WASENDER_API_KEY = process.env.WASENDER_API_KEY;

// =====================================================
// 🔄 FILA DE MENSAGENS (Rate Limit: 1 msg a cada 5s)
// =====================================================
const messageQueue = [];
let isProcessingQueue = false;
const QUEUE_DELAY = 5000; // 5 segundos entre mensagens
let lastSentAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toWhatsAppJid(phone) {
  const raw = String(phone || "").trim();

  if (!raw) return null;

  if (raw.includes("@")) {
    return raw;
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let nationalNumber = digits;

  if (digits.startsWith("55") && digits.length > 11) {
    nationalNumber = digits.slice(2);
  }

  if (nationalNumber.length === 10 || nationalNumber.length === 11) {
    return `55${nationalNumber}@s.whatsapp.net`;
  }

  if (digits.length === 12 || digits.length === 13) {
    return `${digits}@s.whatsapp.net`;
  }

  return null;
}

async function processQueue() {
  if (isProcessingQueue || messageQueue.length === 0) return;

  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const task = messageQueue.shift();

    // Garante 5s mínimos desde o último envio, mesmo com fila vazia entre requisições
    const elapsedSinceLastSend = Date.now() - lastSentAt;
    const waitTime = Math.max(0, QUEUE_DELAY - elapsedSinceLastSend);
    if (waitTime > 0) {
      console.log(`⏳ Aguardando ${(waitTime / 1000).toFixed(1)}s para respeitar limite da API...`);
      await sleep(waitTime);
    }
    
    try {
      console.log(`📤 Processando fila: ${messageQueue.length} mensagens restantes`);
      await task.execute();
      lastSentAt = Date.now();
      task.resolve();
    } catch (error) {
      task.reject(error);
    }

    // Aguardar 5 segundos antes da próxima mensagem (se houver mais na fila)
    if (messageQueue.length > 0) {
      console.log(`⏳ Aguardando ${QUEUE_DELAY / 1000}s antes da próxima mensagem...`);
      await sleep(QUEUE_DELAY);
    }
  }

  isProcessingQueue = false;
}

function addToQueue(executeFunc) {
  return new Promise((resolve, reject) => {
    messageQueue.push({ execute: executeFunc, resolve, reject });
    processQueue();
  });
}

/**
 * Envia mensagem WhatsApp usando:
 * 1. WhatsApp da organização (se conectado e useDefaultApiKey=false)
 * 2. API Key padrão do .env (se useDefaultApiKey=true ou sem organização)
 * 
 * @param {string} phone - Telefone do destinatário
 * @param {string} message - Mensagem a enviar
 * @param {string|null} organizationId - ID da organização (opcional)
 * @param {boolean} useDefaultApiKey - Se true, força uso da API key padrão (.env)
 */
export async function sendWhatsAppMessage(phone, message, organizationId = null, useDefaultApiKey = false) {
  if (!phone || !message) {
    console.error("❌ Telefone e mensagem são obrigatórios");
    throw new Error("Telefone e mensagem são obrigatórios");
  }

  const normalizedTo = toWhatsAppJid(phone);
  if (!normalizedTo) {
    console.error("❌ Telefone inválido para WhatsApp:", phone);
    throw new Error("Telefone inválido para WhatsApp");
  }

  // Adicionar à fila
  return addToQueue(async () => {
    const to = normalizedTo;

    let apiKey = WASENDER_API_KEY; // Fallback padrão
    let source = "API_KEY_PADRAO";

    // ✅ Se useDefaultApiKey=true, sempre usa a API key padrão (representante)
    if (useDefaultApiKey) {
      console.log("🔑 Forçando uso da API key padrão (.env) - mensagem para representante");
      apiKey = WASENDER_API_KEY;
      source = "API_KEY_PADRAO";
    }
    // ✅ Verificar se organização tem WhatsApp conectado (apenas para clientes)
    else if (organizationId) {
      try {
        console.log(`🔍 Buscando WhatsApp da organização: ${organizationId}`);
        
        const { data: orgWhatsapp, error } = await supabase
          .from("whatsapp_organization")
          .select("whatsapp_api_key")
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (error) {
          console.warn("⚠️ Erro ao buscar WhatsApp da organização:", error.message);
        }

        if (!error && orgWhatsapp?.whatsapp_api_key) {
          apiKey = orgWhatsapp.whatsapp_api_key;
          source = "WHATSAPP_ORGANIZACAO";
          console.log("✅ Usando WhatsApp da organização:", organizationId);
        } else if (!orgWhatsapp) {
          console.log("ℹ️ Organização sem WhatsApp conectado, usando API key padrão");
        }
      } catch (err) {
        console.error("⚠️ Erro ao buscar WhatsApp da organização, usando fallback:", err.message);
      }
    } else {
      console.log("ℹ️ organizationId não fornecido, usando API key padrão");
    }

    if (!apiKey) {
      console.error("❌ Nenhuma API key disponível (organização ou .env)");
      throw new Error("Nenhuma API key de WhatsApp configurada");
    }

    console.log(`📤 Enviando WhatsApp via ${source}`);
    console.log("To:", to);
    console.log("Message preview:", message.substring(0, 100) + "...");

    try {
      let targetTo = to;

      const sendOnce = async () => {
        const response = await fetch(WASENDER_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: targetTo,
            text: message,
          }),
        });

        const rawText = await response.text();
        console.log("📩 Status Wasender:", response.status);
        console.log("📩 Resposta Wasender:", rawText.substring(0, 200));

        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          console.error("❌ Resposta inválida da Wasender (não é JSON):", rawText);
          throw new Error("Resposta inválida da Wasender (não é JSON)");
        }

        return { response, data };
      };

      let { response, data } = await sendOnce();

      if (
        response.status === 422 &&
        String(data?.message || "").toLowerCase().includes("valid whatsapp jid")
      ) {
        if (targetTo.endsWith("@s.whatsapp.net")) {
          targetTo = targetTo.replace("@s.whatsapp.net", "@c.us");
          console.warn("⚠️ JID @s.whatsapp.net rejeitado. Tentando @c.us...");
          ({ response, data } = await sendOnce());
        } else if (targetTo.endsWith("@c.us")) {
          targetTo = targetTo.replace("@c.us", "@s.whatsapp.net");
          console.warn("⚠️ JID @c.us rejeitado. Tentando @s.whatsapp.net...");
          ({ response, data } = await sendOnce());
        }
      }

      if (response.status === 429) {
        const retryAfterSeconds = Number(data?.retry_after);
        const retryDelayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : QUEUE_DELAY;

        console.warn(`⚠️ Rate limit 429. Reenviando em ${retryDelayMs / 1000}s...`);
        await sleep(retryDelayMs);
        ({ response, data } = await sendOnce());
      }

      if (!response.ok) {
        console.error("❌ Erro ao enviar WhatsApp:", {
          status: response.status,
          message: data?.message || "Erro desconhecido",
          data
        });
        throw new Error(data?.message || `Erro HTTP ${response.status}`);
      }

      console.log("✅ WhatsApp enviado com sucesso:", {
        to: targetTo,
        messageId: data?.id || data?.message_id || "N/A",
        status: data?.status || "sent"
      });

      return data;
    } catch (err) {
      console.error("❌ Erro ao enviar WhatsApp:", {
        phone: to,
        source,
        error: err.message
      });
      throw err;
    }
  });
}
