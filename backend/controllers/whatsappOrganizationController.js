import { supabase } from '../lib/supabase.js';
import axios from 'axios';

/**
 * ENV esperadas:
 * - WASENDER_API_URL=https://www.wasenderapi.com (base URL da API)
 * - WASENDER_PERSONAL_ACCESS_TOKEN=... (Personal Access Token para criar/gerenciar sessões)
 * - BACKEND_URL=https://seu-backend.com (para webhook_url)
 */
const WASENDER_BASE_URL = (process.env.WASENDER_API_URL || 'https://www.wasenderapi.com').replace(/\/$/, '');
const WASENDER_PERSONAL_ACCESS_TOKEN = process.env.WASENDER_PERSONAL_ACCESS_TOKEN;
const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/$/, '');

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

  const { data } = await api.post('/whatsapp-sessions', payload);
  if (!data?.success || !data?.data?.id || !data?.data?.api_key) {
    throw new Error(`Resposta inesperada ao criar sessão: ${JSON.stringify(data)}`);
  }

  return data.data; // {id, api_key, webhook_secret, ...}
}

async function connectSession(sessionId) {
  assertEnv();
  const api = wasenderPersonal();
  const { data } = await api.post(`/whatsapp-sessions/${sessionId}/connect`);
  // retorna {success:true, data:{status:"NEED_SCAN", qrCode:"..."}} :contentReference[oaicite:11]{index=11}
  if (!data?.success || !data?.data) {
    throw new Error(`Resposta inesperada ao conectar sessão: ${JSON.stringify(data)}`);
  }
  return data.data;
}

async function disconnectSession(sessionId) {
  assertEnv();
  const api = wasenderPersonal();
  const { data } = await api.post(`/whatsapp-sessions/${sessionId}/disconnect`);
  return data;
}

// ===== Controllers =====

// 1) Status
export const getWhatsappStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const orgId = await getOrgIdBySlug(slug);

    const row = await getWhatsappRow(orgId);
    if (!row?.wasender_api_key) {
      return res.json({ isConnected: false });
    }

    // Status é GET /api/status com Authorization Bearer SESSION_API_KEY :contentReference[oaicite:12]{index=12}
    const api = wasenderSession(row.wasender_api_key);
    const { data } = await api.get('/status');

    const status = String(data?.status || '').toLowerCase();
    const isConnected = status === 'connected';

    return res.json({
      isConnected,
      status,
      sessionId: row.wasender_session_id,
      data,
    });
  } catch (error) {
    console.error('Erro ao verificar status WhatsApp:', error.response?.data || error.message);
    return res.status(error.statusCode || 500).json({
      error: 'Erro ao verificar status',
      details: error.response?.data || error.message,
    });
  }
};

