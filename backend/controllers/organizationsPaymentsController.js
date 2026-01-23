import axios from "axios";
import { supabase } from "../lib/supabase.js";

// Retorna histórico de entradas (agendamentos confirmados e transações bem-sucedidas)
export async function getIncomeHistory(req, res) {
  const { slug } = req.params;
  const limit = Math.min(parseInt(req.query.limit || "20"), 100); // máximo 100

  try {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // 1️⃣ Buscar transações confirmadas (PIX recebido)
    const { data: transactions, error: txErr } = await supabase
      .from("transactions_organizations")
      .select("id, net_amount, type, status, confirmed_at, appointment_id, created_at")
      .eq("organization_id", org.id)
      .eq("status", "confirmed")
      .eq("type", "pix_in")
      .order("confirmed_at", { ascending: false })
      .limit(limit);

    if (txErr) throw txErr;

    // 2️⃣ Buscar agendamentos confirmados com detalhes
    const { data: appointments, error: apptErr } = await supabase
      .from("appointments")
      .select(`
        id, 
        final_price, 
        status, 
        created_at, 
        appointment_date,
        client_name,
        services (name)
      `)
      .eq("organization_id", org.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (apptErr) throw apptErr;

    // 3️⃣ Mesclar e ordenar por data
    const history = [
      ...transactions.map(t => ({
        type: "transacao",
        amount: t.net_amount,
        created_at: t.confirmed_at || t.created_at,
        description: "Transferência PIX recebida",
        status: "confirmed",
      })),
      ...appointments.map(a => ({
        type: "appointment",
        amount: Math.round((a.final_price || 0) * 100),
        appointment_date: a.appointment_date,
        created_at: a.created_at,
        client_name: a.client_name,
        service_name: a.services?.[0]?.name || "Serviço",
        status: "completed",
      })),
    ]
      .sort((a, b) => new Date(b.created_at || b.appointment_date) - new Date(a.created_at || a.appointment_date))
      .slice(0, limit);

    return res.status(200).json({
      history,
      total_items: history.length,
    });
  } catch (error) {
    console.error("GET INCOME HISTORY ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Retorna saldo disponível em centavos para a organização
export async function getAvailableBalance(req, res) {
  const { slug } = req.params;

  try {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const { data: balance, error: balError } = await supabase
      .from("organization_withdrawals_balance")
      .select("available_balance")
      .eq("organization_id", org.id)
      .maybeSingle();

    if (balError) throw balError;

    return res.status(200).json({
      available_balance: balance?.available_balance ?? 0,
      available_balance_brl: ((balance?.available_balance ?? 0) / 100),
    });
  } catch (error) {
    console.error("GET BALANCE ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Ensures the organization balance row exists
 */
async function ensureOrganizationBalance(organizationId) {
  const { data } = await supabase
    .from("organization_withdrawals_balance")
    .select("id")
    .eq("organization_id", organizationId)
    .single();

  if (!data) {
    await supabase
      .from("organization_withdrawals_balance")
      .insert({ organization_id: organizationId });
  }
}

/**
 * POST /api/organizations/:slug/payments/pix
 * Generates PIX QR Code (AbacatePay)
 */
export async function createPixPayment(req, res) {
  const { slug } = req.params;
  const { amount, appointment_id } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    // 1️⃣ Get organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    await ensureOrganizationBalance(org.id);

    // cents only
    const grossAmount = Math.round(amount * 100);
    const feeAmount = 100; // R$1 platform fee
    const netAmount = grossAmount - feeAmount;

    if (netAmount <= 0) {
      return res.status(400).json({ error: "Net amount invalid" });
    }

    // 2️⃣ Create pending transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions_organizations")
      .insert({
        organization_id: org.id,
        appointment_id,
        type: "pix_in",
        status: "pending",
        gross_amount: grossAmount,
        fee_amount: feeAmount,
        net_amount: netAmount
      })
      .select()
      .single();

    if (txError) throw txError;

    // 3️⃣ Call AbacatePay
    let abacateResponse;

    try {
      console.log("🔄 Chamando AbacatePay API:", {
        url: `${process.env.ABACATEPAY_BASE_URL}/v1/pixQrCode/create`,
        amount: grossAmount
      });

      abacateResponse = await axios.post(
        `${process.env.ABACATEPAY_BASE_URL}/v1/pixQrCode/create`,
        {
          amount: grossAmount,
          description: "Appointment payment",
          expiresIn: 300  // ✅ 5 minutos
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      console.log("✅ Resposta AbacatePay recebida");
    } catch (apiError) {
      await supabase
        .from("transactions_organizations")
        .update({ status: "failed" })
        .eq("id", transaction.id);

      console.error("❌ Erro ao chamar AbacatePay:", apiError.response?.data || apiError.message);

      return res.status(502).json({
        error: "PIX generation failed",
        details: apiError.response?.data || apiError.message
      });
    }

    // ✅ Corrigido: AbacatePay retorna 'data.brCode' e 'data.brCodeBase64'
    const pixData = abacateResponse.data?.data || abacateResponse.data;

    console.log("📦 PIX gerado:", {
      id: pixData.id,
      brCode: pixData.brCode ? "✅" : "❌",
      brCodeBase64: pixData.brCodeBase64 ? "✅" : "❌"
    });

    // 4️⃣ Update transaction with PIX data
    await supabase
      .from("transactions_organizations")
      .update({
        external_id: pixData.id,
        pix_qr_code: pixData.brCodeBase64,  // ✅ Corrigido
        pix_copy_paste: pixData.brCode       // ✅ Corrigido
      })
      .eq("id", transaction.id);

    return res.status(201).json({
      transaction_id: transaction.id,
      qr_code: pixData.brCodeBase64,  // ✅ Corrigido
      copy_paste: pixData.brCode       // ✅ Corrigido
    });
  } catch (error) {
    console.error("PIX PAYMENT ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function abacatePayPixWebhook(req, res) {
  const payload = req.body;

  // Segurança: validar segredo do webhook
  const incomingSecret = req.headers["x-abacatepay-secret"] || req.headers["x-webhook-secret"];
  if (process.env.ABACATEPAY_WEBHOOK_SECRET) {
    if (!incomingSecret || incomingSecret !== process.env.ABACATEPAY_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Invalid webhook secret" });
    }
  }

  try {
    const {
      id: external_id,
      status,
      amount
    } = payload;

    // Segurança básica
    if (!external_id || status !== "paid") {
      return res.status(200).json({ received: true });
    }

    // 1️⃣ Buscar transação pelo external_id
    const { data: transaction, error: txError } = await supabase
      .from("transactions_organizations")
      .select("id, status, organization_id, net_amount, appointment_id")
      .eq("external_id", external_id)
      .single();

    if (txError || !transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // 2️⃣ Idempotência: se já confirmou, ignora
    if (transaction.status === "confirmed") {
      return res.status(200).json({ received: true });
    }

    // 3️⃣ Atualizar transação
    const { error: updateError } = await supabase
      .from("transactions_organizations")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString()
      })
      .eq("id", transaction.id);

    if (updateError) {
      throw updateError;
    }

    // 4️⃣ Creditar saldo da organização (fonte da verdade = DB)
    const { error: creditError } = await supabase.rpc(
      "credit_organization_balance",
      {
        p_org_id: transaction.organization_id,
        p_amount: transaction.net_amount,
        p_transaction_id: transaction.id
      }
    );

    if (creditError) {
      throw new Error("Failed to credit organization balance");
    }

    // 5️⃣ Atualizar status do agendamento, se existir
    if (transaction.appointment_id) {
      await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", transaction.appointment_id);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("ABACATEPAY WEBHOOK ERROR:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}

/**
 * POST /api/organizations/:slug/payments/withdraw
 * Requests a PIX withdrawal
 */
export async function requestWithdrawal(req, res) {
  const { slug } = req.params;
  const { amount, pix_key, pix_key_type } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    // 1️⃣ Get organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    await ensureOrganizationBalance(org.id);

    const withdrawAmount = Math.round(amount * 100);

    // 2️⃣ Check available balance (DB is source of truth)
    const { data: balance } = await supabase
      .from("organization_withdrawals_balance")
      .select("available_balance")
      .eq("organization_id", org.id)
      .single();

    if (!balance || balance.available_balance < withdrawAmount) {
      return res.status(400).json({ 
        error: "Insufficient balance",
        available: balance?.available_balance ?? 0,
        requested: withdrawAmount
      });
    }

    // 2.1️⃣ Buscar chave PIX configurada nas policies se não enviada
    let effectivePixKey = pix_key;
    let effectivePixKeyType = pix_key_type;

    if (!effectivePixKey || !effectivePixKeyType) {
      const { data: policy } = await supabase
        .from("organization_policies")
        .select("pix_key")
        .eq("organization_id", org.id)
        .maybeSingle();

      if (!effectivePixKey && policy?.pix_key) {
        effectivePixKey = policy.pix_key;
      }

      if (!effectivePixKeyType) {
        effectivePixKeyType = "random"; // fallback seguro
      }
    }

    if (!effectivePixKey) {
      return res.status(400).json({ error: "PIX key not configured" });
    }

    // 3️⃣ Aplicar taxa de transação (padrão 1 real = 100 centavos)
    const transactionRate = 100; // R$1 em centavos
    const netAmount = Math.max(0, withdrawAmount - transactionRate);

    if (netAmount <= 0) {
      return res.status(400).json({ error: "Amount too small after fees" });
    }

    // 4️⃣ Register withdrawal transaction
    const { data: transaction, error } = await supabase
      .from("transactions_organizations")
      .insert({
        organization_id: org.id,
        type: "pix_out",
        status: "pending",
        gross_amount: withdrawAmount,
        fee_amount: transactionRate,
        net_amount: netAmount,
        transaction_rate: 1.00, // em reais
        pix_key: effectivePixKey,
        pix_key_type: effectivePixKeyType
      })
      .select()
      .single();

    if (error) throw error;

    // 5️⃣ Debit balance atomically (DB function)
    const { error: debitError } = await supabase.rpc(
      "debit_organization_balance",
      {
        p_org_id: org.id,
        p_amount: withdrawAmount,
        p_transaction_id: transaction.id
      }
    );

    if (debitError) {
      throw new Error("Failed to debit organization balance");
    }

    return res.status(201).json({
      message: "Withdrawal request registered",
      transaction_id: transaction.id,
      gross_amount: withdrawAmount / 100,
      fee_amount: transactionRate / 100,
      net_amount: netAmount / 100
    });
  } catch (error) {
    console.error("WITHDRAW ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
