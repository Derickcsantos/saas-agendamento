import { supabase } from "../lib/supabase.js";
import { queueWebSocket } from "../server.js";

/**
 * 🔔 Broadcast para WebSocket
 * Notifica todos os clientes de uma fila sobre atualizações
 */
export function broadcastQueueUpdate(organizationId, queueId, data) {
  if (!queueWebSocket) {
    console.warn("⚠️ WebSocket manager não inicializado");
    return;
  }

  const clientsNotified = queueWebSocket.broadcastToQueue(
    organizationId,
    queueId,
    {
      type: data.type,
      ...data,
      timestamp: new Date().toISOString(),
    }
  );

  console.log(
    `📢 Broadcast - Org: ${organizationId}, Fila: ${queueId}, ` +
    `Clientes notificados: ${clientsNotified}`
  );
}

/**
 * GET /api/queues/:slug/today
 * Pega a fila do dia (não cria automaticamente)
 */
export const getTodayQueue = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug não fornecido" });
    }

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Data de hoje
    const today = new Date().toISOString().split("T")[0];

    // Buscar política para horários
    const { data: policy } = await supabase
      .from("organization_policies")
      .select("opens_at, closes_at")
      .eq("organization_id", org.id)
      .maybeSingle();

    const opensAt = policy?.opens_at || "08:00:00";
    const closesAt = policy?.closes_at || "18:00:00";

    // Buscar fila do dia
    const { data: queue, error: queueError } = await supabase
      .from("queues")
      .select(
        `
        queue_id,
        status,
        queue_date,
        opens_at,
        closes_at,
        queue_entries (
          id,
          position,
          status,
          client_id,
          service_id,
          employee_id,
          original_price,
          final_price,
          clients (client_name, client_phone),
          services (name),
          employees (name)
        )
      `
      )
      .eq("organization_id", org.id)
      .eq("queue_date", today)
      .single();

    if (queueError || !queue) {
      return res.status(404).json({ error: "Fila não encontrada" });
    }

    res.json(queue);
  } catch (error) {
    console.error("Erro em getTodayQueue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/queues/:slug/create
 * Cria fila para uma data específica
 */
export const createQueue = async (req, res) => {
  try {
    const { slug } = req.params;
    const { queue_date, opens_at, closes_at } = req.body;

    if (!slug) {
      return res.status(400).json({ error: "Slug não fornecido" });
    }

    if (!queue_date || !opens_at || !closes_at) {
      return res.status(400).json({ error: "queue_date, opens_at e closes_at são obrigatórios" });
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data: existing } = await supabase
      .from("queues")
      .select("queue_id")
      .eq("organization_id", org.id)
      .eq("queue_date", queue_date)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: "Já existe fila criada para essa data" });
    }

    const normalizeTime = (value) => {
      if (!value) return value;
      return value.length === 5 ? `${value}:00` : value;
    };

    const { data: created, error: createError } = await supabase
      .from("queues")
      .insert({
        organization_id: org.id,
        queue_date,
        status: "open",
        opens_at: normalizeTime(opens_at),
        closes_at: normalizeTime(closes_at),
      })
      .select()
      .single();

    if (createError) throw createError;

    res.status(201).json(created);
  } catch (error) {
    console.error("Erro em createQueue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/queues/:slug/entries/:queueId
 * Listar entries da fila com dados relacionados
 */
export const getQueueEntries = async (req, res) => {
  try {
    const { slug, queueId } = req.params;

    // Buscar organização
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (!org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Buscar entries ordenadas por posição
    const { data: entries, error } = await supabase
      .from("queue_entries")
      .select(
        `
        id,
        position,
        status,
        client_id,
        service_id,
        employee_id,
        original_price,
        final_price,
        coupon_code,
        created_at,
        clients (client_name, client_phone, client_email),
        services (name, price),
        employees (name, imagem_funcionario)
      `
      )
      .eq("queue_id", queueId)
      .order("position", { ascending: true });

    if (error) throw error;

    res.json(entries || []);
  } catch (error) {
    console.error("Erro em getQueueEntries:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/queues/:slug/employees/:serviceId
 * Funcionários disponíveis para um serviço (agora, considerando work_schedule)
 */
export const getAvailableEmployees = async (req, res) => {
  try {
    const { slug, serviceId } = req.params;

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Data e hora atual
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, etc
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM

    console.log(`🕐 Verificando funcionários para: ${dayOfWeek} às ${currentTime}`);

    // 1. Buscar funcionários que fazem este serviço
    const { data: employeeServices, error: esError } = await supabase
      .from("employee_services")
      .select("employee_id")
      .eq("service_id", serviceId)
      .eq("organization_id", org.id);

    if (esError) throw esError;

    const employeeIds = employeeServices.map((es) => es.employee_id);

    if (employeeIds.length === 0) {
      return res.json([]);
    }

    // 2. Buscar trabalhos agendados para hoje
    const { data: schedules, error: scheduleError } = await supabase
      .from("work_schedules")
      .select(
        `
        employee_id,
        day_of_week,
        start_time,
        end_time,
        is_available,
        employees (id, name, imagem_funcionario, is_active)
      `
      )
      .in("employee_id", employeeIds)
      .eq("day_of_week", dayOfWeek)
      .eq("is_available", true)
      .eq("organization_id", org.id);

    if (scheduleError) throw scheduleError;

    // 3. Filtrar apenas funcionários que estão em horário de trabalho agora
    const availableNow = schedules
      .filter((schedule) => {
        const startTime = schedule.start_time; // HH:MM:SS
        const endTime = schedule.end_time; // HH:MM:SS
        const start = startTime.substring(0, 5); // HH:MM
        const end = endTime.substring(0, 5); // HH:MM

        return currentTime >= start && currentTime <= end;
      })
      .filter((schedule) => schedule.employees?.is_active)
      .map((schedule) => ({
        id: schedule.employees.id,
        name: schedule.employees.name,
        imagem_funcionario: schedule.employees.imagem_funcionario,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      }));

    console.log(`✅ ${availableNow.length} funcionário(s) disponível(is)`);

    res.json(availableNow);
  } catch (error) {
    console.error("Erro em getAvailableEmployees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/queues/:slug/join
 * Cliente entra na fila
 */
export const joinQueue = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      client_name,
      client_email,
      client_phone,
      service_id,
      employee_id,
      coupon_code,
      original_price,
      final_price,
    } = req.body;

    console.log("📌 Dados para entrar na fila:", req.body);

    if (!slug) {
      return res.status(400).json({ error: "Slug não fornecido" });
    }

    if (!client_name || !service_id || !employee_id) {
      return res.status(400).json({
        error: "client_name, service_id e employee_id são obrigatórios",
      });
    }

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // ✅ Buscar ou criar cliente
    let clientId = null;

    try {
      // 1º: Buscar por email
      if (client_email) {
        const { data: clientByEmail } = await supabase
          .from("clients")
          .select("client_id")
          .eq("client_email", client_email)
          .eq("organization_id", org.id)
          .maybeSingle();

        if (clientByEmail) {
          clientId = clientByEmail.client_id;
          console.log("✅ Cliente encontrado por email:", clientId);
        }
      }

      // 2º: Buscar por telefone
      if (!clientId && client_phone) {
        const { data: clientByPhone } = await supabase
          .from("clients")
          .select("client_id")
          .eq("client_phone", client_phone)
          .eq("organization_id", org.id)
          .maybeSingle();

        if (clientByPhone) {
          clientId = clientByPhone.client_id;
          console.log("✅ Cliente encontrado por telefone:", clientId);
        }
      }

      // 3º: Criar novo cliente
      if (!clientId) {
        const { data: newClient, error: createErr } = await supabase
          .from("clients")
          .insert({
            organization_id: org.id,
            client_name,
            client_email: client_email || null,
            client_phone: client_phone || null,
          })
          .select("client_id")
          .single();

        if (!createErr && newClient) {
          clientId = newClient.client_id;
          console.log("✅ Cliente criado:", clientId);
        }
      }
    } catch (err) {
      console.error("⚠️ Erro ao processar cliente:", err);
    }

    if (!clientId) {
      return res.status(400).json({ error: "Erro ao processar cliente" });
    }

    // Buscar ou criar fila do dia
    const today = new Date().toISOString().split("T")[0];
    let { data: queue } = await supabase
      .from("queues")
      .select("queue_id, status")
      .eq("organization_id", org.id)
      .eq("queue_date", today)
      .single();

    if (!queue) {
      return res.status(404).json({ error: "Fila não criada para hoje" });
    }

    if (queue.status !== "open") {
      return res.status(403).json({ error: "Fila está fechada para novas entradas" });
    }

    // Verificar se cliente já está na fila
    const { data: existing } = await supabase
      .from("queue_entries")
      .select("id")
      .eq("queue_id", queue.queue_id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        error: "Cliente já está na fila",
      });
    }

    // Buscar última posição
    const { data: lastEntry } = await supabase
      .from("queue_entries")
      .select("position")
      .eq("queue_id", queue.queue_id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastEntry?.position || 0) + 1;

    // ✅ Criar entry na fila
    const { data: entry, error: entryError } = await supabase
      .from("queue_entries")
      .insert({
        queue_id: queue.queue_id,
        client_id: clientId,
        service_id,
        employee_id,
        position: nextPosition,
        status: "confirmed",
        coupon_code: coupon_code || null,
        original_price: original_price || null,
        final_price: final_price || null,
      })
      .select(
        `
        id,
        position,
        status,
        client_id,
        service_id,
        employee_id,
        original_price,
        final_price,
        clients (client_name, client_phone),
        services (name),
        employees (name)
      `
      )
      .single();

    if (entryError) throw entryError;

    console.log("✅ Entry criada:", entry);

    // 📡 Notificar via SSE
    broadcastQueueUpdate(org.id, queue.queue_id, {
      type: "new_entry",
      entry,
      position: nextPosition,
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error("Erro em joinQueue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/queues/:slug/:queueId/call-next
 * Profissional chama próximo cliente
 */
export const callNextInQueue = async (req, res) => {
  try {
    const { slug, queueId } = req.params;
    const { employee_id } = req.body;

    const employeeIdNum = employee_id !== undefined ? Number(employee_id) : null;
    if (employeeIdNum !== null && Number.isNaN(employeeIdNum)) {
      return res.status(400).json({ error: "employee_id inválido" });
    }

    // Buscar próximo cliente (posição menor, status confirmed)
    let nextQuery = supabase
      .from("queue_entries")
      .select(
        `
        id,
        position,
        status,
        client_id,
        service_id,
        employee_id,
        clients (client_name, client_phone),
        services (name),
        employees (name)
      `
      )
      .eq("queue_id", queueId)
      .eq("status", "confirmed")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (employeeIdNum !== null) {
      nextQuery = nextQuery.eq("employee_id", employeeIdNum);
    }

    const { data: nextEntry, error: nextError } = await nextQuery;

    if (nextError || !nextEntry) {
      return res.status(404).json({ error: "Nenhum cliente na fila" });
    }

    const calledEntry = { ...nextEntry, status: "calling" };

    // Buscar organização para broadcast
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    console.log(`📢 Cliente ${nextEntry.clients.client_name} chamado`);

    // 📡 Broadcast para todos
    broadcastQueueUpdate(org.id, queueId, {
      type: "client_called",
      entryId: nextEntry.id,
      entry: calledEntry,
      message: `Cliente ${nextEntry.clients.client_name} chamado!`,
    });

    res.json(calledEntry);
  } catch (error) {
    console.error("Erro em callNextInQueue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/queues/:slug/:queueId/:entryId
 * Remover cliente da fila
 */
export const removeFromQueue = async (req, res) => {
  try {
    const { slug, queueId, entryId } = req.params;

    // Deletar entry
    const { error: deleteError } = await supabase
      .from("queue_entries")
      .delete()
      .eq("id", entryId)
      .eq("queue_id", queueId);

    if (deleteError) throw deleteError;

    // Buscar organização para SSE
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    // 📡 Notificar via SSE
    broadcastQueueUpdate(org.id, queueId, {
      type: "entry_removed",
      entryId,
      message: "Cliente removido da fila",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Erro em removeFromQueue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/queues/:slug/:queueId/:entryId/complete
 * Marcar cliente como atendido (complete)
 */
export const completeQueueEntry = async (req, res) => {
  try {
    const { slug, queueId, entryId } = req.params;

    // Atualizar status para 'completed'
    const { data: updated, error: updateError } = await supabase
      .from("queue_entries")
      .update({ status: "completed" })
      .eq("id", entryId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Buscar organização para SSE
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    // 📡 Notificar via SSE
    broadcastQueueUpdate(org.id, queueId, {
      type: "entry_completed",
      entryId,
      message: "Cliente atendido",
    });

    res.json(updated);
  } catch (error) {
    console.error("Erro em completeQueueEntry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/queues/:slug/:queueId
 * Atualizar status ou detalhes da fila (queue_date, opens_at, closes_at, status)
 */
export const updateQueue = async (req, res) => {
  try {
    const { slug, queueId } = req.params;
    const { status, queue_date, opens_at, closes_at } = req.body;

    if (!slug || !queueId) {
      return res.status(400).json({ error: "Slug e queueId são obrigatórios" });
    }

    // Se houver status, validar
    if (status && !["open", "closed", "paused"].includes(status)) {
      return res.status(400).json({
        error: "Status deve ser: open, closed ou paused",
      });
    }

    // Normalizar horários (adicionar :00 se necessário)
    const normalizeTime = (value) => {
      if (!value) return value;
      return value.length === 5 ? `${value}:00` : value;
    };

    // Construir objeto de atualização
    const updateData = {};
    if (status) updateData.status = status;
    if (queue_date) updateData.queue_date = queue_date;
    if (opens_at) updateData.opens_at = normalizeTime(opens_at);
    if (closes_at) updateData.closes_at = normalizeTime(closes_at);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
    }

    console.log("📝 Atualizando fila:", updateData);

    const { data: updated, error: updateError } = await supabase
      .from("queues")
      .update(updateData)
      .eq("queue_id", queueId)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar:", updateError);
      return res.status(400).json({
        error: "Erro ao atualizar fila",
        details: updateError.message,
      });
    }

    console.log("✅ Fila atualizada:", updated);

    // Buscar organização para broadcast
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    // 📡 Notificar via broadcast se status mudou
    if (status) {
      broadcastQueueUpdate(org.id, queueId, {
        type: "queue_status_changed",
        status,
        message: `Fila agora está ${status}`,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error("Erro em updateQueue:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
};

/**
 * PUT /api/queues/:slug/:queueId (OLD - DEPRECATED)
 * Atualizar status da fila (open, closed, paused)
 * ⚠️ Mantido para compatibilidade, use updateQueue
 */
export const updateQueueStatus = async (req, res) => {
  try {
    const { slug, queueId } = req.params;
    const { status } = req.body;

    if (!["open", "closed", "paused"].includes(status)) {
      return res.status(400).json({
        error: "Status deve ser: open, closed ou paused",
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("queues")
      .update({ status })
      .eq("queue_id", queueId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Buscar organização para SSE
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    // 📡 Notificar via SSE
    broadcastQueueUpdate(org.id, queueId, {
      type: "queue_status_changed",
      status,
      message: `Fila agora está ${status}`,
    });

    res.json(updated);
  } catch (error) {
    console.error("Erro em updateQueueStatus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/queues/:slug/:queueId/reorder
 * Reordenar posições da fila (drag-and-drop)
 */
export const reorderQueue = async (req, res) => {
  try {
    const { slug, queueId } = req.params;
    const { entryId, newPosition } = req.body;

    const queueIdNum = Number(queueId);
    const entryIdNum = Number(entryId);
    const newPositionNum = Number(newPosition);

    console.log("🔄 Reorder request:", { entryIdNum, newPositionNum, queueIdNum });

    if (!entryId || !newPosition || Number.isNaN(queueIdNum) || Number.isNaN(entryIdNum) || Number.isNaN(newPositionNum)) {
      return res.status(400).json({ error: "entryId e newPosition obrigatórios" });
    }

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      console.log("❌ Organização não encontrada:", orgError);
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Buscar entrada atual com status
    const { data: currentEntry, error: entryError } = await supabase
      .from("queue_entries")
      .select("id, position, status")
      .eq("id", entryIdNum)
      .eq("queue_id", queueIdNum)
      .single();

    if (entryError || !currentEntry) {
      console.log("❌ Entrada não encontrada:", entryError);
      return res.status(404).json({ error: "Entrada não encontrada na fila" });
    }

    console.log("✅ Entrada encontrada:", currentEntry);
    const oldPosition = currentEntry.position;

    // Buscar TODAS as entradas da fila com status "confirmed" (não incluir "calling" pois não é valor válido no ENUM)
    const { data: allEntries, error: allError } = await supabase
      .from("queue_entries")
      .select("id, position, status")
      .eq("queue_id", queueIdNum)
      .eq("status", "confirmed")
      .order("position");

    if (allError || !allEntries) {
      console.log("❌ Erro ao buscar entradas:", allError);
      return res.status(500).json({ error: "Erro ao buscar entradas", details: allError?.message });
    }

    console.log("📋 Entradas ativas antes:", allEntries);

    // Reordernar localmente: remover e inserir em nova posição
    const moveEntry = allEntries.find(e => e.id === entryIdNum);
    if (!moveEntry) {
      return res.status(404).json({ error: "Entrada não está na fila ativa" });
    }

    // Remover entrada da lista
    const filtered = allEntries.filter(e => e.id !== entryIdNum);
    // Inserir em nova posição (newPosition é 1-based, array é 0-based)
    filtered.splice(newPositionNum - 1, 0, moveEntry);

    // Agora temos a nova ordem, vamos recalcular posições
    const updates = filtered.map((entry, idx) => ({
      id: entry.id,
      newPos: idx + 1,
    }));

    console.log("📊 Novos positions:", updates);

    // Executar updates em paralelo
    const updatePromises = updates.map(({ id, newPos }) =>
      supabase
        .from("queue_entries")
        .update({ position: newPos })
        .eq("id", id)
        .eq("queue_id", queueIdNum)
    );

    const results = await Promise.all(updatePromises);
    
    // Verificar erros
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.log("❌ Erros nos updates:", errors);
      return res.status(400).json({ error: "Erro ao atualizar posições", details: errors[0].error?.message });
    }

    console.log("✅ Todos os updates concluídos");

    // Buscar fila atualizada completa (apenas "confirmed")
    const { data: updatedEntries, error: fetchError } = await supabase
      .from("queue_entries")
      .select(`
        id,
        position,
        status,
        clients (client_id, client_name, client_phone),
        services (id, name, price, duration),
        employees (id, name)
      `)
      .eq("queue_id", queueIdNum)
      .eq("status", "confirmed")
      .order("position");

    if (fetchError) {
      console.log("❌ Erro ao buscar fila atualizada:", fetchError);
      return res.status(500).json({ error: "Erro ao buscar fila atualizada" });
    }

    console.log("📨 Enviando broadcast com", updatedEntries.length, "entradas");

    // Broadcast
    broadcastQueueUpdate(org.id, queueIdNum, {
      type: "queue_reordered",
      entries: updatedEntries,
    });

    res.json({ message: "Fila reordenada com sucesso", entries: updatedEntries });
  } catch (error) {
    console.error("❌ Erro ao reordenar fila:", error);
    res.status(500).json({ error: "Erro ao reordenar fila", message: error.message });
  }
};

/**
 * PATCH /api/queues/:slug/:queueId/:entryId/complete
 * Marcar entrada como completada
 */
export const completeEntry = async (req, res) => {
  try {
    const { slug, queueId, entryId } = req.params;

    if (!entryId || !queueId) {
      return res.status(400).json({ error: "entryId e queueId são obrigatórios" });
    }

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Atualizar status com select
    const { data: updated, error: updateError } = await supabase
      .from("queue_entries")
      .update({ status: "completed" })
      .eq("id", entryId)
      .select(`
        id,
        position,
        status,
        client_id,
        service_id,
        employee_id,
        clients (client_name, client_phone),
        services (name),
        employees (name)
      `)
      .single();

    if (updateError) {
      console.error("❌ Erro ao completar:", updateError);
      return res.status(400).json({ error: "Erro ao completar entrada" });
    }

    console.log(`✅ Entrada ${entryId} marcada como completa`);

    // Broadcast
    broadcastQueueUpdate(org.id, queueId, {
      type: "entry_completed",
      entryId: parseInt(entryId),
      entry: updated,
    });

    res.json({ message: "Entrada completada com sucesso", entry: updated });
  } catch (error) {
    console.error("Erro ao completar entrada:", error);
    res.status(500).json({ error: "Erro ao completar entrada" });
  }
};

/**
 * PATCH /api/queues/:slug/:queueId/:entryId/cancel
 * Cancelar entrada
 */
export const cancelEntry = async (req, res) => {
  try {
    const { slug, queueId, entryId } = req.params;

    const queueIdNum = Number(queueId);
    const entryIdNum = Number(entryId);

    if (!entryId || !queueId || Number.isNaN(queueIdNum) || Number.isNaN(entryIdNum)) {
      return res.status(400).json({ error: "entryId e queueId são obrigatórios" });
    }

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Buscar entry para validar
    const { data: entry, error: fetchError } = await supabase
      .from("queue_entries")
      .select("id, position, queue_id, status")
      .eq("id", entryIdNum)
      .eq("queue_id", queueIdNum)
      .single();

    if (fetchError || !entry) {
      return res.status(404).json({ error: "Entrada não encontrada" });
    }

    // Atualizar status para cancelled com select
    const { data: updated, error: updateError } = await supabase
      .from("queue_entries")
      .update({ status: "canceled" })
      .eq("id", entryIdNum)
      .eq("queue_id", queueIdNum)
      .select(`
        id,
        position,
        status,
        client_id,
        service_id,
        employee_id,
        clients (client_name, client_phone),
        services (name),
        employees (name)
      `)
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar:", updateError);
      return res.status(400).json({ error: updateError.message || "Erro ao cancelar entrada" });
    }

    console.log(`✅ Entrada ${entryId} cancelada`);

    // Broadcast para todos
    broadcastQueueUpdate(org.id, queueIdNum, {
      type: "entry_cancelled",
      entryId: entryIdNum,
      entry: updated,
    });

    res.json({ message: "Entrada cancelada com sucesso", entry: updated });
  } catch (error) {
    console.error("Erro ao cancelar entrada:", error);
    res.status(500).json({ error: "Erro ao cancelar entrada" });
  }
};

/**
 * GET /api/queues/:slug/:queueId/stats
 * Estatísticas da fila do dia
 */
export const getQueueStats = async (req, res) => {
  try {
    const { slug, queueId } = req.params;

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Buscar todas as entradas da fila
    const { data: entries, error: entriesError } = await supabase
      .from("queue_entries")
      .select(`
        id,
        status,
        created_at,
        services (duration, price)
      `)
      .eq("queue_id", queueId);

    if (entriesError) {
      return res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }

    // Calcular estatísticas
    const total = entries.length;
    const completed = entries.filter(e => e.status === "completed").length;
    const cancelled = entries.filter(e => e.status === "cancelled").length;
    const waiting = entries.filter(e => e.status === "confirmed").length;
    const calling = entries.filter(e => e.status === "calling").length;
    
    const totalRevenue = entries
      .filter(e => e.status === "completed")
      .reduce((sum, e) => sum + (e.services?.price || 0), 0);
    
    const totalMinutes = entries
      .filter(e => e.status === "completed")
      .reduce((sum, e) => sum + (e.services?.duration || 0), 0);

    res.json({
      total,
      completed,
      cancelled,
      waiting,
      calling,
      totalRevenue,
      totalMinutes,
      averageTimePerClient: completed > 0 ? Math.round(totalMinutes / completed) : 0,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
};

