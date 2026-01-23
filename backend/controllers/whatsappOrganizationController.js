import { supabase } from '../lib/supabase.js';
import axios from 'axios';
import { redis } from '../lib/redis.js';

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

function extractPhoneFromJid(jid) {
  if (!jid) return null;
  const base = String(jid).split('@')[0] || '';
  // mantém apenas dígitos
  const digits = base.replace(/\D/g, '');
  return digits || base;
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

// ===== Controllers =====

// 1) Status
export const getWhatsappStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const orgId = await getOrgIdBySlug(slug);

    const row = await getWhatsappRow(orgId);
    if (!row?.whatsapp_api_key) {
      return res.json({ isConnected: false });
    }

    // Status é GET /api/status com Authorization Bearer SESSION_API_KEY :contentReference[oaicite:12]{index=12}
    const api = wasenderSession(row.whatsapp_api_key);
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
    const { phone_number, session_name } = req.body;
    const orgId = await getOrgIdBySlug(slug);

    console.log(`[WhatsApp] Iniciando conexão para organização ${slug} (ID: ${orgId})`);

    let row = await getWhatsappRow(orgId);
    let isNewSession = false;

    // Se não existe sessão, cria uma
    if (!row?.wasender_session_id || !row?.whatsapp_api_key) {
      if (!phone_number) {
        return res.status(400).json({
          error: 'phone_number é obrigatório para criar a primeira sessão (formato E.164).',
        });
      }

      console.log('[WhatsApp] Criando nova sessão...');
      isNewSession = true;

      const phoneE164 = normalizePhoneE164(phone_number);
      const webhookUrl = `${BACKEND_URL}/api/whatsapp-webhook/${slug}`;
      const finalSessionName = session_name || `org_${slug}`;

      // Create: POST /api/whatsapp-sessions (Personal Access Token)
      const created = await createWhatsappSession({
        name: finalSessionName,
        phone_number: phoneE164,
        webhook_url: webhookUrl,
      });

      console.log(`[WhatsApp] Sessão criada com ID: ${created.id}`);

      // Salvar no banco de dados IMEDIATAMENTE
      row = await upsertWhatsappRow(orgId, {
        wasender_session_id: created.id,
        phone_organization: phone_number,
        whatsapp_api_key: created.api_key,
        webhook_secret: created.webhook_secret || null,
      });

      console.log('[WhatsApp] Dados salvos no banco de dados');

      // Aguardar um pouco para garantir que a sessão foi criada no Wasender
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log(`[WhatsApp] Usando sessão existente: ${row.wasender_session_id}`);
    }

    // Connect: POST /api/whatsapp-sessions/{id}/connect
    console.log('[WhatsApp] Iniciando conexão da sessão...');
    const connected = await connectSession(row.wasender_session_id);

    const response = {
      success: true,
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
      data: connected, // Retornar dados completos para debug
    };

    console.log('[WhatsApp] Resposta final:', JSON.stringify(response, null, 2));

    return res.json(response);
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

    if (!row?.whatsapp_api_key) {
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    // Cache key específico para esta organização
    const cacheKey = `whatsapp_contacts:${orgId}`;
    const CACHE_TTL = 48 * 60 * 60; // 48 horas em segundos

    // Tenta buscar do cache primeiro
    let cachedContacts = null;
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          cachedContacts = typeof cached === 'string' ? JSON.parse(cached) : cached;
          console.log(`[WhatsApp] Cache hit para organização ${slug} (${cachedContacts.length} contatos)`);
          
          // Aplicar filtros em contatos cacheados
          let filteredContacts = cachedContacts;
          if (search) {
            const s = String(search).toLowerCase();
            filteredContacts = cachedContacts.filter((c) => {
              const name = (c?.name || '').toLowerCase();
              const jid = String(c?.jid || '');
              return name.includes(s) || jid.includes(String(search)) || String(c.phone_contact || '').includes(String(search));
            });
          }
          
          return res.json({
            success: true,
            contacts: filteredContacts,
            total: filteredContacts.length,
            cached: true,
          });
        }
      } catch (cacheErr) {
        console.warn('[WhatsApp] Erro ao buscar cache Redis:', cacheErr.message);
      }
    }

    // GET /api/contacts com Authorization Bearer API_KEY
    const api = wasenderSession(row.whatsapp_api_key);

    const params = {};
    if (paginated !== undefined) params.paginated = String(paginated) === 'true';
    if (page) params.page = Number(page);
    if (limit) params.limit = Number(limit);

    console.log(`[WhatsApp] Buscando contatos da API Wasender para ${slug}...`);
    const { data } = await api.get('/contacts', { params });

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

    // Busca existentes no banco para mesclar e não sobrescrever observações/nome manual
    const phones = mapped.map((c) => c.phone_contact);
    const { data: existingRows, error: existingErr } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('organization_id', orgId)
      .in('phone_contact', phones);

    if (existingErr) throw existingErr;
    const existingMap = Object.fromEntries((existingRows || []).map((r) => [r.phone_contact, r]));

    const now = new Date().toISOString();

    const upserts = mapped.map((c) => {
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

    if (upserts.length > 0) {
      const { error: upsertErr } = await supabase
        .from('whatsapp_contacts')
        .upsert(upserts, { onConflict: 'organization_id,phone_contact' });

      if (upsertErr) throw upsertErr;
    }

    // Recarrega dados salvos para devolver enriquecido
    const { data: refreshedRows, error: refreshErr } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('organization_id', orgId)
      .in('phone_contact', phones);

    if (refreshErr) throw refreshErr;
    const refreshedMap = Object.fromEntries((refreshedRows || []).map((r) => [r.phone_contact, r]));

    let contacts = mapped.map((c) => {
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

    // Salvar no cache Redis antes de filtrar
    if (redis && contacts.length > 0) {
      try {
        await redis.set(cacheKey, JSON.stringify(contacts), { ex: CACHE_TTL });
        console.log(`[WhatsApp] Cache salvo para ${slug} (${contacts.length} contatos, TTL: 48h)`);
      } catch (cacheErr) {
        console.warn('[WhatsApp] Erro ao salvar cache Redis:', cacheErr.message);
      }
    }

    // Aplicar filtro de busca após salvar cache
    if (search) {
      const s = String(search).toLowerCase();
      contacts = contacts.filter((c) => {
        const name = (c?.name || '').toLowerCase();
        const jid = String(c?.jid || '');
        return name.includes(s) || jid.includes(String(search)) || String(c.phone_contact || '').includes(String(search));
      });
    }

    return res.json({
      success: true,
      contacts,
      total: contacts.length,
      cached: false,
      raw: data,
    });
  } catch (error) {
    const errorMessage = error.message || 'Erro desconhecido';
    const errorDetails = error.response?.data || error.stack || errorMessage;
    
    console.error('[WhatsApp] Erro ao buscar contatos:', {
      message: errorMessage,
      details: errorDetails,
      apiKey: error.config?.headers?.Authorization ? '***' : 'não definido',
      url: error.config?.url,
      status: error.response?.status,
    });
    
    return res.status(500).json({
      error: 'Erro ao buscar contatos',
      details: errorMessage,
      apiError: error.response?.data,
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
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    const api = wasenderSession(row.whatsapp_api_key);
    const targetJid = decodeURIComponent(jid);
    const phone = extractPhoneFromJid(targetJid);

    const { data } = await api.get(`/contacts/${encodeURIComponent(targetJid)}`);
    const apiContact = data?.data || data || {};

    // Mescla/garante persistência no banco
    const { data: existing, error: existingErr } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('phone_contact', phone)
      .maybeSingle();

    if (existingErr) throw existingErr;

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

    const { data: upserted, error: upsertErr } = await supabase
      .from('whatsapp_contacts')
      .upsert(merged, { onConflict: 'organization_id,phone_contact' })
      .select('*')
      .single();

    if (upsertErr) throw upsertErr;

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
    console.error('Erro ao buscar contato:', error.response?.data || error.message);
    return res.status(error.statusCode || 500).json({
      error: 'Erro ao buscar contato',
      details: error.response?.data || error.message,
    });
  }
};

// 4.2) Atualizar dados locais (nome/observação/imagem) de um contato
export const updateContactInfo = async (req, res) => {
  try {
    const { slug, jid } = req.params;
    const { name, observation, image } = req.body || {};

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

    const { data: upserted, error } = await supabase
      .from('whatsapp_contacts')
      .upsert(payload, { onConflict: 'organization_id,phone_contact' })
      .select('*')
      .single();

    if (error) throw error;

    // Invalida cache de contatos ao atualizar
    if (redis) {
      try {
        const cacheKey = `whatsapp_contacts:${orgId}`;
        await redis.del(cacheKey);
        console.log(`[WhatsApp] Cache invalidado para organização ${orgId}`);
      } catch (cacheErr) {
        console.warn('[WhatsApp] Erro ao invalidar cache:', cacheErr.message);
      }
    }

    return res.json({ success: true, contact: upserted });
  } catch (error) {
    console.error('Erro ao atualizar contato:', error.response?.data || error.message);
    return res.status(error.statusCode || 500).json({
      error: 'Erro ao atualizar contato',
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

    if (!row?.whatsapp_api_key) {
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    // POST /api/send-message com Authorization Bearer API_KEY :contentReference[oaicite:18]{index=18}
    const api = wasenderSession(row.whatsapp_api_key);

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

    if (!row?.whatsapp_api_key) {
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    const api = wasenderSession(row.whatsapp_api_key);
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
    if (!row?.whatsapp_api_key) {
      return res.json({ isConnected: false, totalContacts: 0, connectedSince: null });
    }

    const api = wasenderSession(row.whatsapp_api_key);

    // status: GET /api/status :contentReference[oaicite:19]{index=19}
    let status = 'unknown';
    try {
      const { data } = await api.get('/status');
      status = String(data?.status || '').toLowerCase();
    } catch {}

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

// 8) Obter QR Code da sessão (útil quando QR expira ou precisa re-gerar)
export const getQRCode = async (req, res) => {
  try {
    const { slug } = req.params;
    const orgId = await getOrgIdBySlug(slug);

    const row = await getWhatsappRow(orgId);
    
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
