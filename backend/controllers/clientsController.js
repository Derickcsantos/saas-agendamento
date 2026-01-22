import { supabase } from '../lib/supabase.js';

// =====================================================
// Buscar ou criar cliente (usado ao criar agendamento)
// =====================================================
export const getOrCreateClient = async (req, res) => {
  try {
    const { client_name, client_email, client_phone, organization_id } = req.body;

    if (!client_name || !organization_id) {
      return res.status(400).json({ error: "client_name e organization_id são obrigatórios" });
    }

    // ✅ 1º: Buscar por email (se fornecido)
    if (client_email) {
      console.log("🔍 Buscando cliente por email:", client_email);
      const { data: clientByEmail, error: emailError } = await supabase
        .from("clients")
        .select("client_id")
        .eq("client_email", client_email)
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (emailError) {
        console.error("❌ Erro ao buscar por email:", emailError);
        return res.status(500).json({ error: "Erro ao buscar cliente" });
      }

      if (clientByEmail) {
        console.log("✅ Cliente encontrado por email:", clientByEmail.client_id);
        return res.json({ clientId: clientByEmail.client_id, isNew: false });
      }
    }

    // ✅ 2º: Buscar por telefone (se fornecido e email não achou)
    if (client_phone) {
      console.log("🔍 Buscando cliente por telefone:", client_phone);
      const { data: clientByPhone, error: phoneError } = await supabase
        .from("clients")
        .select("client_id")
        .eq("client_phone", client_phone)
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (phoneError) {
        console.error("❌ Erro ao buscar por telefone:", phoneError);
        return res.status(500).json({ error: "Erro ao buscar cliente" });
      }

      if (clientByPhone) {
        console.log("✅ Cliente encontrado por telefone:", clientByPhone.client_id);
        return res.json({ clientId: clientByPhone.client_id, isNew: false });
      }
    }

    // ✅ 3º: Se não encontrou, criar novo cliente
    console.log("➕ Criando novo cliente...");
    const { data: newClient, error: createError } = await supabase
      .from("clients")
      .insert([
        {
          organization_id,
          client_name,
          client_email: client_email || null,
          client_phone: client_phone || null,
        },
      ])
      .select("client_id")
      .single();

    if (createError) {
      console.error("❌ Erro ao criar cliente:", createError);
      return res.status(500).json({ error: "Erro ao criar cliente" });
    }

    console.log("✅ Cliente criado com sucesso:", newClient.client_id);
    return res.status(201).json({ clientId: newClient.client_id, isNew: true });
  } catch (error) {
    console.error("❌ Erro em getOrCreateClient:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// =====================================================
// Listar clientes de uma organização
// =====================================================
export const listClients = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug não fornecido" });
    }

    // Buscar org_id pelo slug
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Buscar clientes da organização (sem join automático, pois não há FK cache no Supabase)
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(
        "client_id, client_name, client_email, client_phone, client_observation, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false });

    if (clientsError) {
      console.error("❌ Erro ao buscar clientes:", clientsError);
      return res.status(500).json({ error: "Erro ao buscar clientes" });
    }

    // Buscar todos os agendamentos da organização, com serviço incluso
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(
        `id, client_id, appointment_date, start_time, end_time, final_price, original_price, status, service_id, services:service_id (name)`
      )
      .eq("organization_id", org.id);

    if (appointmentsError) {
      console.error("❌ Erro ao buscar agendamentos:", appointmentsError);
      return res.status(500).json({ error: "Erro ao buscar clientes" });
    }

    // Indexar agendamentos por cliente
    const appointmentsByClient = new Map();
    (appointments || []).forEach((apt) => {
      if (!apt.client_id) return;
      if (!appointmentsByClient.has(apt.client_id)) {
        appointmentsByClient.set(apt.client_id, []);
      }
      appointmentsByClient.get(apt.client_id).push(apt);
    });

    // Montar resposta processada
    const processedClients = (clients || []).map((client) => {
      const clientAppointments = appointmentsByClient.get(client.client_id) || [];

      const totalRevenue = clientAppointments.reduce(
        (sum, apt) => sum + (apt.final_price || 0),
        0
      );

      const servicesCounter = {};
      clientAppointments.forEach((apt) => {
        const serviceName = apt.services?.name || "Serviço";
        servicesCounter[serviceName] = (servicesCounter[serviceName] || 0) + 1;
      });

      const topService = Object.entries(servicesCounter).sort(([, a], [, b]) => b - a)[0];

      return {
        ...client,
        appointments: clientAppointments,
        appointmentCount: clientAppointments.length,
        totalRevenue,
        topService: topService ? topService[0] : "-",
        topServiceCount: topService ? topService[1] : 0,
        lastAppointment:
          clientAppointments.length > 0
            ? clientAppointments
                .slice()
                .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))[0]
            : null,
      };
    });

    res.json(processedClients);
  } catch (error) {
    console.error("❌ Erro em listClients:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// =====================================================
// Atualizar cliente
// =====================================================
export const updateClient = async (req, res) => {
  try {
    const { slug, clientId } = req.params;
    const { client_name, client_email, client_phone, client_observation } = req.body;

    if (!slug || !clientId) {
      return res.status(400).json({ error: "Slug e clientId são obrigatórios" });
    }

    // Buscar org_id pelo slug
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const updateData = {};
    if (client_name !== undefined) updateData.client_name = client_name;
    if (client_email !== undefined) updateData.client_email = client_email;
    if (client_phone !== undefined) updateData.client_phone = client_phone;
    if (client_observation !== undefined) updateData.client_observation = client_observation;
    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("client_id", clientId)
      .eq("organization_id", org.id)
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar cliente:", error);
      return res.status(500).json({ error: "Erro ao atualizar cliente" });
    }

    if (!updated) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    console.log("✅ Cliente atualizado:", clientId);
    res.json(updated);
  } catch (error) {
    console.error("❌ Erro em updateClient:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// =====================================================
// Deletar cliente
// =====================================================
export const deleteClient = async (req, res) => {
  try {
    const { slug, clientId } = req.params;

    if (!slug || !clientId) {
      return res.status(400).json({ error: "Slug e clientId são obrigatórios" });
    }

    // Buscar org_id pelo slug
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("client_id", clientId)
      .eq("organization_id", org.id);

    if (error) {
      console.error("❌ Erro ao deletar cliente:", error);
      return res.status(500).json({ error: "Erro ao deletar cliente" });
    }

    console.log("✅ Cliente deletado:", clientId);
    res.status(204).send();
  } catch (error) {
    console.error("❌ Erro em deleteClient:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};
