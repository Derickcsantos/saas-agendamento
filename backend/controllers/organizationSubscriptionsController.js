import Stripe from "stripe";
import { supabase } from "../lib/supabase.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

// ==================== HELPERS ====================
const asInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const safeJson = (res, status, payload) => res.status(status).json(payload);

// ==================== CONTROLLERS ====================
export const OrganizationSubscriptionsController = {
  // Listar planos disponíveis do Stripe
  listPlans: async (req, res) => {
    try {
      const prices = await stripe.prices.list({
        active: true,
        expand: ["data.product"],
        limit: 100,
      });

      const plansData = prices.data
        .filter(p => p.recurring) // Apenas preços recorrentes
        .map(p => ({
          id: p.id,
          productId: p.product.id,
          productName: p.product.name,
          productDescription: p.product.description,
          amount: p.unit_amount,
          currency: p.currency,
          interval: p.recurring.interval,
          intervalCount: p.recurring.interval_count,
          trialDays: p.recurring.trial_period_days,
          nickname: p.nickname,
          metadata: p.metadata,
        }));

      return safeJson(res, 200, { data: plansData });
    } catch (error) {
      console.error("Erro ao listar planos:", error);
      return safeJson(res, 500, { error: error.message });
    }
  },

  // Obter assinatura ativa da organização
  getActiveSubscription: async (req, res) => {
    try {
      const { organizationId } = req.params;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .in("status", ["active", "trialing", "paused"])
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        return safeJson(res, 200, { data: null });
      }

      // Buscar detalhes do Stripe
      let stripeData = null;
      if (data.stripe_subscription_id) {
        stripeData = await stripe.subscriptions.retrieve(data.stripe_subscription_id, {
          expand: ["customer", "items.data.price.product"],
        });
      }

      return safeJson(res, 200, {
        data: {
          ...data,
          stripe: stripeData,
        },
      });
    } catch (error) {
      console.error("Erro ao obter assinatura:", error);
      return safeJson(res, 500, { error: error.message });
    }
  },

  // Criar nova assinatura para organização
  createSubscription: async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { priceId, customerEmail, paymentMethodId, organizationData } = req.body;

      if (!priceId || !customerEmail) {
        return safeJson(res, 400, { error: "priceId e customerEmail são obrigatórios" });
      }

      // Buscar ou criar customer no Stripe
      let customerId;
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: customerEmail,
          metadata: {
            organization_id: organizationId,
            organization_name: organizationData?.name || "",
          },
        });
        customerId = customer.id;
      }

      // Se um paymentMethodId foi fornecido, anexá-lo ao customer
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        // Definir como método de pagamento padrão
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Criar assinatura no Stripe
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: paymentMethodId ? "default_off_session" : "default_incomplete",
        off_session: !!paymentMethodId,
        payment_settings: {
          save_default_payment_method: "on_subscription",
          payment_method_types: ["card"],
        },
        expand: ["latest_invoice.payment_intent", "items.data.price.product"],
        metadata: {
          organization_id: organizationId,
        },
      });

      // Salvar no banco de dados
      const { error: dbError } = await supabase.from("subscriptions").insert({
        organization_id: organizationId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        plan_id: priceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("Erro ao salvar assinatura no banco:", dbError);
      }

      return safeJson(res, 201, {
        data: subscription,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      });
    } catch (error) {
      console.error("Erro ao criar assinatura:", error);
      return safeJson(res, 500, { error: error.message });
    }
  },

  // Confirmar pagamento da assinatura
  confirmSubscriptionPayment: async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { clientSecret, paymentIntentId } = req.body;

      if (!clientSecret && !paymentIntentId) {
        return safeJson(res, 400, { error: "clientSecret ou paymentIntentId é obrigatório" });
      }

      // Extrair ID do PaymentIntent do clientSecret se fornecido
      // clientSecret formato: pi_xxxxx_secret_yyyyyyy
      let piId = paymentIntentId;
      if (clientSecret && !piId) {
        piId = clientSecret.split("_secret_")[0];
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(piId);

      if (paymentIntent.status === "succeeded" || paymentIntent.status === "processing") {
        // Atualizar status no banco
        const { error: dbError } = await supabase
          .from("subscriptions")
          .update({ 
            status: "active",
            updated_at: new Date().toISOString() 
          })
          .eq("organization_id", organizationId);

        if (dbError) {
          console.error("Erro ao atualizar assinatura:", dbError);
        }

        return safeJson(res, 200, { data: { success: true, status: paymentIntent.status } });
      }

      return safeJson(res, 400, { error: "Pagamento não foi concluído", status: paymentIntent.status });
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      return safeJson(res, 500, { error: error.message });
    }
  },

  // Trocar de plano
  changePlan: async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { newPriceId } = req.body;

      if (!newPriceId) {
        return safeJson(res, 400, { error: "newPriceId é obrigatório" });
      }

      // Obter assinatura atual
      const { data: subscriptionData, error: dbError } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("organization_id", organizationId)
        .in("status", ["active", "trialing", "paused"])
        .single();

      if (dbError || !subscriptionData) {
        return safeJson(res, 404, { error: "Assinatura não encontrada" });
      }

      // Atualizar plano no Stripe
      const subscription = await stripe.subscriptions.update(
        subscriptionData.stripe_subscription_id,
        {
          items: [
            {
              id: (
                await stripe.subscriptions.retrieve(subscriptionData.stripe_subscription_id)
              ).items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: "create_prorations",
        },
        { expand: ["items.data.price.product"] }
      );

      // Atualizar no banco
      await supabase
        .from("subscriptions")
        .update({ plan_id: newPriceId, updated_at: new Date().toISOString() })
        .eq("organization_id", organizationId);

      return safeJson(res, 200, { data: subscription });
    } catch (error) {
      console.error("Erro ao trocar plano:", error);
      return safeJson(res, 500, { error: error.message });
    }
  },

  // Cancelar assinatura
  cancelSubscription: async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { immediate = false } = req.body;

      // Obter assinatura
      const { data: subscriptionData, error: dbError } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("organization_id", organizationId)
        .in("status", ["active", "trialing", "paused"])
        .single();

      if (dbError || !subscriptionData) {
        return safeJson(res, 404, { error: "Assinatura não encontrada" });
      }

      // Cancelar no Stripe
      const canceledSubscription = await stripe.subscriptions.update(
        subscriptionData.stripe_subscription_id,
        {
          cancel_at_period_end: !immediate,
        }
      );

      if (immediate) {
        await stripe.subscriptions.cancel(subscriptionData.stripe_subscription_id);
      }

      // Atualizar no banco
      await supabase
        .from("subscriptions")
        .update({
          status: immediate ? "canceled" : "active",
          cancel_at_period_end: !immediate,
          canceled_at: immediate ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId);

      return safeJson(res, 200, { data: canceledSubscription });
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error);
      return safeJson(res, 500, { error: error.message });
    }
  },

  // Processar pagamento atrasado
  processOverduePayment: async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        return safeJson(res, 400, { error: "paymentMethodId é obrigatório" });
      }

      // Obter assinatura
      const { data: subscriptionData, error: dbError } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("organization_id", organizationId)
        .single();

      if (dbError || !subscriptionData) {
        return safeJson(res, 404, { error: "Assinatura não encontrada" });
      }

      // Obter invoices em aberto
      const invoices = await stripe.invoices.list({
        subscription: subscriptionData.stripe_subscription_id,
        status: "open",
        limit: 1,
      });

      if (invoices.data.length === 0) {
        return safeJson(res, 404, { error: "Nenhuma fatura em aberto" });
      }

      const invoice = invoices.data[0];

      // Tentar pagar a fatura
      const paidInvoice = await stripe.invoices.pay(invoice.id, {
        paid_out_of_band: false,
      });

      return safeJson(res, 200, {
        data: paidInvoice,
        message: "Pagamento processado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      return safeJson(res, 500, { error: error.message });
    }
  },

  // Reativar assinatura cancelada
  reactivateSubscription: async (req, res) => {
    try {
      const { organizationId } = req.params;

      // Obter assinatura cancelada
      const { data: subscriptionData, error: dbError } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("organization_id", organizationId)
        .eq("status", "canceled")
        .single();

      if (dbError || !subscriptionData) {
        return safeJson(res, 404, { error: "Assinatura cancelada não encontrada" });
      }

      // Reativar no Stripe (criar nova assinatura com mesmo plano)
      const subscription = await stripe.subscriptions.retrieve(
        subscriptionData.stripe_subscription_id
      );

      const newSubscription = await stripe.subscriptions.create({
        customer: subscription.customer,
        items: subscription.items.data.map(item => ({
          price: item.price.id,
        })),
        expand: ["items.data.price.product"],
      });

      // Atualizar no banco
      await supabase
        .from("subscriptions")
        .update({
          stripe_subscription_id: newSubscription.id,
          status: newSubscription.status,
          current_period_start: new Date(newSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(newSubscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId);

      return safeJson(res, 200, { data: newSubscription });
    } catch (error) {
      console.error("Erro ao reativar assinatura:", error);
      return safeJson(res, 500, { error: error.message });
    }
  },
};

export default OrganizationSubscriptionsController;