// 2) Criar sessão (se precisar) + conectar e retornar QR
export const connectWhatsapp = async (req, res) => {
  try {
    const { slug } = req.params;
    const { phone_number, session_name } = req.body; // session_name agora é enviado pelo frontend
    const orgId = await getOrgIdBySlug(slug);

    let row = await getWhatsappRow(orgId);

    // Se não existe sessão, cria uma
    if (!row?.wasender_session_id || !row?.wasender_api_key) {
      if (!phone_number) {
        return res.status(400).json({
          error: 'phone_number é obrigatório para criar a primeira sessão (formato E.164).',
        });
      }

      const phoneE164 = normalizePhoneE164(phone_number);
      const webhookUrl = `${BACKEND_URL}/api/whatsapp-webhook/${slug}`;
      const finalSessionName = session_name || `org_${slug}`; // Usar nome do frontend ou padrão

      // Create: POST /api/whatsapp-sessions (Personal Access Token)
      const created = await createWhatsappSession({
        name: finalSessionName,
        phone_number: phoneE164,
        webhook_url: webhookUrl,
      });

      row = await upsertWhatsappRow(orgId, {
        wasender_session_id: created.id,
        wasender_api_key: created.api_key,
        webhook_secret: created.webhook_secret || null,
      });
    }

    // Connect: POST /api/whatsapp-sessions/{id}/connect :contentReference[oaicite:14]{index=14}
    const connected = await connectSession(row.wasender_session_id);

    return res.json({
      success: true,
      sessionId: row.wasender_session_id,
      status: connected.status,
      qrCode: connected.qrCode || null, // string do QR (use lib no front para render)
      message:
        connected.status === 'NEED_SCAN'
          ? 'Escaneie o QR Code no seu WhatsApp'
          : 'Sessão já inicializada',
    });
  } catch (error) {
    console.error('Erro ao conectar WhatsApp:', error.response?.data || error.message);
    return res.status(error.statusCode || 500).json({
      error: 'Erro ao conectar WhatsApp',
      details: error.response?.data || error.message,
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

    if (!row?.wasender_api_key) {
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    // GET /api/contacts com Authorization Bearer API_KEY :contentReference[oaicite:16]{index=16}
    const api = wasenderSession(row.wasender_api_key);

    const params = {};
    if (paginated !== undefined) params.paginated = String(paginated) === 'true';
    if (page) params.page = Number(page);
    if (limit) params.limit = Number(limit);

    const { data } = await api.get('/contacts', { params });

    // A doc pode retornar data = array (não paginado) ou data.items (paginado) :contentReference[oaicite:17]{index=17}
    let contacts = Array.isArray(data?.data) ? data.data : (data?.data?.items || []);
    const total = Array.isArray(contacts) ? contacts.length : 0;

    if (search) {
      const s = String(search).toLowerCase();
      contacts = contacts.filter((c) => {
        const name = (c?.name || c?.notify || '').toLowerCase();
        const jid = String(c?.jid || '');
        return name.includes(s) || jid.includes(String(search));
      });
    }

    return res.json({
      success: true,
      contacts,
      total: contacts.length,
      raw: data,
    });
  } catch (error) {
    console.error('Erro ao buscar contatos:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Erro ao buscar contatos',
      details: error.response?.data || error.message,
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

    if (!row?.wasender_api_key) {
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    // POST /api/send-message com Authorization Bearer API_KEY :contentReference[oaicite:18]{index=18}
    const api = wasenderSession(row.wasender_api_key);

    const { data } = await api.post('/send-message', {
      to: normalizePhoneE164(number),
      text: String(message),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Erro ao enviar mensagem',
      details: error.response?.data || error.message,
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

    if (!row?.wasender_api_key) {
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    const api = wasenderSession(row.wasender_api_key);
    const results = { success: 0, failed: 0, errors: [] };

    for (const n of numbers) {
      try {
        await api.post('/send-message', {
          to: normalizePhoneE164(n),
          text: String(message),
        });
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
    console.error('Erro ao enviar mensagens em lote:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Erro ao enviar mensagens em lote',
      details: error.response?.data || error.message,
    });
  }
};

// 7) Estatísticas (ex.: total de contatos + status)
export const getStatistics = async (req, res) => {
  try {
    const { slug } = req.params;
    const orgId = await getOrgIdBySlug(slug);

    const row = await getWhatsappRow(orgId);
    if (!row?.wasender_api_key) {
      return res.json({ isConnected: false, totalContacts: 0, connectedSince: null });
    }

    const api = wasenderSession(row.wasender_api_key);

    // status: GET /api/status :contentReference[oaicite:19]{index=19}
    let status = 'unknown';
    try {
      const { data } = await api.get('/status');
      status = String(data?.status || '').toLowerCase();
    } catch {}

    // contacts: GET /api/contacts :contentReference[oaicite:20]{index=20}
    let totalContacts = 0;
    try {
      const { data } = await api.get('/contacts');
      const contacts = Array.isArray(data?.data) ? data.data : [];
      totalContacts = contacts.length;
    } catch {}

    return res.json({
      isConnected: status === 'connected',
      status,
      totalContacts,
      connectedSince: row.created_at || null,
      sessionId: row.wasender_session_id,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      details: error.response?.data || error.message,
    });
  }
};
