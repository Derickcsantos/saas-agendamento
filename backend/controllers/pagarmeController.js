import axios from "axios";
import dotenv from "dotenv";
import { supabase } from "../lib/supabase.js";
import { NfeController } from "./nfeController.js";

dotenv.config();

const pagarme = axios.create({
  baseURL: process.env.PAGARME_API_URL,
  headers: {
    Authorization: `Basic ${Buffer.from(process.env.PAGARME_API_KEY + ":").toString("base64")}`,
    "Content-Type": "application/json"
  }
});

export const PagarmeController = {
  // =========================================
  // Criar uma cobrança (cartão ou boleto)
  // =========================================
  async createCharge(req, res) {
    try {
      const payload = req.body;

      const response = await pagarme.post("/charges", payload);

      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao criar cobrança:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Consultar cobrança por ID
  // =========================================
  async getCharge(req, res) {
    try {
      const { charge_id } = req.params;

      const response = await pagarme.get(`/charges/${charge_id}`);

      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao buscar cobrança:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Capturar cobrança (somente cartão)
  // =========================================
  async captureCharge(req, res) {
    try {
      const { charge_id } = req.params;

      const response = await pagarme.post(`/charges/${charge_id}/capture`, req.body);

      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao capturar:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Cancelar cobrança
  // =========================================
  async cancelCharge(req, res) {
    try {
      const { charge_id } = req.params;

      const response = await pagarme.post(`/charges/${charge_id}/cancel`, req.body);

      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao cancelar:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Criar cliente
  // =========================================
  async createCustomer(req, res) {
    try {
      const response = await pagarme.post("/customers", req.body);

      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao criar cliente:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Consultar cliente por ID
  // =========================================
  async getCustomer(req, res) {
    try {
      const { customer_id } = req.params;

      const response = await pagarme.get(`/customers/${customer_id}`);

      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao buscar cliente:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Criar split de pagamento
  // =========================================
  async createSplit(req, res) {
    try {
      const response = await pagarme.post(`/orders`, req.body);

      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao criar split:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

    // =========================================
  // Criar um PLANO de recorrência
  // =========================================
  async createPlan(req, res) {
    try {
      const response = await pagarme.post("/plans", req.body);
      const plan = response.data;

      const { error } = await supabase
        .from("plans")
        .insert({
          pagarme_plan_id: plan.id,
          name_plan: plan.name,
          description_plan: plan.description,
          price_plan: plan.items?.[0]?.pricing_scheme?.price / 100 || 0,
          interval_plan: plan.interval,
          billing_type: plan.billing_type,
          is_active: plan.status === "active",
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      return res.status(201).json(plan);
    } catch (error) {
      console.error("Erro ao criar plano:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Listar todos os planos
  // =========================================
  async listPlans(req, res) {
    try {
      const response = await pagarme.get("/plans");
      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao listar planos:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

    // =========================================
  // Editar (atualizar) um plano existente
  // =========================================
  async updatePlan(req, res) {
    try {
      const { plan_id } = req.params;

      const response = await pagarme.put(`/plans/${plan_id}`, req.body);
      const plan = response.data;

      // sincronizar banco
      const { error } = await supabase
        .from("plans")
        .update({
          name_plan: plan.name,
          description_plan: plan.description,
          price_plan: plan.items?.[0]?.pricing_scheme?.price / 100 || 0,
          interval_plan: plan.interval,
          billing_type: plan.billing_type,
          is_active: plan.status === "active",
          updated_at: new Date().toISOString(),
        })
        .eq("pagarme_plan_id", plan_id);

      if (error) throw error;

      return res.status(200).json(plan);
    } catch (error) {
      console.error("Erro ao atualizar plano:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  async deletePlan(req, res) {
    try {
      const { plan_id } = req.params;

      const response = await pagarme.delete(`/plans/${plan_id}`);

      const { error } = await supabase
      .from("plans")
      .delete()
      .eq("pagarme_plan_id", plan_id);

      if (error) throw error;

      return res.status(200).json({ message: "Plano excluído com sucesso", data: response.data });
    } catch (error) {
      console.error("Erro ao excluir plano:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  async listSubscriptions(req, res) {
    try {
      const response = await pagarme.get("/subscriptions");

      // A API retorna: { data: [...], paging: {... } }
      const subscriptions = response.data?.data || [];

      return res.status(200).json(subscriptions);
    } catch (error) {
      console.error("Erro ao listar assinaturas:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Criar uma ASSINATURA (recorrência)
  // =========================================
  async createSubscription(req, res) {
    try {
      const payload = req.body;

      const response = await pagarme.post("/subscriptions", payload);
      const sub = response.data;

      // ------------------------------------------------------
      // 1️⃣ Buscar dados reais da organização no supabase
      // ------------------------------------------------------
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", payload.organization_id)
        .single();

      if (orgError || !org) {
        console.warn("Organização não encontrada:", payload.organization_id);
      }

      // // ------------------------------------------------------
      // // 2️⃣ Emitir Nota Fiscal AUTOMATICAMENTE
      // // ------------------------------------------------------
      // const chargeAmount = sub.plan?.amount;

      // const nota = await NfeController.emitirNota({
      //   organization: org,
      //   customer: payload.customer,
      //   amount: chargeAmount,
      //   pagarme_charge_id: sub.latest_invoice?.charge_id,
      //   subscription_id: sub.id,
      // });

      // ------------------------------------------------------
      // 3️⃣ Salvar assinatura no banco
      // ------------------------------------------------------
      const { error } = await supabase.from("subscriptions").insert({
        organization_id: payload.organization_id,
        plan_id: sub.plan.id,
        pagarme_subscription_id: sub.id,
        status: sub.status,
        billing_type: sub.plan.billing_type,
        current_period_start: sub.current_period.start,
        current_period_end: sub.current_period.end,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
        latest_invoice_id: sub.latest_invoice?.id,
        latest_invoice_amount: chargeAmount / 100,
        nfe_document_id: nota?.id || null,
      });

      if (error) throw error;

      return res.status(201).json({ subscription: sub, nota });
    } catch (error) {
      console.error("Erro ao criar assinatura:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Atualizar assinatura existente
  // =========================================
  async updateSubscription(req, res) {
    try {
      const { subscription_id } = req.params;

      const response = await pagarme.patch(`/subscriptions/${subscription_id}`, req.body);
      const sub = response.data;

      console.log("🔄 Assinatura atualizada:", sub);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: sub.status,
          plan_id: sub.plan?.id,
          billing_type: sub.plan?.billing_type,
          current_period_start: sub.current_period?.start,
          current_period_end: sub.current_period?.end,
          trial_end: sub.trial?.end,
          updated_at: sub.updated_at,
        })
        .eq("pagarme_subscription_id", subscription_id);

      if (error) throw error;

      return res.status(200).json(sub);
    } catch (error) {
      console.error("Erro ao atualizar assinatura:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

    // =========================================
  // Cancelar assinatura
  // =========================================
  async cancelSubscription(req, res) {
    try {
      const { subscription_id } = req.params;

      const response = await pagarme.post(`/subscriptions/${subscription_id}/cancel`);
      const sub = response.data;

      console.log("❌ Assinatura cancelada:", sub);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: sub.status,
          current_period_start: sub.current_period?.start,
          current_period_end: sub.current_period?.end,
          updated_at: sub.updated_at,
        })
        .eq("pagarme_subscription_id", subscription_id);

      if (error) throw error;

      return res.status(200).json(sub);
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Solicitar reembolso de uma cobrança
  // =========================================
  async refundCharge(req, res) {
    try {
      const { charge_id } = req.params;

      const response = await pagarme.post(`/charges/${charge_id}/refund`, req.body);

      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao reembolsar:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },

  // =========================================
  // Webhook (receber eventos)
  // =========================================
  async webhook(req, res) {
    try {
      console.log("Webhook recebido:", req.body);

      // Você pode salvar no banco ou processar internamente

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Erro no webhook:", error);
      return res.status(500).json({ message: "Erro interno" });
    }
  },

  // =========================================
  // Webhooks de recorrência
  // =========================================
  async webhookRecurrence(req, res) {
    try {
      const event = req.body.event;
      const data = req.body.data;

      console.log("Webhook de recorrência recebido:", event);

      switch (event) {
        case "invoice.paid":
          console.log("📬 Invoice paga:", data.id);
          break;

        case "invoice.canceled":
          console.log("⚠️ Invoice cancelada:", data.id);
          break;

        case "subscription.canceled":
          console.log("❌ Assinatura cancelada:", data.id);
          break;

        case "subscription.activated":
          console.log("✅ Assinatura ativada:", data.id);
          break;

        case "subscription.suspended":
          console.log("⛔ Assinatura suspensa:", data.id);
          break;

        case "transaction.refunded":
          console.log("💸 Cobrança reembolsada:", data.id);
          break;

        default:
          console.log("Evento não tratado:", event);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Erro no webhook:", error);
      return res.status(500).json({ message: "Erro interno" });
    }
  }
};



