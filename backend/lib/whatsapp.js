import fetch from "node-fetch";
import { supabase } from "./supabase.js";

const EVOLUTION_BASE_URL = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_DEFAULT_INSTANCE_NAME =
  process.env.EVOLUTION_DEFAULT_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE_NAME || null;

const messageQueue = [];
let isProcessingQueue = false;
const QUEUE_DELAY = 5000;
let lastSentAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toWhatsAppJid(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return null;
  if (raw.includes("@")) return raw;

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

function toPhoneDigits(phone) {
  if (!phone) return null;
  const raw = String(phone).includes("@") ? String(phone).split("@")[0] : String(phone);
  return raw.replace(/\D/g, "") || null;
}

function toEvolutionNumber(phone) {
  const jid = toWhatsAppJid(phone);
  if (!jid) return null;
  return jid.split("@")[0];
}

function extractProviderMessage(data) {
  if (!data) return null;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.message)) return data.message.flat(Infinity).join(" ");
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.response?.message === "string") return data.response.message;
  if (Array.isArray(data?.response?.message)) return data.response.message.flat(Infinity).join(" ");
  return null;
}

async function processQueue() {
  if (isProcessingQueue || messageQueue.length === 0) return;

  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const task = messageQueue.shift();
    const elapsedSinceLastSend = Date.now() - lastSentAt;
    const waitTime = Math.max(0, QUEUE_DELAY - elapsedSinceLastSend);

    if (waitTime > 0) {
      console.log(`Aguardando ${(waitTime / 1000).toFixed(1)}s para respeitar limite da API...`);
      await sleep(waitTime);
    }

    try {
      console.log(`Processando fila: ${messageQueue.length} mensagens restantes`);
      await task.execute();
      lastSentAt = Date.now();
      task.resolve();
    } catch (error) {
      task.reject(error);
    }

    if (messageQueue.length > 0) {
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

async function sendEvolution({ instanceName, apiKey, phone, message }) {
  if (!EVOLUTION_BASE_URL || !(apiKey || EVOLUTION_API_KEY) || !instanceName) {
    throw new Error("Evolution nao configurada para envio");
  }

  const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    headers: {
      apikey: apiKey || EVOLUTION_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: toEvolutionNumber(phone),
      textMessage: {
        text: String(message),
      },
    }),
  });

  const rawText = await response.text();
  console.log("Status Evolution:", response.status);
  console.log("Resposta Evolution:", rawText.substring(0, 200));

  let data;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error("Resposta invalida da Evolution (nao e JSON)");
  }

  if (!response.ok || data?.success === false) {
    throw new Error(extractProviderMessage(data) || `Erro HTTP ${response.status}`);
  }

  return data;
}

function hasEvolutionConfig(row) {
  return Boolean(row?.evolution_instance_name || (row?.whatsapp_api_key && !row?.wasender_session_id));
}

function getEvolutionInstanceName(row) {
  if (!row) return null;
  if (row.evolution_instance_name) return row.evolution_instance_name;
  return row.wasender_session_id ? null : row.whatsapp_api_key || null;
}

function getEvolutionInstanceApiKey(row) {
  if (!row) return null;
  return row.evolution_instance_name ? row.whatsapp_api_key : EVOLUTION_API_KEY;
}

/**
 * Envia mensagem WhatsApp usando Evolution como provedor principal.
 * Para envios sem organizacao, configure EVOLUTION_DEFAULT_INSTANCE_NAME.
 */
export async function sendWhatsAppMessage(phone, message, organizationId = null, useDefaultApiKey = false) {
  if (!phone || !message) {
    throw new Error("Telefone e mensagem sao obrigatorios");
  }

  const normalizedTo = toWhatsAppJid(phone);
  if (!normalizedTo) {
    throw new Error("Telefone invalido para WhatsApp");
  }

  return addToQueue(async () => {
    let source = "EVOLUTION_PADRAO";
    let evolutionInstanceName = EVOLUTION_DEFAULT_INSTANCE_NAME;
    let evolutionInstanceApiKey = EVOLUTION_API_KEY;

    if (!useDefaultApiKey && organizationId) {
      try {
        const { data: orgWhatsapp, error } = await supabase
          .from("whatsapp_organization")
          .select("whatsapp_api_key, wasender_session_id, evolution_instance_name")
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (error) {
          console.warn("Erro ao buscar WhatsApp da organizacao:", error.message);
        } else if (orgWhatsapp?.whatsapp_api_key) {
          if (hasEvolutionConfig(orgWhatsapp)) {
            source = "EVOLUTION_ORGANIZACAO";
            evolutionInstanceName = getEvolutionInstanceName(orgWhatsapp);
            evolutionInstanceApiKey = getEvolutionInstanceApiKey(orgWhatsapp);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar WhatsApp da organizacao, usando fallback:", err.message);
      }
    }

    console.log(`Enviando WhatsApp via ${source}`);
    console.log("To:", toEvolutionNumber(phone));
    console.log("Message preview:", `${message.substring(0, 100)}...`);

    try {
      return await sendEvolution({
        instanceName: evolutionInstanceName,
        apiKey: evolutionInstanceApiKey,
        phone,
        message,
      });
    } catch (evolutionError) {
      console.error("Evolution falhou:", evolutionError.message);
      throw evolutionError;
    }
  });
}
