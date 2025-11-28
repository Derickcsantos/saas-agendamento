import { supabase } from "../lib/supabase.js";

// =========================
// LISTAR TODAS AS ASSINATURAS
// =========================
export const getSubscriptions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Erro ao buscar assinaturas:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// LISTAR ASSINATURAS PELO SLUG DA ORGANIZAÇÃO
// =========================
export const getSubscriptionsByOrganization = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org)
      return res.status(404).json({ error: "Organização não encontrada." });

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", org.id);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Erro ao buscar assinaturas por organização:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// PEGAR ASSINATURA POR ID
// =========================
export const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("subscription_id", id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Assinatura não encontrada." });

    res.json(data);
  } catch (err) {
    console.error("Erro ao buscar assinatura:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// CRIAR ASSINATURA
// =========================
export const createSubscription = async (req, res) => {
  try {
    const {
      organization_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      trial_end,
      pagarme_subscription_id,
    } = req.body;

    if (!organization_id || !plan_id || !status)
      return res.status(400).json({
        error: "Campos obrigatórios ausentes.",
      });

    const { data, error } = await supabase
      .from("subscriptions")
      .insert([
        {
          organization_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          trial_end,
          pagarme_subscription_id,
          created_at: new Date().toISOString(),
        },
      ])
      .select("*")
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("Erro ao criar assinatura:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// ATUALIZAR ASSINATURA
// =========================
export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      plan_id,
      status,
      current_period_start,
      current_period_end,
      trial_end,
      pagarme_subscription_id,
    } = req.body;

    const updateData = { updated_at: new Date().toISOString() };

    if (plan_id) updateData.plan_id = plan_id;
    if (status) updateData.status = status;
    if (current_period_start)
      updateData.current_period_start = current_period_start;
    if (current_period_end)
      updateData.current_period_end = current_period_end;
    if (trial_end) updateData.trial_end = trial_end;
    if (pagarme_subscription_id)
      updateData.pagarme_subscription_id = pagarme_subscription_id;

    const { data, error } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("subscription_id", id)
      .select("*")
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Erro ao atualizar assinatura:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// DELETAR ASSINATURA
// =========================
export const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("subscription_id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao deletar assinatura:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};
