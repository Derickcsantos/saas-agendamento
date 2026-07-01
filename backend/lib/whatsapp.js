import fetch from "node-fetch";
import { supabase } from "./supabase.js";

const WASENDER_BASE_URL = (process.env.WASENDER_API_URL || "https://wasenderapi.com").replace(/\/$/, "");
const WASENDER_API_URL = `${WASENDER_BASE_URL}/api/send-message`;
const WASENDER_API_KEY = process.env.WASENDER_API_KEY;
const EVOLUTION_BASE_URL = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

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

async function sendWasender({ apiKey, to, message }) {
  if (!apiKey) {
    throw new Error("Nenhuma API key de WhatsApp configurada");
  }

  let targetTo = to;

  const sendOnce = async () => {
    const response = await fetch(WASENDER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: targetTo,
        text: message,
      }),
    });

    const rawText = await response.text();
    console.log("Status Wasender:", response.status);
    console.log("Resposta Wasender:", rawText.substring(0, 200));

    let data;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error("Resposta invalida da Wasender (nao e JSON)");
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
      ({ response, data } = await sendOnce());
    } else if (targetTo.endsWith("@c.us")) {
      targetTo = targetTo.replace("@c.us", "@s.whatsapp.net");
      ({ response, data } = await sendOnce());
    }
  }

  if (response.status === 429) {
    const retryAfterSeconds = Number(data?.retry_after);
    const retryDelayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : QUEUE_DELAY;

    console.warn(`Rate limit 429. Reenviando em ${retryDelayMs / 1000}s...`);
    await sleep(retryDelayMs);
    ({ response, data } = await sendOnce());
  }

  if (!response.ok) {
    throw new Error(data?.message || `Erro HTTP ${response.status}`);
  }

  return data;
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
      number: toPhoneDigits(phone),
      textMessage: {
        text: message,
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

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Erro HTTP ${response.status}`);
  }

  return data;
}

/**
 * Envia mensagem WhatsApp usando:
 * 1. Evolution da organizacao, quando a linha nao tiver wasender_session_id.
 * 2. Wasender da organizacao, quando wasender_session_id estiver preenchido.
 * 3. Wasender padrao do .env como fallback imediato.
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
    let provider = "wasender";
    let source = "WASENDER_PADRAO";
    let wasenderApiKey = WASENDER_API_KEY;
    let evolutionInstanceName = null;
    let evolutionInstanceApiKey = null;

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
          if (orgWhatsapp.wasender_session_id) {
            provider = "wasender";
            source = "WASENDER_ORGANIZACAO";
            wasenderApiKey = orgWhatsapp.whatsapp_api_key;
          } else {
            provider = "evolution";
            source = "EVOLUTION_ORGANIZACAO";
            evolutionInstanceName = orgWhatsapp.evolution_instance_name || orgWhatsapp.whatsapp_api_key;
            evolutionInstanceApiKey = orgWhatsapp.evolution_instance_name
              ? orgWhatsapp.whatsapp_api_key
              : EVOLUTION_API_KEY;
          }
        }
      } catch (err) {
        console.error("Erro ao buscar WhatsApp da organizacao, usando fallback:", err.message);
      }
    }

    console.log(`Enviando WhatsApp via ${source}`);
    console.log("To:", provider === "evolution" ? toPhoneDigits(phone) : normalizedTo);
    console.log("Message preview:", `${message.substring(0, 100)}...`);

    if (provider === "evolution") {
      try {
        return await sendEvolution({
          instanceName: evolutionInstanceName,
          apiKey: evolutionInstanceApiKey,
          phone,
          message,
        });
      } catch (evolutionError) {
        console.error("Evolution falhou, tentando fallback Wasender:", evolutionError.message);
        source = "WASENDER_FALLBACK";
        wasenderApiKey = WASENDER_API_KEY;
      }
    }

    console.log(`Enviando WhatsApp via ${source}`);
    return sendWasender({
      apiKey: wasenderApiKey,
      to: normalizedTo,
      message,
    });
  });
}
