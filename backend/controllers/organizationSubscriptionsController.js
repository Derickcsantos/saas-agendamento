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
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
          payment_method_types: ["card"],
        },
        default_payment_method: paymentMethodId || undefined,
        expand: ["latest_invoice.payment_intent", "items.data.price.product"],
        metadata: {
          organization_id: organizationId,
        },
      });

      // Salvar no banco de dados
      const latestInvoice = subscription.latest_invoice;
      const paymentIntent = latestInvoice?.payment_intent;
      const paymentIntentId =
        typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id || null;

      const latestInvoiceId = typeof latestInvoice === "string" ? latestInvoice : latestInvoice?.id || null;
      const latestInvoiceAmount =
        typeof latestInvoice === "object" && latestInvoice != null
          ? latestInvoice.amount_due ?? latestInvoice.total ?? null
          : null;

      const subscriptionInsertPayload = {
        organization_id: organizationId,
        plan_id: priceId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        stripe_subscription_id: subscription.id,
        stripe_status: subscription.status,
        latest_invoice_id: paymentIntentId || latestInvoiceId,
        latest_invoice_amount: latestInvoiceAmount,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        billing_type: "stripe",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("[subscriptions] payload insert:", subscriptionInsertPayload);

      const { error: dbError } = await supabase
        .from("subscriptions")
        .insert(subscriptionInsertPayload);

      if (dbError) {
        console.error("Erro ao salvar assinatura no banco:", dbError);
      }

      const clientSecret = subscription?.latest_invoice?.payment_intent?.client_secret || null;

      return safeJson(res, 201, {
        data: subscription,
        clientSecret,
      });
    } catch (error) {
      console.error("Erro ao criar assinatura:", error);
      return safeJson(res, 500, { error: error.message });
    }
  },

  // Criar PaymentMethod no backend (evita Stripe direto no frontend)
  createPaymentMethod: async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { cardNumber, expiryMonth, expiryYear, cvc, cardholderName, email } = req.body || {};

      if (!cardNumber || !expiryMonth || !expiryYear || !cvc || !cardholderName) {
        return safeJson(res, 400, { error: "Dados do cartão incompletos" });
      }

      const paymentMethod = await stripe.paymentMethods.create({
        type: "card",
        card: {
          number: String(cardNumber).replace(/\s+/g, ""),
          exp_month: String(expiryMonth),
          exp_year: String(expiryYear),
          cvc: String(cvc),
        },
        billing_details: {
          name: cardholderName,
          email: email || undefined,
        },
        metadata: {
          organization_id: organizationId,
        },
      });

      return safeJson(res, 201, { data: { id: paymentMethod.id } });
    } catch (error) {
      console.error("Erro ao criar PaymentMethod:", error);
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
