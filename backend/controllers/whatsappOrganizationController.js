import { supabase } from '../lib/supabase.js';
import axios from 'axios';
import { redis } from '../lib/redis.js';
import crypto from 'crypto';

/**
 * ENV esperadas:
 * - WASENDER_API_URL=https://www.wasenderapi.com (base URL da API)
 * - WASENDER_PERSONAL_ACCESS_TOKEN=... (Personal Access Token para criar/gerenciar sessões)
 * - BACKEND_URL=https://seu-backend.com (para webhook_url)
 */
const WASENDER_BASE_URL = (process.env.WASENDER_API_URL || 'https://www.wasenderapi.com').replace(/\/$/, '');
const WASENDER_PERSONAL_ACCESS_TOKEN = process.env.WASENDER_PERSONAL_ACCESS_TOKEN;
const WASENDER_API_KEY = process.env.WASENDER_API_KEY;
const EVOLUTION_BASE_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/$/, '');
const EVOLUTION_WEBHOOK_PATH = '/whatsapp/evolution/webhook';

// ===== helpers =====
function assertEnv() {
  if (!WASENDER_PERSONAL_ACCESS_TOKEN) {
    const err = new Error('WASENDER_PERSONAL_ACCESS_TOKEN não configurado.');
    err.statusCode = 500;
    throw err;
  }
  if (!BACKEND_URL) {
    const err = new Error('BACKEND_URL não configurado (necessário para webhook_url).');
    err.statusCode = 500;
    throw err;
  }
}

function assertEvolutionEnv() {
  if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
    const err = new Error('EVOLUTION_API_URL ou EVOLUTION_API_KEY nao configurados.');
    err.statusCode = 500;
    throw err;
  }
  if (!BACKEND_URL) {
    const err = new Error('BACKEND_URL nao configurado (necessario para webhook_url).');
    err.statusCode = 500;
    throw err;
  }
}

function normalizePhoneE164(phone) {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  
  // Se for JID (contém @), extrair apenas a parte do número
  if (trimmed.includes('@')) {
    const number = trimmed.split('@')[0];
    // JID já vem no formato correto, apenas adicionar +
    return number.startsWith('+') ? number : `+${number}`;
  }
  
  // aceita +5511999999999 ou 5511999999999
  if (trimmed.startsWith('+')) return trimmed;
  if (/^\d+$/.test(trimmed)) return `+${trimmed}`;
  return trimmed; // se vier formatado, deixa como está
}

function extractPhoneFromJid(jid) {
  if (!jid) return null;
  const base = String(jid).split('@')[0] || '';
  // mantém apenas dígitos
  const digits = base.replace(/\D/g, '');
  return digits || base;
}

function normalizePhoneDigits(phone) {
  if (!phone) return null;
  const base = String(phone).includes('@') ? String(phone).split('@')[0] : String(phone);
  return base.replace(/\D/g, '') || null;
}

function normalizeEvolutionSendNumber(phone) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;

  if (digits.startsWith('55') && digits.length > 11) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function buildEvolutionInstanceName(slug, sessionName) {
  const raw = sessionName || `org_${slug}`;
  return String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 64);
}

function isWasenderRow(row) {
  return Boolean(row?.wasender_session_id);
}

function getEvolutionInstanceName(row) {
  return row?.evolution_instance_name || row?.whatsapp_api_key || null;
}

function getEvolutionInstanceApiKey(row) {
  return row?.evolution_instance_name ? row?.whatsapp_api_key : EVOLUTION_API_KEY;
}

function generateEvolutionInstanceApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

function getEvolutionWebhookUrl() {
  assertEvolutionEnv();
  return `${BACKEND_URL}${EVOLUTION_WEBHOOK_PATH}`;
}

function normalizeEvolutionWebhookStatus(payload) {
  const state = String(
    payload?.data?.state ||
    payload?.data?.status ||
    payload?.state ||
    payload?.status ||
    ''
  ).toLowerCase();

  if (['open', 'connected', 'connect'].includes(state)) return 'CONNECTED';
  if (['close', 'closed', 'disconnected', 'disconnect', 'loggedout'].includes(state)) return 'DISCONNECTED';
  if (['connecting', 'qrcode', 'qr', 'pairing'].includes(state)) return 'CONNECTING';
  return state ? state.toUpperCase() : null;
}

function serializeProviderError(error) {
  return {
    status: error?.response?.status || null,
    data: error?.response?.data || null,
    message: error?.message || 'Erro desconhecido',
  };
}

function extractProviderMessage(data) {
  if (!data) return null;
  if (typeof data?.message === 'string') return data.message;
  if (Array.isArray(data?.message)) return data.message.flat(Infinity).join(' ');
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.response?.message === 'string') return data.response.message;
  if (Array.isArray(data?.response?.message)) return data.response.message.flat(Infinity).join(' ');
  return null;
}

function normalizeDbContact(row) {
  const phone = row?.phone_contact || extractPhoneFromJid(row?.whatsapp_jid);
  const jid = row?.whatsapp_jid || (phone ? `${phone}@s.whatsapp.net` : null);

  return {
    jid,
    id: jid,
    phone,
    phone_contact: phone,
    name: row?.name_contact || 'Sem nome',
    notify: row?.name_contact || null,
    verifiedName: row?.name_contact || null,
    image: row?.image_contact || null,
    imgUrl: row?.image_contact || null,
    observation: row?.observation_contact || null,
    last_sync_at: row?.last_sync_at || null,
    updated_at: row?.updated_at || null,
  };
}

async function getStoredContacts(orgId) {
  const pageSize = 1000;
  let from = 0;
  let rows = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('organization_id', orgId)
      .order('name_contact', { ascending: true, nullsFirst: false })
      .order('phone_contact', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const batch = data || [];
    rows = rows.concat(batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows.map(normalizeDbContact).filter((contact) => !!contact.phone_contact);
}

function filterContacts(contacts, search) {
  if (!search) return contacts;

  const needle = String(search).toLowerCase();
  return contacts.filter((c) => {
    const name = String(c?.name || '').toLowerCase();
    const notify = String(c?.notify || '').toLowerCase();
    const jid = String(c?.jid || '').toLowerCase();
    const phone = String(c?.phone_contact || c?.phone || '').toLowerCase();
    return name.includes(needle) || notify.includes(needle) || jid.includes(needle) || phone.includes(needle);
  });
}

function mergeContacts(apiContacts, storedContacts) {
  const byPhone = new Map();

  for (const contact of storedContacts) {
    if (contact?.phone_contact) byPhone.set(contact.phone_contact, contact);
  }

  for (const contact of apiContacts) {
    if (!contact?.phone_contact) continue;
    const stored = byPhone.get(contact.phone_contact);
    byPhone.set(contact.phone_contact, {
      ...contact,
      name: stored?.name && stored.name !== 'Sem nome' ? stored.name : contact.name || 'Sem nome',
      image: stored?.image || contact.image || contact.imgUrl || null,
      imgUrl: stored?.imgUrl || contact.imgUrl || contact.image || null,
      observation: stored?.observation || null,
      last_sync_at: stored?.last_sync_at || contact.last_sync_at || null,
    });
  }

  return [...byPhone.values()].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })
  );
}

