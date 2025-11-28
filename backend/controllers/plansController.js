import { supabase } from "../lib/supabase.js";

// =========================
// LISTAR TODOS OS PLANOS
// =========================
export const getPlans = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Erro ao buscar planos:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// PEGAR PLANOS PELO SLUG DA ORGANIZAÇÃO
// =========================
export const getPlansByOrganization = async (req, res) => {
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
      .from("plans")
      .select("*")
      .eq("organization_id", org.id);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Erro ao buscar planos por organização:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// PEGAR PLANO POR ID
// =========================
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("plan_id", id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Plano não encontrado." });

    res.json(data);
  } catch (err) {
    console.error("Erro ao buscar plano:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// CRIAR PLANO
// =========================
export const createPlan = async (req, res) => {
  try {
    const { name_plan, price_plan, description_plan, is_active = true } =
      req.body;

    if (!name_plan || !price_plan)
      return res
        .status(400)
        .json({ error: "Campos obrigatórios ausentes." });

    const { data, error } = await supabase
      .from("plans")
      .insert([
        {
          name_plan,
          price_plan,
          description_plan,
          is_active,
          created_at: new Date().toISOString(),
        },
      ])
      .select("*")
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("Erro ao criar plano:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// ATUALIZAR PLANO
// =========================
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name_plan, price_plan, description_plan, is_active } = req.body;

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (name_plan) updateData.name_plan = name_plan;
    if (price_plan) updateData.price_plan = price_plan;
    if (description_plan) updateData.description_plan = description_plan;
    if (typeof is_active === "boolean") updateData.is_active = is_active;

    const { data, error } = await supabase
      .from("plans")
      .update(updateData)
      .eq("plan_id", id)
      .select("*")
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Erro ao atualizar plano:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// =========================
// DELETAR PLANO
// =========================
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("plan_id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao deletar plano:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};
