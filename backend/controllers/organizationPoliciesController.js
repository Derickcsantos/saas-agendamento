import { supabase } from "../lib/supabase.js";
import { validateSecretCode, encryptSecretCode, verifySecretCode } from "../utils/encryption.js";

export const getOrganizationPolicies = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ message: "Organização não encontrada" });
    }

    const { data: policy, error: policyError } = await supabase
      .from("organization_policies")
      .select("*")
      .eq("organization_id", org.id)
      .single();

    if (policyError || !policy) {
      return res.status(200).json({
        organization_id: org.id,
        max_schedule_days: 30,
        min_hours_before_booking: 0,
        sync_google_calendar: true,
        mandatory_email: true,
      });
    }

    const { secret_code, ...safePolicy } = policy || {};
    return res.status(200).json(safePolicy);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateOrganizationPolicies = async (req, res) => {
  try {
    const { slug } = req.params;
    const { max_schedule_days, allow_same_day, min_hours_before_booking, sync_google_calendar, mandatory_email, secret_code, current_secret_code } =
      req.body;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ message: "Organização não encontrada" });
    }

    const updateData = {
      organization_id: org.id,
      max_schedule_days,
      min_hours_before_booking,
      sync_google_calendar: Boolean(sync_google_calendar),
    };

    if (mandatory_email !== undefined) {
      updateData.mandatory_email = Boolean(mandatory_email);
    }

    // Se incluiu secret_code, validar e criptografar antes de salvar
    if (secret_code !== undefined && secret_code !== null) {
      if (!validateSecretCode(secret_code)) {
        return res.status(400).json({ error: "Código deve ter exatamente 4 dígitos" });
      }

      const { data: existingPolicy } = await supabase
        .from("organization_policies")
        .select("secret_code")
        .eq("organization_id", org.id)
        .maybeSingle();

      // Se já existe um código, exigir validação do código atual
      if (existingPolicy?.secret_code) {
        if (!current_secret_code || !validateSecretCode(current_secret_code)) {
          return res.status(400).json({ error: "Código atual inválido" });
        }

        const currentIsValid = verifySecretCode(current_secret_code, existingPolicy.secret_code);
        if (!currentIsValid) {
          return res.status(401).json({ error: "Código atual incorreto" });
        }
      }

      updateData.secret_code = encryptSecretCode(secret_code);
    }

    const { error: updateError } = await supabase
      .from("organization_policies")
      .upsert(updateData, { onConflict: "organization_id" });

    if (updateError) throw updateError;

    return res.status(200).json({ message: "Políticas atualizadas!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Verifica se uma organização já tem um secret_code definido
 */
export const hasSecretCode = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ message: "Organização não encontrada" });
    }

    const { data: policy, error: policyError } = await supabase
      .from("organization_policies")
      .select("secret_code")
      .eq("organization_id", org.id)
      .single();

    if (policyError) {
      return res.status(200).json({ hasSecretCode: false });
    }

    return res.status(200).json({ hasSecretCode: Boolean(policy?.secret_code) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Verifica se o secret_code fornecido está correto
 */
export const verifySecretCodeEndpoint = async (req, res) => {
  try {
    const { slug } = req.params;
    const { secret_code } = req.body;

    if (!secret_code) {
      return res.status(400).json({ error: "Código é obrigatório" });
    }

    if (!validateSecretCode(secret_code)) {
      return res.status(400).json({ error: "Código deve ter exatamente 4 dígitos" });
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ message: "Organização não encontrada" });
    }

    const { data: policy, error: policyError } = await supabase
      .from("organization_policies")
      .select("secret_code")
      .eq("organization_id", org.id)
      .single();

    if (policyError || !policy?.secret_code) {
      return res.status(400).json({ error: "Nenhum código definido para esta organização" });
    }

    const isValid = verifySecretCode(secret_code, policy.secret_code);

    if (!isValid) {
      return res.status(401).json({ error: "Código incorreto", verified: false });
    }

    return res.status(200).json({ verified: true, message: "Código verificado com sucesso" });
  } catch (error) {
    console.error("Erro ao verificar código:", error);
    return res.status(500).json({ error: error.message });
  }
};
