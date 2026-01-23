import axios from "axios";
import { supabase } from "../lib/supabase.js";

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
      abacateResponse = await axios.post(
        `${process.env.ABACATEPAY_BASE_URL}/pixQrcode/create`,
        {
          amount: grossAmount,
          description: "Appointment payment",
          expires_in: 1800
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
    } catch (apiError) {
      await supabase
        .from("transactions_organizations")
        .update({ status: "failed" })
        .eq("id", transaction.id);

      return res.status(502).json({
        error: "PIX generation failed",
        details: apiError.response?.data || apiError.message
      });
    }

    const pixData = abacateResponse.data;

    // 4️⃣ Update transaction with PIX data
    await supabase
      .from("transactions_organizations")
      .update({
        external_id: pixData.id,
        pix_qr_code: pixData.qr_code,
        pix_copy_paste: pixData.copy_paste
      })
      .eq("id", transaction.id);

    return res.status(201).json({
      transaction_id: transaction.id,
      qr_code: pixData.qr_code,
      copy_paste: pixData.copy_paste
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
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // 3️⃣ Register withdrawal transaction
    const { data: transaction, error } = await supabase
      .from("transactions_organizations")
      .insert({
        organization_id: org.id,
        type: "pix_out",
        status: "pending",
        gross_amount: withdrawAmount,
        fee_amount: 0,
        net_amount: withdrawAmount,
        pix_key,
        pix_key_type
      })
      .select()
      .single();

    if (error) throw error;

    // 4️⃣ Debit balance atomically (DB function)
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
      transaction_id: transaction.id
    });
  } catch (error) {
    console.error("WITHDRAW ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