function isEvolutionInstanceAlreadyExistsError(error) {
  const status = Number(error?.response?.status);
  const raw = error?.response?.data || {};
  const text = JSON.stringify(raw).toLowerCase();

  return (
    status === 409 ||
    text.includes('already exists') ||
    text.includes('already exist') ||
    text.includes('instance already') ||
    text.includes('instancia') && text.includes('existe')
  );
}

async function getOrgIdBySlug(slug) {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug_organization', slug)
    .single();

  if (error || !org) {
    const err = new Error('Organização não encontrada');
    err.statusCode = 404;
    throw err;
  }
  return org.id;
}

async function getWhatsappRow(orgId) {
  const { data, error } = await supabase
    .from('whatsapp_organization')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function upsertWhatsappRow(orgId, payload) {
  const now = new Date().toISOString();

  const existing = await getWhatsappRow(orgId);

  if (existing) {
    const { error } = await supabase
      .from('whatsapp_organization')
      .update({ ...payload, updated_at: now })
      .eq('organization_id', orgId);

    if (error) throw error;
    return { ...existing, ...payload };
  }

  const { data, error } = await supabase
    .from('whatsapp_organization')
    .insert({
      organization_id: orgId,
      ...payload,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

// ===== Wasender API calls =====

// Sessões: usam Personal Access Token no Authorization Bearer. :contentReference[oaicite:9]{index=9}
function wasenderPersonal() {
  return axios.create({
    baseURL: `${WASENDER_BASE_URL}/api`,
    headers: {
      Authorization: `Bearer ${WASENDER_PERSONAL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

// Uso da sessão (status/contacts/send-message): usam api_key da sessão no Authorization Bearer. :contentReference[oaicite:10]{index=10}
function wasenderSession(apiKey) {
  return axios.create({
    baseURL: `${WASENDER_BASE_URL}/api`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

async function createWhatsappSession({ name, phone_number, webhook_url }) {
  assertEnv();
  const api = wasenderPersonal();

  const payload = {
    name,
    phone_number,
    account_protection: true,
    log_messages: true,
    read_incoming_messages: false,
    webhook_url,
    webhook_enabled: true,
    webhook_events: ['messages.received', 'session.status', 'messages.update'],
  };

  console.log('[Wasender] Criando sessão com payload:', JSON.stringify(payload, null, 2));
  
  try {
    const { data } = await api.post('/whatsapp-sessions', payload);
    console.log('[Wasender] Resposta da criação:', JSON.stringify(data, null, 2));
    
    if (!data?.success || !data?.data?.id || !data?.data?.api_key) {
      throw new Error(`Resposta inesperada ao criar sessão: ${JSON.stringify(data)}`);
    }

    return data.data; // {id, api_key, webhook_secret, ...}
  } catch (error) {
    console.error('[Wasender] Erro ao criar sessão:', error.response?.data || error.message);
    throw error;
  }
}

async function connectSession(sessionId) {
  assertEnv();
  const api = wasenderPersonal();
  
  console.log(`[Wasender] Conectando sessão ID: ${sessionId}`);
  
  try {
    const { data } = await api.post(`/whatsapp-sessions/${sessionId}/connect`);
    console.log('[Wasender] Resposta da conexão:', JSON.stringify(data, null, 2));
    
    // retorna {success:true, data:{status:"NEED_SCAN", qrCode:"..."}}
    if (!data?.success) {
      throw new Error(`Falha ao conectar sessão: ${JSON.stringify(data)}`);
    }
    
    if (!data?.data) {
      throw new Error(`Resposta sem dados ao conectar sessão: ${JSON.stringify(data)}`);
    }
    
    return data.data;
  } catch (error) {
    console.error('[Wasender] Erro ao conectar sessão:', error.response?.data || error.message);
    throw error;
  }
}

async function disconnectSession(sessionId) {
  assertEnv();
  const api = wasenderPersonal();
  const { data } = await api.post(`/whatsapp-sessions/${sessionId}/disconnect`);
  return data;
}

async function getSessionQRCode(sessionId) {
  assertEnv();
  const api = wasenderPersonal();
  
  console.log(`[Wasender] Obtendo QR Code para sessão ID: ${sessionId}`);
  
  try {
    // Primeiro tenta conectar para gerar novo QR
    const { data } = await api.post(`/whatsapp-sessions/${sessionId}/connect`);
    console.log('[Wasender] Resposta ao obter QR Code:', JSON.stringify(data, null, 2));
    
    if (data?.success && data?.data) {
      return data.data;
    }
    
    throw new Error(`Falha ao obter QR Code: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error('[Wasender] Erro ao obter QR Code:', error.response?.data || error.message);
    throw error;
  }
}

// ===== Evolution API calls =====
function evolutionApi(apiKey = EVOLUTION_API_KEY) {
  assertEvolutionEnv();
  return axios.create({
    baseURL: EVOLUTION_BASE_URL,
    headers: {
      apikey: apiKey || EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

function extractEvolutionQr(data) {
  return data?.qrcode?.code || data?.code || data?.qrcode?.base64 || data?.base64 || data?.qrCode || data?.qr || null;
}

function extractEvolutionStatus(instance) {
  return String(
    instance?.status ||
    instance?.connectionStatus?.state ||
    instance?.connectionStatus?.status ||
    instance?.state ||
    ''
  ).toLowerCase();
}

async function fetchEvolutionInstance(instanceName, apiKey) {
  const api = evolutionApi(apiKey);
  const { data } = await api.get('/instance/fetchInstances');
  const instances = Array.isArray(data) ? data : data?.instances || data?.data || [];
  return instances.find((item) => {
    const instance = item?.instance || item;
    return instance?.instanceName === instanceName || instance?.name === instanceName;
  }) || null;
}

async function createEvolutionInstance({ instanceName, phone_number, webhook_url, token }) {
  const api = evolutionApi();
  const payload = {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    token,
    number: normalizePhoneDigits(phone_number),
    webhook: {
      enabled: true,
      url: webhook_url,
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    },
  };

  console.log('[Evolution] Criando instancia:', JSON.stringify({ ...payload, webhook: payload.webhook }, null, 2));
  const { data } = await api.post('/instance/create', payload);
  return data;
}

async function setEvolutionWebhook(instanceName, apiKey) {
  const api = evolutionApi(apiKey);
  const webhookUrl = getEvolutionWebhookUrl();
  const payload = {
    enabled: true,
    url: webhookUrl,
    events: ['CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPSERT'],
    headers: {},
    base64: true,
  };

  console.log(`[Evolution] Configurando webhook da instancia ${instanceName}: ${webhookUrl}`);
  const { data } = await api.post(`/webhook/set/${encodeURIComponent(instanceName)}`, payload);
  return data;
}

async function getEvolutionWebhook(instanceName, apiKey) {
  const api = evolutionApi(apiKey);
  const { data } = await api.get(`/webhook/find/${encodeURIComponent(instanceName)}`);
  return data;
}

async function ensureEvolutionWebhook(instanceName, apiKey) {
  const expectedUrl = getEvolutionWebhookUrl();

  try {
    const current = await getEvolutionWebhook(instanceName, apiKey);
    const currentWebhook = current?.webhook || current?.data || current;
    if (currentWebhook?.enabled === true && currentWebhook?.url === expectedUrl) {
      return current;
    }
  } catch (error) {
    console.warn('[Evolution] Nao foi possivel consultar webhook atual, tentando configurar:', error.response?.data || error.message);
  }

  return setEvolutionWebhook(instanceName, apiKey);
}

async function connectEvolutionInstance(instanceName, apiKey) {
  const api = evolutionApi(apiKey);
  const { data } = await api.get(`/instance/connect/${encodeURIComponent(instanceName)}`);
  return data;
}

async function sendEvolutionText(instanceName, apiKey, number, message) {
  const api = evolutionApi(apiKey);
  const { data } = await api.post(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    number: normalizeEvolutionSendNumber(number),
    text: String(message),
  });
  if (data?.success === false) {
    throw new Error(extractProviderMessage(data) || 'Evolution recusou o envio da mensagem');
  }
  return data;
}

async function findEvolutionContacts(instanceName, apiKey, { page, limit } = {}) {
  const api = evolutionApi(apiKey);
  const take = Number(limit) || 1000;
  const skip = page ? Math.max(Number(page) - 1, 0) * take : 0;
  const { data } = await api.post(`/chat/findContacts/${encodeURIComponent(instanceName)}`, {
    where: {},
    take,
    skip,
    orderBy: {},
  });
  return Array.isArray(data) ? data : data?.data || data?.contacts || [];
}

async function sendWasenderDefault(number, message) {
  if (!WASENDER_API_KEY) {
    throw new Error('WASENDER_API_KEY nao configurado para fallback.');
  }

  const api = axios.create({
    baseURL: `${WASENDER_BASE_URL}/api`,
    headers: {
      Authorization: `Bearer ${WASENDER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  const { data } = await api.post('/send-message', {
    to: normalizePhoneE164(number),
    text: String(message),
  });
  if (data?.success === false) {
    throw new Error(extractProviderMessage(data) || 'Wasender recusou o envio da mensagem');
  }
  return data;
}

// ===== Controllers =====

export const receiveEvolutionWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    const instanceName = payload?.instance || payload?.instanceName || payload?.data?.instance || payload?.data?.instanceName;
    const event = payload?.event || payload?.type || payload?.data?.event || null;
    const normalizedEvent = String(event || '').replace(/[.-]/g, '_').toUpperCase();
    const normalizedStatus = normalizedEvent === 'CONNECTION_UPDATE'
      ? normalizeEvolutionWebhookStatus(payload)
      : null;

    console.log('[Evolution Webhook] Evento recebido:', {
      instanceName,
      event: normalizedEvent,
      status: normalizedStatus,
    });

    if (!instanceName) {
      return res.status(200).json({ success: true, ignored: true, reason: 'missing_instance' });
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (normalizedStatus) {
      updates.status = normalizedStatus;
    } else if (normalizedEvent === 'QRCODE_UPDATED') {
      updates.status = 'CONNECTING';
    }

    if (Object.keys(updates).length > 1) {
      const { error } = await supabase
        .from('whatsapp_organization')
        .update(updates)
        .eq('evolution_instance_name', instanceName)
        .is('wasender_session_id', null);

      if (error) {
        console.error('[Evolution Webhook] Erro ao atualizar status:', error);
        throw error;
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Evolution Webhook] Erro ao processar webhook:', error.response?.data || error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
};

// 1) Status
export const getWhatsappStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const orgId = await getOrgIdBySlug(slug);

    const row = await getWhatsappRow(orgId);
    if (!row?.whatsapp_api_key) {
      console.log(`[WhatsApp] Sem API key para organização ${slug}`);
      return res.json({ isConnected: false });
    }

    if (!isWasenderRow(row)) {
      const instanceName = getEvolutionInstanceName(row);
      const instanceApiKey = getEvolutionInstanceApiKey(row);
      let evolutionInstance = null;
      try {
        evolutionInstance = await fetchEvolutionInstance(instanceName, instanceApiKey);
      } catch (error) {
        console.warn('[Evolution] Erro ao consultar instancia, usando status local:', error.response?.data || error.message);
      }
      const instance = evolutionInstance?.instance || evolutionInstance;
      const rowStatus = String(row.status || '').toLowerCase();
      const status = rowStatus === 'connected'
        ? rowStatus
        : extractEvolutionStatus(instance) || rowStatus;
      const isConnected = ['open', 'connected'].includes(status);

      console.log(`[Evolution] Status para ${slug}: ${status} (conectado: ${isConnected})`);

      return res.json({
        isConnected,
        status,
        provider: 'evolution',
        sessionId: instanceName,
        data: evolutionInstance,
      });
    }

    // Status é GET /api/status com Authorization Bearer SESSION_API_KEY
    const api = wasenderSession(row.whatsapp_api_key);
    const { data } = await api.get('/status');

    const status = String(data?.status || '').toLowerCase();
    const isConnected = status === 'connected';

    console.log(`[WhatsApp] Status para ${slug}: ${status} (conectado: ${isConnected})`);

    return res.json({
      isConnected,
      status,
      provider: 'wasender',
      sessionId: row.wasender_session_id,
      data,
    });
  } catch (error) {
    const errorMessage = error.message || 'Erro desconhecido';
    console.error('[WhatsApp] Erro ao verificar status:', {
      message: errorMessage,
      details: error.response?.data,
    });
    
    return res.status(error.statusCode || 500).json({
      error: 'Erro ao verificar status',
      details: errorMessage,
    });
  }
};

// 2) Criar sessão (se precisar) + conectar e retornar QR
export const connectWhatsapp = async (req, res) => {
  try {
    const { slug } = req.params;
    const { phone_number, session_name } = req.body;
    const orgId = await getOrgIdBySlug(slug);

    console.log(`[WhatsApp] Iniciando conexão para organização ${slug} (ID: ${orgId})`);

    let row = await getWhatsappRow(orgId);
    let isNewSession = false;

    if (isWasenderRow(row)) {
      console.log(`[WhatsApp] Usando sessão Wasender existente: ${row.wasender_session_id}`);
      const connected = await connectSession(row.wasender_session_id);

      return res.json({
        success: true,
        provider: 'wasender',
        sessionId: row.wasender_session_id,
        apiKey: row.whatsapp_api_key,
        status: connected.status,
        qrCode: connected.qrCode || connected.qr || null,
        isNewSession,
        message:
          connected.status === 'NEED_SCAN' || connected.status === 'SCAN_QR_CODE'
            ? 'Escaneie o QR Code no seu WhatsApp'
            : connected.status === 'CONNECTED'
            ? 'WhatsApp já está conectado'
            : 'Sessão inicializada',
        data: connected,
      });
    }

    try {
      let instanceName = getEvolutionInstanceName(row);
      let instanceApiKey = getEvolutionInstanceApiKey(row);

      if (!instanceName) {
        if (!phone_number) {
          return res.status(400).json({
            error: 'phone_number é obrigatório para criar a primeira sessão (formato E.164).',
          });
        }

        isNewSession = true;
        const webhookUrl = getEvolutionWebhookUrl();
        instanceName = buildEvolutionInstanceName(slug, session_name);
        const generatedApiKey = generateEvolutionInstanceApiKey();

        console.log(`[Evolution] Criando nova instancia: ${instanceName}`);
        let created = null;
        try {
          created = await createEvolutionInstance({
            instanceName,
            phone_number,
            webhook_url: webhookUrl,
            token: generatedApiKey,
          });
        } catch (createError) {
          if (!isEvolutionInstanceAlreadyExistsError(createError)) {
            throw createError;
          }

          const error = new Error(
            `A instancia Evolution "${instanceName}" ja existe sem uma chave registrada no banco. Exclua-a na Evolution e tente conectar novamente.`
          );
          error.statusCode = 409;
          throw error;
        }

        instanceApiKey = generatedApiKey;
        row = await upsertWhatsappRow(orgId, {
          wasender_session_id: null,
          phone_organization: phone_number,
          whatsapp_api_key: instanceApiKey,
          evolution_instance_name: instanceName,
          webhook_secret: null,
          status: created?.instance?.status || 'CREATED',
        });

        await ensureEvolutionWebhook(instanceName, instanceApiKey);

        const createdQr = extractEvolutionQr(created);
        if (createdQr) {
          return res.json({
            success: true,
            provider: 'evolution',
            sessionId: instanceName,
            status: created?.instance?.status || 'connecting',
            qrCode: createdQr,
            isNewSession,
            message: 'Escaneie o QR Code no seu WhatsApp',
            data: created,
          });
        }
      } else {
        console.log(`[Evolution] Usando instancia existente: ${instanceName}`);
      }

      await ensureEvolutionWebhook(instanceName, instanceApiKey);
      const connected = await connectEvolutionInstance(instanceName, instanceApiKey);

      return res.json({
        success: true,
        provider: 'evolution',
        sessionId: instanceName,
        status: connected?.status || 'connecting',
        qrCode: extractEvolutionQr(connected),
        isNewSession,
        message: 'Escaneie o QR Code no seu WhatsApp',
        data: connected,
      });
    } catch (evolutionError) {
      console.error('[Evolution] Falha ao conectar. Acionando fallback Wasender:', evolutionError.response?.data || evolutionError.message);

      if (!phone_number && !row?.phone_organization) {
        throw evolutionError;
      }

      try {
        const phoneE164 = normalizePhoneE164(phone_number || row.phone_organization);
      const webhookUrl = `${BACKEND_URL}/api/whatsapp-webhook/${slug}`;
      const finalSessionName = session_name || `org_${slug}`;
      const created = await createWhatsappSession({
        name: finalSessionName,
        phone_number: phoneE164,
        webhook_url: webhookUrl,
      });

      row = await upsertWhatsappRow(orgId, {
        wasender_session_id: created.id,
        phone_organization: phone_number || row?.phone_organization,
        whatsapp_api_key: created.api_key,
        webhook_secret: created.webhook_secret || null,
        status: created.status || 'CREATED',
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      const connected = await connectSession(row.wasender_session_id);

      return res.json({
        success: true,
        provider: 'wasender',
        fallbackFrom: 'evolution',
        sessionId: row.wasender_session_id,
        apiKey: row.whatsapp_api_key,
        status: connected.status,
        qrCode: connected.qrCode || connected.qr || null,
        isNewSession: true,
        message:
          connected.status === 'NEED_SCAN' || connected.status === 'SCAN_QR_CODE'
            ? 'Escaneie o QR Code no seu WhatsApp'
            : 'Sessão inicializada via fallback Wasender',
        data: connected,
      });
      } catch (wasenderError) {
        console.error('[Wasender] Fallback falhou:', wasenderError.response?.data || wasenderError.message);

        return res.status(502).json({
          success: false,
          error: 'Erro ao conectar WhatsApp',
          provider: 'evolution',
          fallbackTried: true,
          details: {
            evolution: serializeProviderError(evolutionError),
            wasender: serializeProviderError(wasenderError),
          },
          message: 'A Evolution falhou e o fallback Wasender tambem falhou.',
        });
      }
    }

  } catch (error) {
    console.error('[WhatsApp] Erro ao conectar WhatsApp:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
    
    return res.status(error.statusCode || 500).json({
      success: false,
      error: 'Erro ao conectar WhatsApp',
      details: error.response?.data || error.message,
      message: error.message,
    });
  }
};

// 3) Desconectar
export const disconnectWhatsapp = async (req, res) => {
  try {
    const { slug } = req.params;
    const orgId = await getOrgIdBySlug(slug);

    const row = await getWhatsappRow(orgId);
    if (row?.wasender_session_id) {
      // Disconnect: POST /api/whatsapp-sessions/{id}/disconnect :contentReference[oaicite:15]{index=15}
      try {
        await disconnectSession(row.wasender_session_id);
      } catch (e) {
        console.error('Erro ao desconectar na API Wasender:', e.response?.data || e.message);
      }
    }

    await supabase
      .from('whatsapp_organization')
      .delete()
      .eq('organization_id', orgId);

    return res.json({ success: true, message: 'WhatsApp desconectado' });
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error.response?.data || error.message);
    return res.status(error.statusCode || 500).json({
      error: 'Erro ao desconectar WhatsApp',
      details: error.response?.data || error.message,
    });
  }
};

// 4) Contatos
export const getContacts = async (req, res) => {
  try {
    const { slug } = req.params;
    const { search, paginated, page, limit } = req.query;

    const orgId = await getOrgIdBySlug(slug);
    const row = await getWhatsappRow(orgId);

    let storedContacts = [];
    try {
      storedContacts = await getStoredContacts(orgId);
    } catch (dbErr) {
      console.warn('[WhatsApp] Erro ao buscar contatos salvos no banco:', dbErr?.message || String(dbErr));
    }

    if (!row?.whatsapp_api_key) {
      const contacts = filterContacts(storedContacts, search);
      return res.json({
        success: true,
        contacts,
        total: contacts.length,
        cached: false,
        source: 'database',
        provider: 'none',
        isConnected: false,
      });
    }

    // Cache key específico para esta organização
    const cacheKey = `whatsapp_contacts:${orgId}`;
    const cacheCountKey = `whatsapp_contacts_count:${orgId}`;
    const CACHE_TTL = 48 * 60 * 60; // 48 horas em segundos
    const BATCH_SIZE = 800; // Limite seguro para queries do Supabase (< 1000)

    // Tenta buscar do cache primeiro
    if (redis) {
      try {
        // Tenta obter do cache - se estiver lá, retorna
        const cacheCountStr = await redis.get(cacheCountKey);
        const cachedCount = parseInt(cacheCountStr || '0', 10);
        
        if (cachedCount > 0) {
          console.log(`[WhatsApp] Cache hit para organização ${slug} (${cachedCount} contatos em cache)`);
          
          // Buscar do cache com paginação
          let allCachedContacts = [];
          const cachePages = Math.ceil(cachedCount / BATCH_SIZE);
          
          for (let i = 0; i < cachePages; i++) {
            try {
              const cachePageKey = `${cacheKey}:page:${i}`;
              const cachedPage = await redis.get(cachePageKey);
              if (cachedPage) {
                const pageContacts = typeof cachedPage === 'string' ? JSON.parse(cachedPage) : cachedPage;
                allCachedContacts = allCachedContacts.concat(pageContacts);
              }
            } catch (pageErr) {
              console.warn(`[WhatsApp] Erro ao buscar página ${i} do cache:`, pageErr.message);
            }
          }

          const filteredContacts = filterContacts(allCachedContacts, search);
          
          return res.json({
            success: true,
            contacts: filteredContacts,
            total: filteredContacts.length,
            cached: true,
            source: 'redis_cache',
          });
        }
      } catch (cacheErr) {
        console.warn('[WhatsApp] Erro ao buscar cache Redis:', cacheErr?.message || String(cacheErr));
      }
    }

    if (!isWasenderRow(row)) {
      const instanceName = getEvolutionInstanceName(row);
      const instanceApiKey = getEvolutionInstanceApiKey(row);
      console.log(`[Evolution] Buscando contatos para ${slug}...`);
      let contactsApi = [];
      try {
        contactsApi = await findEvolutionContacts(instanceName, instanceApiKey, { page, limit });
      } catch (apiErr) {
        console.warn('[Evolution] Erro ao buscar contatos na API, usando banco:', apiErr.response?.data || apiErr.message);
        const contacts = filterContacts(storedContacts, search);
        return res.json({
          success: true,
          contacts,
          total: contacts.length,
          cached: false,
          provider: 'evolution',
          source: 'database_fallback',
        });
      }

      const mapped = contactsApi.map((c) => {
        const phone = normalizePhoneDigits(c.number || c.id || c.jid);
        return {
          ...c,
          jid: c.id || c.jid || (phone ? `${phone}@s.whatsapp.net` : null),
          phone_contact: phone,
          name_api: c.pushName || c.name || null,
          imgUrl: c.profilePictureUrl || c.imgUrl || null,
        };
      }).filter((c) => !!c.phone_contact);

      const now = new Date().toISOString();
      const upserts = mapped.map((c) => ({
        organization_id: orgId,
        phone_contact: c.phone_contact,
        whatsapp_jid: c.jid,
        name_contact: c.name_api,
        image_contact: c.imgUrl,
        last_sync_at: now,
        updated_at: now,
      }));

      if (upserts.length > 0) {
        const { error: upsertErr } = await supabase
          .from('whatsapp_contacts')
          .upsert(upserts, { onConflict: 'organization_id,phone_contact' });

        if (upsertErr) {
          console.warn('[Evolution] Erro ao sincronizar contatos no banco:', upsertErr.message);
        }
      }

      const apiContacts = mapped.map((c) => ({
        ...c,
        name: c.name_api || 'Sem nome',
        phone: c.phone_contact,
        image: c.imgUrl || null,
        observation: null,
      }));

      const refreshedStoredContacts = await getStoredContacts(orgId).catch(() => storedContacts);
      const contacts = filterContacts(mergeContacts(apiContacts, refreshedStoredContacts), search);

      return res.json({
        success: true,
        contacts,
        total: contacts.length,
        cached: false,
        provider: 'evolution',
        source: 'evolution_api_with_db_sync',
      });
    }

    // GET /api/contacts com Authorization Bearer API_KEY
    const api = wasenderSession(row.whatsapp_api_key);

    const params = {};
    if (paginated !== undefined) params.paginated = String(paginated) === 'true';
    if (page) params.page = Number(page);
    if (limit) params.limit = Number(limit);

    console.log(`[WhatsApp] Buscando contatos da API Wasender para ${slug}...`);
    let data = null;
    try {
      const response = await api.get('/contacts', { params });
      data = response.data;
    } catch (apiErr) {
      console.warn('[WhatsApp] Erro ao buscar contatos na Wasender, usando banco:', apiErr.response?.data || apiErr.message);
      const contacts = filterContacts(storedContacts, search);
      return res.json({
        success: true,
        contacts,
        total: contacts.length,
        cached: false,
        provider: 'wasender',
        source: 'database_fallback',
      });
    }

    // Wasender API: { success: true, data: [...] } ou { success: true, data: { items: [...] } }
    let contactsApi = [];
    if (Array.isArray(data?.data)) {
      contactsApi = data.data;
    } else if (Array.isArray(data?.data?.items)) {
      contactsApi = data.data.items;
    }

    console.log(`[WhatsApp] Recebidos ${contactsApi.length} contatos da API`);

    // Mapeia dados básicos + telefone
    const mapped = contactsApi.map((c) => {
      const phone = extractPhoneFromJid(c.jid || c.id);
      return {
        ...c,
        jid: c.jid || c.id,
        phone_contact: phone,
        name_api: c.name || c.notify || c.verifiedName || null,
      };
    }).filter((c) => !!c.phone_contact);

    console.log(`[WhatsApp] Mapeados ${mapped.length} contatos com telefone válido`);

    // Salvar no banco de dados em LOTES COM PAGINAÇÃO
    console.log(`[WhatsApp] Salvando ${mapped.length} contatos no banco de dados em lotes de ${BATCH_SIZE}...`);
    
    const now = new Date().toISOString();
    const totalBatches = Math.ceil(mapped.length / BATCH_SIZE);
    
    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const startIdx = batchIdx * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, mapped.length);
      const batchMapped = mapped.slice(startIdx, endIdx);
      
      console.log(`[WhatsApp] Processando lote ${batchIdx + 1}/${totalBatches} (${batchMapped.length} contatos)...`);

      // Buscar existentes DESTE LOTE
      const phonesInBatch = batchMapped.map((c) => c.phone_contact);
      
      let existingMap = {};
      try {
        const { data: existingRows, error: existingErr } = await supabase
          .from('whatsapp_contacts')
          .select('*')
          .eq('organization_id', orgId)
          .in('phone_contact', phonesInBatch);

        if (existingErr) {
          console.error(`[WhatsApp] Erro ao buscar existentes (lote ${batchIdx + 1}):`, {
            message: existingErr.message,
            code: existingErr.code,
            details: existingErr.details,
          });
          throw existingErr;
        }

        existingMap = Object.fromEntries((existingRows || []).map((r) => [r.phone_contact, r]));
        console.log(`[WhatsApp] Encontrados ${Object.keys(existingMap).length} contatos existentes neste lote`);
      } catch (existingErr) {
        console.warn(`[WhatsApp] Erro ao buscar existentes (lote ${batchIdx + 1}), prosseguindo com dados da API:`, existingErr?.message || String(existingErr));
      }

      // Preparar upserts para este lote
      const upserts = batchMapped.map((c) => {
        const prev = existingMap[c.phone_contact];
        return {
          organization_id: orgId,
          phone_contact: c.phone_contact,
          whatsapp_jid: c.jid || prev?.whatsapp_jid || null,
          name_contact: c.name_api || prev?.name_contact || null,
          image_contact: c.imgUrl || prev?.image_contact || null,
          observation_contact: prev?.observation_contact || null,
          is_business: prev?.is_business ?? null,
          last_sync_at: now,
          updated_at: now,
        };
      });

      // Fazer upsert
      try {
        console.log(`[WhatsApp] Fazendo upsert de ${upserts.length} contatos (lote ${batchIdx + 1})...`);
        const { error: upsertErr } = await supabase
          .from('whatsapp_contacts')
          .upsert(upserts, { onConflict: 'organization_id,phone_contact' });

        if (upsertErr) {
          console.error(`[WhatsApp] Erro no upsert (lote ${batchIdx + 1}):`, {
            message: upsertErr.message,
            code: upsertErr.code,
            details: upsertErr.details,
          });
          throw upsertErr;
        }
        console.log(`[WhatsApp] Upsert concluído para lote ${batchIdx + 1}`);
      } catch (upsertErr) {
        console.error(`[WhatsApp] Falha no upsert (lote ${batchIdx + 1}):`, upsertErr?.message || String(upsertErr));
      }
    }

    // Recarregar contatos do banco em LOTES COM PAGINAÇÃO
    console.log(`[WhatsApp] Recarregando ${mapped.length} contatos do banco em lotes de ${BATCH_SIZE}...`);
    let apiContacts = [];
    const totalBatchesForReload = Math.ceil(mapped.length / BATCH_SIZE);

    for (let batchIdx = 0; batchIdx < totalBatchesForReload; batchIdx++) {
      const startIdx = batchIdx * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, mapped.length);
      const phonesInBatch = mapped.slice(startIdx, endIdx).map((c) => c.phone_contact);

      try {
        const { data: refreshedRows, error: refreshErr } = await supabase
          .from('whatsapp_contacts')
          .select('*')
          .eq('organization_id', orgId)
          .in('phone_contact', phonesInBatch);

        if (refreshErr) {
          console.error(`[WhatsApp] Erro ao recarregar lote ${batchIdx + 1}:`, {
            message: refreshErr.message,
            code: refreshErr.code,
            details: refreshErr.details,
          });
          throw refreshErr;
        }

        const refreshedMap = Object.fromEntries((refreshedRows || []).map((r) => [r.phone_contact, r]));

        const batchContacts = mapped.slice(startIdx, endIdx).map((c) => {
          const db = refreshedMap[c.phone_contact];
          const nameFinal = db?.name_contact || c.name_api || c.name || c.notify || c.verifiedName || 'Sem nome';
          return {
            ...c,
            name: nameFinal,
            phone: c.phone_contact,
            image: db?.image_contact || c.imgUrl || null,
            observation: db?.observation_contact || null,
          };
        });

        apiContacts = apiContacts.concat(batchContacts);
        console.log(`[WhatsApp] Recarregados ${batchContacts.length} contatos (lote ${batchIdx + 1}/${totalBatchesForReload})`);
      } catch (reloadErr) {
        console.error(`[WhatsApp] Erro ao recarregar lote ${batchIdx + 1}:`, reloadErr?.message || String(reloadErr));
      }
    }

    const refreshedStoredContacts = await getStoredContacts(orgId).catch(() => storedContacts);
    let contacts = mergeContacts(apiContacts, refreshedStoredContacts);

    console.log(`[WhatsApp] Total de contatos sincronizados: ${contacts.length}`);

    // Salvar no Redis em LOTES COM PAGINAÇÃO
    if (redis && contacts.length > 0) {
      try {
        console.log(`[WhatsApp] Salvando ${contacts.length} contatos no Redis em lotes de ${BATCH_SIZE}...`);
        
        const totalCachePages = Math.ceil(contacts.length / BATCH_SIZE);
        for (let pageIdx = 0; pageIdx < totalCachePages; pageIdx++) {
          const startIdx = pageIdx * BATCH_SIZE;
          const endIdx = Math.min(startIdx + BATCH_SIZE, contacts.length);
          const pageContacts = contacts.slice(startIdx, endIdx);

          const cachePageKey = `${cacheKey}:page:${pageIdx}`;
          await redis.set(cachePageKey, JSON.stringify(pageContacts), { ex: CACHE_TTL });
          console.log(`[WhatsApp] Página ${pageIdx + 1}/${totalCachePages} salva no Redis (${pageContacts.length} contatos)`);
        }

        // Salvar contagem total
        await redis.set(cacheCountKey, String(contacts.length), { ex: CACHE_TTL });
        console.log(`[WhatsApp] Cache concluído para ${slug} (${contacts.length} contatos em ${totalCachePages} páginas, TTL: 48h)`);
      } catch (cacheErr) {
        console.warn('[WhatsApp] Erro ao salvar cache Redis:', cacheErr?.message || String(cacheErr));
      }
    }

    contacts = filterContacts(contacts, search);

    return res.json({
      success: true,
      contacts,
      total: contacts.length,
      cached: false,
      source: 'api_with_db_sync',
      batchSize: BATCH_SIZE,
    });
  } catch (error) {
    const errorMessage = error.message || 'Erro desconhecido';
    const errorStack = error.stack || '';
    const errorDetails = error.response?.data || error.details || errorMessage;
    
    console.error('[WhatsApp] Erro ao buscar contatos:', {
      message: errorMessage,
      details: errorDetails,
      code: error.code,
      stack: errorStack.split('\n').slice(0, 3).join(' | '),
    });
    
    return res.status(500).json({
      error: 'Erro ao buscar contatos',
      details: errorMessage,
      errorCode: error.code,
    });
  }
};

// 4.1) Informações detalhadas de um contato
export const getContactInfo = async (req, res) => {
  try {
    const { slug, jid } = req.params;
    const orgId = await getOrgIdBySlug(slug);
    const row = await getWhatsappRow(orgId);

    if (!row?.whatsapp_api_key) {
      return res.status(400).json({ error: 'WhatsApp nao conectado' });
    }

    const targetJid = decodeURIComponent(jid);
    const phone = extractPhoneFromJid(targetJid);

    if (!isWasenderRow(row)) {
      const instanceName = getEvolutionInstanceName(row);
      const instanceApiKey = getEvolutionInstanceApiKey(row);
      const contactsApi = await findEvolutionContacts(instanceName, instanceApiKey, { limit: 1000 });
      const apiContact = contactsApi.find((c) => {
        const contactPhone = normalizePhoneDigits(c.number || c.id || c.jid);
        return contactPhone === phone;
      }) || {};

      const { data: existing } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('phone_contact', phone)
        .maybeSingle();

      const responseContact = {
        ...apiContact,
        jid: apiContact.id || apiContact.jid || targetJid,
        phone_contact: phone,
        name: existing?.name_contact || apiContact.pushName || apiContact.name || null,
        observation: existing?.observation_contact || null,
        image: existing?.image_contact || apiContact.profilePictureUrl || apiContact.imgUrl || null,
      };

      return res.json({
        success: true,
        provider: 'evolution',
        contact: responseContact,
        raw: apiContact,
      });
    }

    const api = wasenderSession(row.whatsapp_api_key);

    console.log(`[WhatsApp] Buscando informações detalhadas do contato ${phone}...`);

    const { data } = await api.get(`/contacts/${encodeURIComponent(targetJid)}`);
    const apiContact = data?.data || data || {};

    console.log(`[WhatsApp] Recebido contato da API:`, { phone, name: apiContact.name });

    // Tenta mesclar com banco de dados
    let upserted = null;
    try {
      // Mescla/garante persistência no banco
      const { data: existing, error: existingErr } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('phone_contact', phone)
        .maybeSingle();

      if (existingErr) {
        console.error('[WhatsApp] Erro ao buscar contato existente:', existingErr);
        throw existingErr;
      }

      console.log(`[WhatsApp] Contato existente no banco:`, { 
        exists: !!existing,
        name: existing?.name_contact,
        observation: existing?.observation_contact,
      });

      const merged = {
        organization_id: orgId,
        phone_contact: phone,
        whatsapp_jid: apiContact.jid || apiContact.id || targetJid,
        name_contact: apiContact.name || apiContact.notify || apiContact.verifiedName || existing?.name_contact || null,
        image_contact: apiContact.imgUrl || existing?.image_contact || null,
        observation_contact: existing?.observation_contact || null,
        updated_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
      };

      console.log(`[WhatsApp] Fazendo upsert do contato ${phone}...`);

      const { data: upsertData, error: upsertErr } = await supabase
        .from('whatsapp_contacts')
        .upsert(merged, { onConflict: 'organization_id,phone_contact' })
        .select('*')
        .single();

      if (upsertErr) {
        console.error('[WhatsApp] Erro no upsert:', upsertErr);
        throw upsertErr;
      }

      upserted = upsertData;
      console.log(`[WhatsApp] Contato ${phone} upsertado com sucesso`);
    } catch (dbErr) {
      console.warn('[WhatsApp] Erro ao sincronizar com banco, usando dados da API:', dbErr.message);
      upserted = null; // Usar dados da API
    }

    const responseContact = {
      ...apiContact,
      jid: apiContact.jid || apiContact.id || targetJid,
      phone_contact: phone,
      name: upserted?.name_contact || apiContact.name || apiContact.notify || apiContact.verifiedName,
      observation: upserted?.observation_contact || null,
      image: upserted?.image_contact || apiContact.imgUrl || null,
    };

    return res.json({
      success: true,
      contact: responseContact,
      raw: data,
    });
  } catch (error) {
    const errorMessage = error.message || 'Erro desconhecido';
    console.error('[WhatsApp] Erro ao buscar contato:', {
      message: errorMessage,
      details: error.response?.data,
      stack: error.stack?.split('\n').slice(0, 3).join(' | '),
    });
    
    return res.status(error.statusCode || 500).json({
      error: 'Erro ao buscar contato',
      details: errorMessage,
    });
  }
};

// 4.2) Atualizar dados locais (nome/observação/imagem) de um contato
export const updateContactInfo = async (req, res) => {
  try {
    const { slug, jid } = req.params;
    const { name, observation, image } = req.body || {};

    console.log(`[WhatsApp] Atualizando contato ${jid} com:`, { name, observation, image: image ? '***' : null });

    const orgId = await getOrgIdBySlug(slug);
    const phone = extractPhoneFromJid(decodeURIComponent(jid));

    if (!phone) {
      return res.status(400).json({ error: 'jid inválido' });
    }

    const updates = {
      name_contact: name?.trim() ? name.trim() : undefined,
      observation_contact: observation?.trim() ? observation.trim() : undefined,
      image_contact: image || undefined,
      updated_at: new Date().toISOString(),
    };

    // remove undefined
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    if (Object.keys(updates).length === 1 && updates.updated_at) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    const payload = {
      organization_id: orgId,
      phone_contact: phone,
      whatsapp_jid: decodeURIComponent(jid),
      ...updates,
    };

    console.log(`[WhatsApp] Fazendo upsert do contato ${phone}...`);

    const { data: upserted, error } = await supabase
      .from('whatsapp_contacts')
      .upsert(payload, { onConflict: 'organization_id,phone_contact' })
      .select('*')
      .single();

    if (error) {
      console.error('[WhatsApp] Erro no upsert:', error);
      throw error;
    }

    console.log(`[WhatsApp] Contato ${phone} atualizado com sucesso`);

    // Invalida cache de contatos ao atualizar (remove todas as páginas)
    if (redis) {
      try {
        const cacheKey = `whatsapp_contacts:${orgId}`;
        const cacheCountKey = `whatsapp_contacts_count:${orgId}`;
        const cachedCountStr = await redis.get(cacheCountKey);
        const cachedCount = parseInt(cachedCountStr || '0', 10);
        
        // Remover todas as páginas cacheadas
        const BATCH_SIZE = 800;
        const totalPages = Math.ceil(cachedCount / BATCH_SIZE);
        
        for (let i = 0; i < totalPages; i++) {
          const cachePageKey = `${cacheKey}:page:${i}`;
          await redis.del(cachePageKey);
        }
        
        // Remover contador
        await redis.del(cacheCountKey);
        
        console.log(`[WhatsApp] Cache invalidado para organização ${orgId} (${totalPages} páginas removidas)`);
      } catch (cacheErr) {
        console.warn('[WhatsApp] Erro ao invalidar cache:', cacheErr?.message || String(cacheErr));
      }
    }

    return res.json({ success: true, contact: upserted });
  } catch (error) {
    const errorMessage = error.message || 'Erro desconhecido';
    console.error('[WhatsApp] Erro ao atualizar contato:', {
      message: errorMessage,
      details: error.response?.data,
      stack: error.stack?.split('\n').slice(0, 3).join(' | '),
    });
    
    return res.status(error.statusCode || 500).json({
      error: 'Erro ao atualizar contato',
      details: errorMessage,
    });
  }
};

// 5) Enviar mensagem
export const sendMessage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
    }

    const orgId = await getOrgIdBySlug(slug);
    const row = await getWhatsappRow(orgId);

    if (!row?.whatsapp_api_key) {
      return res.status(400).json({ error: 'WhatsApp nao conectado' });
    }

    if (!isWasenderRow(row)) {
      try {
        const data = await sendEvolutionText(
          getEvolutionInstanceName(row),
          getEvolutionInstanceApiKey(row),
          number,
          message
        );
        return res.json({ success: true, provider: 'evolution', data });
      } catch (evolutionError) {
        console.error('[Evolution] Erro ao enviar mensagem. Tentando fallback Wasender:', evolutionError.response?.data || evolutionError.message);
        const data = await sendWasenderDefault(number, message);
        return res.json({ success: true, provider: 'wasender', fallbackFrom: 'evolution', data });
      }
    }

    // POST /api/send-message com Authorization Bearer API_KEY
    const api = wasenderSession(row.whatsapp_api_key);

    const { data } = await api.post('/send-message', {
      to: normalizePhoneE164(number),
      text: String(message),
    });

    if (data?.success === false) {
      throw new Error(extractProviderMessage(data) || 'Wasender recusou o envio da mensagem');
    }

    return res.json({ success: true, data });
  } catch (error) {
    const errorMessage = error.message || 'Erro desconhecido';
    console.error('[WhatsApp] Erro ao enviar mensagem:', {
      message: errorMessage,
      details: error.response?.data,
    });
    
    return res.status(500).json({
      error: 'Erro ao enviar mensagem',
      details: errorMessage,
    });
  }
};

// 6) Enviar em lote (com delay simples)
export const sendBulkMessages = async (req, res) => {
  try {
    const { slug } = req.params;
    const { numbers, message } = req.body;

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ error: 'Lista de números inválida' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    if (numbers.length > 100) {
      return res.status(400).json({ error: 'Limite de 100 contatos por envio' });
    }

    const orgId = await getOrgIdBySlug(slug);
    const row = await getWhatsappRow(orgId);

    if (!row?.whatsapp_api_key) {
      return res.status(400).json({ error: 'WhatsApp nao conectado' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    if (!isWasenderRow(row)) {
      for (const n of numbers) {
        try {
          try {
            await sendEvolutionText(
              getEvolutionInstanceName(row),
              getEvolutionInstanceApiKey(row),
              n,
              message
            );
          } catch (evolutionError) {
            console.error('[Evolution] Erro no envio em lote. Tentando fallback Wasender:', evolutionError.response?.data || evolutionError.message);
            await sendWasenderDefault(n, message);
          }
          results.success++;
          await new Promise((r) => setTimeout(r, 1200));
        } catch (e) {
          results.failed++;
          results.errors.push({
            number: n,
            error: e.response?.data || e.message,
          });
        }
      }

      return res.json({
        success: true,
        provider: 'evolution',
        fallback: results.errors.length > 0 ? 'partial' : 'available',
        results,
        message: `${results.success} mensagens enviadas, ${results.failed} falharam`,
      });
    }

    const api = wasenderSession(row.whatsapp_api_key);

    for (const n of numbers) {
      try {
        const { data } = await api.post('/send-message', {
          to: normalizePhoneE164(n),
          text: String(message),
        });
        if (data?.success === false) {
          throw new Error(extractProviderMessage(data) || 'Wasender recusou o envio da mensagem');
        }
        results.success++;
        await new Promise((r) => setTimeout(r, 1200)); // delay fixo
      } catch (e) {
        results.failed++;
        results.errors.push({
          number: n,
          error: e.response?.data || e.message,
        });
      }
    }

    return res.json({
      success: true,
      results,
      message: `${results.success} mensagens enviadas, ${results.failed} falharam`,
    });
  } catch (error) {
    const errorMessage = error.message || 'Erro desconhecido';
    console.error('[WhatsApp] Erro ao enviar mensagens em lote:', {
      message: errorMessage,
      details: error.response?.data,
    });
    
    return res.status(500).json({
      error: 'Erro ao enviar mensagens em lote',
      details: errorMessage,
    });
  }
};

// 7) Estatísticas (ex.: total de contatos + status)
export const getStatistics = async (req, res) => {
  try {
    const { slug } = req.params;
    const orgId = await getOrgIdBySlug(slug);

    const row = await getWhatsappRow(orgId);
    if (!row?.whatsapp_api_key) {
      return res.json({ isConnected: false, totalContacts: 0, connectedSince: null });
    }

    if (!isWasenderRow(row)) {
      let status = 'unknown';
      let totalContacts = 0;
      const instanceName = getEvolutionInstanceName(row);
      const instanceApiKey = getEvolutionInstanceApiKey(row);

      try {
        const evolutionInstance = await fetchEvolutionInstance(instanceName, instanceApiKey);
        status = extractEvolutionStatus(evolutionInstance?.instance || evolutionInstance) || 'unknown';
      } catch (e) {
        console.warn('[Evolution] Erro ao buscar status para estatísticas:', e?.message);
      }

      try {
        const contacts = await findEvolutionContacts(instanceName, instanceApiKey, { limit: 1000 });
        totalContacts = contacts.length;
      } catch (e) {
        console.warn('[Evolution] Erro ao buscar contatos para estatísticas:', e?.message);
      }

      return res.json({
        isConnected: ['open', 'connected'].includes(status),
        status,
        provider: 'evolution',
        totalContacts,
        connectedSince: row.created_at || null,
        sessionId: instanceName,
      });
    }

    const api = wasenderSession(row.whatsapp_api_key);

    // status: GET /api/status
    let status = 'unknown';
    try {
      const { data } = await api.get('/status');
      status = String(data?.status || '').toLowerCase();
    } catch (e) {
      console.warn('[WhatsApp] Erro ao buscar status:', e?.message);
    }

    // contacts: GET /api/contacts
    let totalContacts = 0;
    try {
      const { data } = await api.get('/contacts');
      let contacts = [];
      if (Array.isArray(data?.data)) {
        contacts = data.data;
      } else if (Array.isArray(data?.data?.items)) {
        contacts = data.data.items;
      }
      totalContacts = contacts.length;
    } catch (e) {
      console.warn('[WhatsApp] Erro ao buscar contatos para estatísticas:', e?.message);
    }

    return res.json({
      isConnected: status === 'connected',
      status,
      totalContacts,
      connectedSince: row.created_at || null,
      sessionId: row.wasender_session_id,
    });
  } catch (error) {
    const errorMessage = error.message || 'Erro desconhecido';
    console.error('[WhatsApp] Erro ao buscar estatísticas:', {
      message: errorMessage,
      details: error.response?.data,
    });
    
    return res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      details: errorMessage,
    });
  }
};

// 8) Obter QR Code da sessão (útil quando QR expira ou precisa re-gerar)
export const getQRCode = async (req, res) => {
  try {
    const { slug } = req.params;
    const orgId = await getOrgIdBySlug(slug);

    const row = await getWhatsappRow(orgId);

    if (row?.whatsapp_api_key && !isWasenderRow(row)) {
      const instanceName = getEvolutionInstanceName(row);
      const instanceApiKey = getEvolutionInstanceApiKey(row);
      console.log(`[Evolution] Obtendo QR Code para organização ${slug}`);
      await ensureEvolutionWebhook(instanceName, instanceApiKey);
      const qrData = await connectEvolutionInstance(instanceName, instanceApiKey);

      return res.json({
        success: true,
        provider: 'evolution',
        sessionId: instanceName,
        status: qrData?.status || 'connecting',
        qrCode: extractEvolutionQr(qrData),
        message: 'Escaneie o QR Code no seu WhatsApp',
        data: qrData,
      });
    }
    
    if (!row?.wasender_session_id) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada. Crie uma sessão primeiro.',
      });
    }

    console.log(`[WhatsApp] Obtendo QR Code para organização ${slug}`);

    const qrData = await getSessionQRCode(row.wasender_session_id);

    return res.json({
      success: true,
      sessionId: row.wasender_session_id,
      status: qrData.status,
      qrCode: qrData.qrCode || qrData.qr || null,
      message: qrData.status === 'NEED_SCAN' || qrData.status === 'SCAN_QR_CODE'
        ? 'Escaneie o QR Code no seu WhatsApp'
        : 'Sessão já conectada',
      data: qrData,
    });
  } catch (error) {
    console.error('[WhatsApp] Erro ao obter QR Code:', {
      message: error.message,
      response: error.response?.data,
    });
    
    return res.status(error.statusCode || 500).json({
      success: false,
      error: 'Erro ao obter QR Code',
      details: error.response?.data || error.message,
    });
  }
};
