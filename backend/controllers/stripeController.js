import Stripe from "stripe";
import dotenv from "dotenv";
import { supabase } from "../lib/supabase.js";

dotenv.config();

// ================================
// Stripe client
// ================================
if (!process.env.STRIPE_SECRET_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Stripe] STRIPE_SECRET_KEY não encontrado. Verifique seu .env (STRIPE_SECRET_KEY)."
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

// ================================
// Helpers
// ================================
const asInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const asBool = (v, d = false) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes", "on"].includes(v.toLowerCase());
  return d;
};

const toUnix = (dateOrUnix) => {
  if (dateOrUnix == null) return undefined;
  if (typeof dateOrUnix === "number") return Math.floor(dateOrUnix);
  const ms = Date.parse(dateOrUnix);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
};

const pickIdempotencyKey = (req) =>
  req.headers["idempotency-key"] ||
  req.headers["Idempotency-Key"] ||
  req.headers["x-idempotency-key"] ||
  undefined;

const safeJson = (res, status, payload) => res.status(status).json(payload);

const stripeErrorToResponse = (err) => {
  // StripeError shape: https://stripe.com/docs/api/errors
  const status = err?.statusCode || 500;
  const code = err?.code;
  const type = err?.type;
  const message = err?.message || "Erro interno";
  const param = err?.param;

  return {
    status,
    body: {
      message,
      stripe: { type, code, param },
    },
  };
};

const withStripe = (fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[StripeController] Erro:", error);
    const { status, body } = stripeErrorToResponse(error);
    return safeJson(res, status, body);
  }
};

/**
 * Pagination helper for Stripe list endpoints
 * - fn: async ({limit, starting_after}) => { data, has_more }
 */
async function listAll({ limitPerPage = 100, maxItems = 5000, fn }) {
  const all = [];
  let starting_after = undefined;

  while (all.length < maxItems) {
    const page = await fn({ limit: limitPerPage, starting_after });
    all.push(...(page.data || []));
    if (!page.has_more || !page.data?.length) break;
    starting_after = page.data[page.data.length - 1].id;
  }

  return all;
}

/**
 * Basic local sync (optional)
 * Adjust column names to your schema. The current code had "pagarme_subscription_id".
 * Here we try common fields and fail silently if they don't exist.
 */
async function trySyncSubscriptionToSupabase({
  organization_id,
  stripe_subscription_id,
  stripe_customer_id,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  canceled_at,
  trial_end,
  latest_invoice_id,
  price_id,
  product_id,
  quantity,
  metadata,
}) {
  try {
    // 1) attempt update by stripe_subscription_id
    const payload = {
      organization_id: organization_id || null,
      stripe_subscription_id: stripe_subscription_id || null,
      stripe_customer_id: stripe_customer_id || null,
      status: status || null,
      current_period_start: current_period_start || null,
      current_period_end: current_period_end || null,
      cancel_at_period_end: cancel_at_period_end ?? null,
      canceled_at: canceled_at || null,
      trial_end: trial_end || null,
      latest_invoice_id: latest_invoice_id || null,
      price_id: price_id || null,
      product_id: product_id || null,
      quantity: quantity ?? null,
      metadata: metadata || null,
      updated_at: new Date().toISOString(),
    };

    // Try update first
    const upd = await supabase
      .from("subscriptions")
      .update(payload)
      .eq("stripe_subscription_id", stripe_subscription_id)
      .select("id")
      .maybeSingle();

    if (upd?.data?.id) return;

    // Insert if not exists
    await supabase.from("subscriptions").insert({
      ...payload,
      created_at: new Date().toISOString(),
    });
  } catch (_e) {
    // silent on purpose (schema may differ)
  }
}

/**
 * Convert Stripe interval to "monthly multiplier" for rough MRR calc
 */
function intervalToMonthly({ interval, interval_count, unit_amount }) {
  const count = Number(interval_count || 1);
  const amount = Number(unit_amount || 0);

  if (!interval) return 0;

  if (interval === "month") return amount / count;
  if (interval === "year") return amount / (12 * count);
  if (interval === "week") return (amount * (52 / 12)) / count;
  if (interval === "day") return (amount * (365 / 12)) / count;

  return 0;
}

// ================================
// Controller
// ================================
export const StripeController = {
  // =========================================
  // Health / Config
  // =========================================
  ping: withStripe(async (_req, res) => {
    const balance = await stripe.balance.retrieve();
    return safeJson(res, 200, { ok: true, balance });
  }),

  // =========================================
  // Produtos (Planos) - CRUD+
  // =========================================
  listProducts: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const starting_after = req.query.starting_after || undefined;
    const ending_before = req.query.ending_before || undefined;
    const active = req.query.active != null ? asBool(req.query.active, true) : true;

    const products = await stripe.products.list({
      limit,
      active,
      starting_after,
      ending_before,
    });

    return safeJson(res, 200, products);
  }),

  getProduct: withStripe(async (req, res) => {
    const { product_id } = req.params;
    const product = await stripe.products.retrieve(product_id);
    return safeJson(res, 200, product);
  }),

  createProduct: withStripe(async (req, res) => {
    const { name, description, metadata, images, statement_descriptor, tax_code, active } =
      req.body || {};

    if (!name) return safeJson(res, 400, { message: "name é obrigatório" });

    const product = await stripe.products.create(
      {
        name,
        description: description || undefined,
        metadata: metadata || undefined,
        images: images || undefined,
        statement_descriptor: statement_descriptor || undefined,
        tax_code: tax_code || undefined,
        active: active != null ? !!active : true,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 201, product);
  }),

  updateProduct: withStripe(async (req, res) => {
    const { product_id } = req.params;
    const { name, description, active, metadata, images, statement_descriptor, tax_code } =
      req.body || {};

    const product = await stripe.products.update(
      product_id,
      {
        name: name || undefined,
        description: description || undefined,
        active: active != null ? !!active : undefined,
        metadata: metadata || undefined,
        images: images || undefined,
        statement_descriptor: statement_descriptor || undefined,
        tax_code: tax_code || undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 200, product);
  }),

  archiveProduct: withStripe(async (req, res) => {
    const { product_id } = req.params;
    const product = await stripe.products.update(
      product_id,
      { active: false },
      { idempotencyKey: pickIdempotencyKey(req) }
    );
    return safeJson(res, 200, product);
  }),

  // =========================================
  // Preços (Plans) - CRUD+
  // =========================================
  listPrices: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const starting_after = req.query.starting_after || undefined;
    const ending_before = req.query.ending_before || undefined;
    const active = req.query.active != null ? asBool(req.query.active, true) : true;
    const product = req.query.product || undefined;
    const expandProduct = req.query.expand_product != null ? asBool(req.query.expand_product) : true;

    const prices = await stripe.prices.list({
      limit,
      active,
      product,
      starting_after,
      ending_before,
      expand: expandProduct ? ["data.product"] : undefined,
    });

    return safeJson(res, 200, prices);
  }),

  getPrice: withStripe(async (req, res) => {
    const { price_id } = req.params;
    const price = await stripe.prices.retrieve(price_id, {
      expand: ["product"],
    });
    return safeJson(res, 200, price);
  }),

  createPrice: withStripe(async (req, res) => {
    const {
      product_id,
      unit_amount,
      currency = "brl",
      interval = "month",
      interval_count = 1,
      metadata,
      nickname,
      trial_period_days,
      usage_type,
      billing_scheme,
      tax_behavior,
    } = req.body || {};

    if (!product_id || unit_amount == null) {
      return safeJson(res, 400, { message: "product_id e unit_amount são obrigatórios" });
    }

    const price = await stripe.prices.create(
      {
        product: product_id,
        unit_amount: asInt(unit_amount, 0),
        currency,
        recurring: interval
          ? {
              interval,
              interval_count: asInt(interval_count, 1),
              trial_period_days: trial_period_days != null ? asInt(trial_period_days, 0) : undefined,
              usage_type: usage_type || undefined, // metered | licensed
            }
          : undefined,
        metadata: metadata || undefined,
        nickname: nickname || undefined,
        billing_scheme: billing_scheme || undefined, // per_unit | tiered
        tax_behavior: tax_behavior || undefined, // exclusive | inclusive | unspecified
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 201, price);
  }),

  updatePrice: withStripe(async (req, res) => {
    const { price_id } = req.params;
    const { metadata, nickname, active } = req.body || {};

    // Note: Stripe doesn't allow changing unit_amount/recurring on existing prices.
    const price = await stripe.prices.update(
      price_id,
      {
        metadata: metadata || undefined,
        nickname: nickname || undefined,
        active: active != null ? !!active : undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 200, price);
  }),

  archivePrice: withStripe(async (req, res) => {
    const { price_id } = req.params;
    const price = await stripe.prices.update(
      price_id,
      { active: false },
      { idempotencyKey: pickIdempotencyKey(req) }
    );
    return safeJson(res, 200, price);
  }),

  // =========================================
  // Coupons / Promotion Codes (painel admin)
  // =========================================
  listCoupons: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const coupons = await stripe.coupons.list({ limit });
    return safeJson(res, 200, coupons);
  }),

  createCoupon: withStripe(async (req, res) => {
    const {
      percent_off,
      amount_off,
      currency = "brl",
      duration = "once",
      duration_in_months,
      name,
      max_redemptions,
      redeem_by,
      metadata,
    } = req.body || {};

    if (percent_off == null && amount_off == null) {
      return safeJson(res, 400, { message: "Informe percent_off ou amount_off" });
    }

    const coupon = await stripe.coupons.create(
      {
        percent_off: percent_off != null ? Number(percent_off) : undefined,
        amount_off: amount_off != null ? asInt(amount_off, 0) : undefined,
        currency: amount_off != null ? currency : undefined,
        duration,
        duration_in_months: duration_in_months != null ? asInt(duration_in_months, 0) : undefined,
        name: name || undefined,
        max_redemptions: max_redemptions != null ? asInt(max_redemptions, 0) : undefined,
        redeem_by: redeem_by != null ? toUnix(redeem_by) : undefined,
        metadata: metadata || undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 201, coupon);
  }),

  deleteCoupon: withStripe(async (req, res) => {
    const { coupon_id } = req.params;
    const deleted = await stripe.coupons.del(coupon_id);
    return safeJson(res, 200, deleted);
  }),

  listPromotionCodes: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const active = req.query.active != null ? asBool(req.query.active) : undefined;
    const promo = await stripe.promotionCodes.list({ limit, active });
    return safeJson(res, 200, promo);
  }),

  createPromotionCode: withStripe(async (req, res) => {
    const { coupon, code, max_redemptions, expires_at, metadata, restrictions } = req.body || {};
    if (!coupon) return safeJson(res, 400, { message: "coupon é obrigatório" });

    const promo = await stripe.promotionCodes.create(
      {
        coupon,
        code: code || undefined,
        max_redemptions: max_redemptions != null ? asInt(max_redemptions, 0) : undefined,
        expires_at: expires_at != null ? toUnix(expires_at) : undefined,
        metadata: metadata || undefined,
        restrictions: restrictions || undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 201, promo);
  }),

  // =========================================
  // Clientes - CRUD+
  // =========================================
  listCustomers: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const email = req.query.email || undefined;
    const starting_after = req.query.starting_after || undefined;

    const customers = await stripe.customers.list({ limit, email, starting_after });
    return safeJson(res, 200, customers);
  }),

  getCustomer: withStripe(async (req, res) => {
    const { customer_id } = req.params;
    const customer = await stripe.customers.retrieve(customer_id, {
      expand: ["invoice_settings.default_payment_method"],
    });
    return safeJson(res, 200, customer);
  }),

  createCustomer: withStripe(async (req, res) => {
    const { email, name, phone, metadata, address, tax } = req.body || {};
    const customer = await stripe.customers.create(
      {
        email: email || undefined,
        name: name || undefined,
        phone: phone || undefined,
        metadata: metadata || undefined,
        address: address || undefined,
        tax: tax || undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );
    return safeJson(res, 201, customer);
  }),

  updateCustomer: withStripe(async (req, res) => {
    const { customer_id } = req.params;
    const { email, name, phone, metadata, address } = req.body || {};

    const customer = await stripe.customers.update(
      customer_id,
      {
        email: email || undefined,
        name: name || undefined,
        phone: phone || undefined,
        metadata: metadata || undefined,
        address: address || undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 200, customer);
  }),

  deleteCustomer: withStripe(async (req, res) => {
    const { customer_id } = req.params;
    const deleted = await stripe.customers.del(customer_id);
    return safeJson(res, 200, deleted);
  }),

  // =========================================
  // Assinaturas - CRUD+++ (create/update/pause/resume/cancel/preview)
  // =========================================
  listSubscriptions: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const status = req.query.status || "all";
    const customer = req.query.customer || undefined;
    const starting_after = req.query.starting_after || undefined;

    const subs = await stripe.subscriptions.list({
      limit,
      status,
      customer,
      starting_after,
      expand: ["data.customer", "data.items.data.price", "data.latest_invoice"],
    });

    return safeJson(res, 200, subs);
  }),

  getSubscription: withStripe(async (req, res) => {
    const { subscription_id } = req.params;
    const sub = await stripe.subscriptions.retrieve(subscription_id, {
      expand: ["customer", "items.data.price.product", "latest_invoice.payment_intent"],
    });
    return safeJson(res, 200, sub);
  }),

  /**
   * Create subscription directly (admin use)
   * Body example:
   * {
   *  customer_id,
   *  price_id,
   *  quantity,
   *  trial_period_days,
   *  coupon,
   *  promotion_code,
   *  metadata,
   *  organization_id
   * }
   */
  createSubscription: withStripe(async (req, res) => {
    const {
      customer_id,
      price_id,
      quantity = 1,
      trial_period_days,
      coupon,
      promotion_code,
      metadata,
      organization_id,
      payment_behavior = "default_incomplete",
      collection_method = "charge_automatically",
      days_until_due,
    } = req.body || {};

    if (!customer_id || !price_id) {
      return safeJson(res, 400, { message: "customer_id e price_id são obrigatórios" });
    }

    const sub = await stripe.subscriptions.create(
      {
        customer: customer_id,
        items: [{ price: price_id, quantity: asInt(quantity, 1) }],
        trial_period_days: trial_period_days != null ? asInt(trial_period_days, 0) : undefined,
        coupon: coupon || undefined,
        promotion_code: promotion_code || undefined,
        metadata: { ...(metadata || {}), organization_id: organization_id || "" },
        payment_behavior,
        collection_method,
        days_until_due: collection_method === "send_invoice" ? asInt(days_until_due, 7) : undefined,
        expand: ["latest_invoice.payment_intent", "items.data.price.product"],
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    // best-effort sync
    await trySyncSubscriptionToSupabase({
      organization_id,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer?.id || customer_id,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at,
      trial_end: sub.trial_end,
      latest_invoice_id: sub.latest_invoice?.id || sub.latest_invoice,
      price_id,
      product_id: sub.items?.data?.[0]?.price?.product?.id || sub.items?.data?.[0]?.price?.product,
      quantity: sub.items?.data?.[0]?.quantity,
      metadata: sub.metadata,
    });

    return safeJson(res, 201, sub);
  }),

  updateSubscription: withStripe(async (req, res) => {
    const { subscription_id } = req.params;

    // Allow passing full stripe payload (admin power), but keep it safe-ish
    const {
      cancel_at_period_end,
      proration_behavior,
      items,
      metadata,
      coupon,
      promotion_code,
      pause_collection,
      payment_behavior,
      trial_end,
    } = req.body || {};

    const sub = await stripe.subscriptions.update(
      subscription_id,
      {
        cancel_at_period_end: cancel_at_period_end != null ? !!cancel_at_period_end : undefined,
        proration_behavior: proration_behavior || undefined,
        items: items || undefined, // [{id, price, quantity}] for updates
        metadata: metadata || undefined,
        coupon: coupon || undefined,
        promotion_code: promotion_code || undefined,
        pause_collection: pause_collection || undefined,
        payment_behavior: payment_behavior || undefined,
        trial_end: trial_end != null ? (trial_end === "now" ? "now" : toUnix(trial_end)) : undefined,
        expand: ["latest_invoice.payment_intent", "items.data.price.product", "customer"],
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    await trySyncSubscriptionToSupabase({
      organization_id: sub.metadata?.organization_id,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer?.id || sub.customer,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at,
      trial_end: sub.trial_end,
      latest_invoice_id: sub.latest_invoice?.id || sub.latest_invoice,
      price_id: sub.items?.data?.[0]?.price?.id,
      product_id: sub.items?.data?.[0]?.price?.product?.id || sub.items?.data?.[0]?.price?.product,
      quantity: sub.items?.data?.[0]?.quantity,
      metadata: sub.metadata,
    });

    return safeJson(res, 200, sub);
  }),

  cancelSubscription: withStripe(async (req, res) => {
    const { subscription_id } = req.params;
    const { invoice_now, prorate } = req.query || {};

    const sub = await stripe.subscriptions.cancel(
      subscription_id,
      {
        invoice_now: invoice_now != null ? asBool(invoice_now) : undefined,
        prorate: prorate != null ? asBool(prorate) : undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    await trySyncSubscriptionToSupabase({
      organization_id: sub.metadata?.organization_id,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer?.id || sub.customer,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at,
      trial_end: sub.trial_end,
      latest_invoice_id: sub.latest_invoice?.id || sub.latest_invoice,
      price_id: sub.items?.data?.[0]?.price?.id,
      product_id: sub.items?.data?.[0]?.price?.product?.id || sub.items?.data?.[0]?.price?.product,
      quantity: sub.items?.data?.[0]?.quantity,
      metadata: sub.metadata,
    });

    return safeJson(res, 200, sub);
  }),

  pauseSubscription: withStripe(async (req, res) => {
    const { subscription_id } = req.params;
    const { behavior = "mark_uncollectible" } = req.body || {};

    const sub = await stripe.subscriptions.update(
      subscription_id,
      {
        pause_collection: { behavior },
        expand: ["latest_invoice.payment_intent", "items.data.price.product", "customer"],
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 200, sub);
  }),

  resumeSubscription: withStripe(async (req, res) => {
    const { subscription_id } = req.params;

    const sub = await stripe.subscriptions.update(
      subscription_id,
      {
        pause_collection: "",
        expand: ["latest_invoice.payment_intent", "items.data.price.product", "customer"],
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 200, sub);
  }),

  previewUpcomingInvoice: withStripe(async (req, res) => {
    // Useful when admin changes plan/quantity and wants preview of proration.
    const { customer_id, subscription_id, new_price_id, new_quantity } = req.body || {};
    if (!customer_id) return safeJson(res, 400, { message: "customer_id é obrigatório" });

    const upcoming = await stripe.invoices.retrieveUpcoming({
      customer: customer_id,
      subscription: subscription_id || undefined,
      subscription_items:
        new_price_id != null
          ? [{ price: new_price_id, quantity: asInt(new_quantity, 1) }]
          : undefined,
    });

    return safeJson(res, 200, upcoming);
  }),

  // =========================================
  // Faturas - CRUD++ (create/finalize/pay/send/void/mark-uncollectible/items)
  // =========================================
  listInvoices: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const customer = req.query.customer || undefined;
    const status = req.query.status || undefined; // draft|open|paid|uncollectible|void
    const starting_after = req.query.starting_after || undefined;

    const invoices = await stripe.invoices.list({
      limit,
      customer,
      status,
      starting_after,
      expand: ["data.customer", "data.payment_intent", "data.charge"],
    });

    return safeJson(res, 200, invoices);
  }),

  getInvoice: withStripe(async (req, res) => {
    const { invoice_id } = req.params;
    const invoice = await stripe.invoices.retrieve(invoice_id, {
      expand: ["customer", "payment_intent", "charge", "lines.data.price.product"],
    });
    return safeJson(res, 200, invoice);
  }),

  /**
   * Create a one-off invoice (with invoice items)
   * Body:
   * {
   *  customer_id,
   *  currency,
   *  items: [{ description, price_id, unit_amount, quantity }],
   *  metadata,
   *  auto_advance=true,
   *  collection_method="charge_automatically" | "send_invoice",
   *  days_until_due
   * }
   */
  createInvoice: withStripe(async (req, res) => {
    const {
      customer_id,
      currency = "brl",
      items = [],
      metadata,
      auto_advance = true,
      collection_method = "charge_automatically",
      days_until_due,
      description,
    } = req.body || {};

    if (!customer_id) return safeJson(res, 400, { message: "customer_id é obrigatório" });
    if (!Array.isArray(items) || items.length === 0) {
      return safeJson(res, 400, { message: "items é obrigatório (array com pelo menos 1 item)" });
    }

    // 1) create invoice items
    for (const it of items) {
      const quantity = asInt(it.quantity, 1);

      if (it.price_id) {
        await stripe.invoiceItems.create(
          {
            customer: customer_id,
            price: it.price_id,
            quantity,
            description: it.description || undefined,
            metadata: it.metadata || undefined,
          },
          { idempotencyKey: pickIdempotencyKey(req) }
        );
      } else if (it.unit_amount != null) {
        await stripe.invoiceItems.create(
          {
            customer: customer_id,
            currency,
            unit_amount: asInt(it.unit_amount, 0),
            quantity,
            description: it.description || undefined,
            metadata: it.metadata || undefined,
          },
          { idempotencyKey: pickIdempotencyKey(req) }
        );
      } else {
        return safeJson(res, 400, { message: "Cada item deve ter price_id ou unit_amount" });
      }
    }

    // 2) create invoice
    const invoice = await stripe.invoices.create(
      {
        customer: customer_id,
        auto_advance: !!auto_advance,
        collection_method,
        days_until_due:
          collection_method === "send_invoice" ? asInt(days_until_due, 7) : undefined,
        metadata: metadata || undefined,
        description: description || undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 201, invoice);
  }),

  finalizeInvoice: withStripe(async (req, res) => {
    const { invoice_id } = req.params;
    const invoice = await stripe.invoices.finalizeInvoice(invoice_id, {
      expand: ["payment_intent", "charge", "customer"],
    });
    return safeJson(res, 200, invoice);
  }),

  payInvoice: withStripe(async (req, res) => {
    const { invoice_id } = req.params;
    const { paid_out_of_band } = req.body || {};

    const invoice = await stripe.invoices.pay(
      invoice_id,
      { paid_out_of_band: paid_out_of_band != null ? !!paid_out_of_band : undefined },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 200, invoice);
  }),

  sendInvoice: withStripe(async (req, res) => {
    const { invoice_id } = req.params;
    const invoice = await stripe.invoices.sendInvoice(invoice_id);
    return safeJson(res, 200, invoice);
  }),

  voidInvoice: withStripe(async (req, res) => {
    const { invoice_id } = req.params;
    const invoice = await stripe.invoices.voidInvoice(invoice_id);
    return safeJson(res, 200, invoice);
  }),

  markInvoiceUncollectible: withStripe(async (req, res) => {
    const { invoice_id } = req.params;
    const invoice = await stripe.invoices.markUncollectible(invoice_id);
    return safeJson(res, 200, invoice);
  }),

  deleteDraftInvoice: withStripe(async (req, res) => {
    const { invoice_id } = req.params;
    const deleted = await stripe.invoices.del(invoice_id);
    return safeJson(res, 200, deleted);
  }),

  // Invoice Items management (admin)
  listInvoiceItems: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const customer = req.query.customer || undefined;
    const pending = req.query.pending != null ? asBool(req.query.pending) : undefined;

    const items = await stripe.invoiceItems.list({
      limit,
      customer,
      pending,
    });

    return safeJson(res, 200, items);
  }),

  deleteInvoiceItem: withStripe(async (req, res) => {
    const { invoiceitem_id } = req.params;
    const deleted = await stripe.invoiceItems.del(invoiceitem_id);
    return safeJson(res, 200, deleted);
  }),

  // =========================================
  // Pagamentos (PaymentIntents / Charges) + Cobrança única + Histórico
  // =========================================
  listPaymentIntents: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const customer = req.query.customer || undefined;
    const starting_after = req.query.starting_after || undefined;
    const created_gte = toUnix(req.query.created_gte);
    const created_lte = toUnix(req.query.created_lte);

    const payments = await stripe.paymentIntents.list({
      limit,
      customer,
      starting_after,
      created:
        created_gte || created_lte
          ? { ...(created_gte ? { gte: created_gte } : {}), ...(created_lte ? { lte: created_lte } : {}) }
          : undefined,
    });

    return safeJson(res, 200, payments);
  }),

  getPaymentIntent: withStripe(async (req, res) => {
    const { payment_intent_id } = req.params;
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id, {
      expand: ["customer", "latest_charge", "payment_method"],
    });
    return safeJson(res, 200, pi);
  }),

  /**
   * Create one-time charge via PaymentIntent (admin/manual charge)
   * - For card collection, you still need a PaymentMethod or use Checkout embedded payment mode.
   * Body:
   * {
   *  amount, currency, customer_id, payment_method_id, confirm=true,
   *  description, metadata, receipt_email, statement_descriptor
   * }
   */
  createOneTimePaymentIntent: withStripe(async (req, res) => {
    const {
      amount,
      currency = "brl",
      customer_id,
      payment_method_id,
      confirm = false,
      description,
      metadata,
      receipt_email,
      statement_descriptor,
      capture_method,
    } = req.body || {};

    if (amount == null) return safeJson(res, 400, { message: "amount é obrigatório" });

    const pi = await stripe.paymentIntents.create(
      {
        amount: asInt(amount, 0),
        currency,
        customer: customer_id || undefined,
        payment_method: payment_method_id || undefined,
        confirm: !!confirm,
        description: description || undefined,
        metadata: metadata || undefined,
        receipt_email: receipt_email || undefined,
        statement_descriptor: statement_descriptor || undefined,
        capture_method: capture_method || undefined, // automatic | manual
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 201, pi);
  }),

  /**
   * Create one-time payment Checkout Session (Embedded)
   * Body:
   * {
   *  customer_email,
   *  customer_id,
   *  amount,
   *  currency,
   *  description,
   *  return_url,
   *  organization_id,
   *  metadata
   * }
   */
  createOneTimeCheckoutSession: withStripe(async (req, res) => {
    const {
      customer_email,
      customer_id,
      amount,
      currency = "brl",
      description,
      return_url,
      organization_id,
      metadata,
    } = req.body || {};

    if (!return_url) return safeJson(res, 400, { message: "return_url é obrigatório" });
    if (amount == null) return safeJson(res, 400, { message: "amount é obrigatório" });

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded",
        customer: customer_id || undefined,
        customer_email: customer_id ? undefined : customer_email || undefined,
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: asInt(amount, 0),
              product_data: {
                name: description || "Cobrança única",
              },
            },
            quantity: 1,
          },
        ],
        return_url,
        metadata: {
          ...(metadata || {}),
          organization_id: organization_id || "",
        },
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 200, { client_secret: session.client_secret, id: session.id });
  }),

  listCharges: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const customer = req.query.customer || undefined;
    const payment_intent = req.query.payment_intent || undefined;
    const created_gte = toUnix(req.query.created_gte);
    const created_lte = toUnix(req.query.created_lte);

    const charges = await stripe.charges.list({
      limit,
      customer,
      payment_intent,
      created:
        created_gte || created_lte
          ? { ...(created_gte ? { gte: created_gte } : {}), ...(created_lte ? { lte: created_lte } : {}) }
          : undefined,
    });

    return safeJson(res, 200, charges);
  }),

  // Refunds
  listRefunds: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const payment_intent = req.query.payment_intent || undefined;
    const charge = req.query.charge || undefined;

    const refunds = await stripe.refunds.list({ limit, payment_intent, charge });
    return safeJson(res, 200, refunds);
  }),

  createRefund: withStripe(async (req, res) => {
    const { payment_intent, charge, amount, reason, metadata } = req.body || {};

    if (!payment_intent && !charge) {
      return safeJson(res, 400, { message: "Informe payment_intent ou charge" });
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: payment_intent || undefined,
        charge: charge || undefined,
        amount: amount != null ? asInt(amount, 0) : undefined,
        reason: reason || undefined, // duplicate | fraudulent | requested_by_customer
        metadata: metadata || undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 201, refund);
  }),

  // Disputes (admin)
  listDisputes: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const disputes = await stripe.disputes.list({ limit });
    return safeJson(res, 200, disputes);
  }),

  // =========================================
  // Checkout (Embedded) - Subscription (improved)
  // =========================================
  createCheckoutSession: withStripe(async (req, res) => {
    const {
      customer_email,
      customer_id,
      price_id,
      amount,
      currency = "brl",
      interval = "month",
      interval_count = 1,
      plan_name,
      plan_description,
      return_url,
      organization_id,
      metadata,
      coupon,
      promotion_code,
      trial_period_days,
      allow_promotion_codes,
    } = req.body || {};

    if (!return_url) return safeJson(res, 400, { message: "return_url é obrigatório" });
    if (!price_id && amount == null) {
      return safeJson(res, 400, { message: "price_id ou amount é obrigatório" });
    }

    const lineItem = price_id
      ? { price: price_id, quantity: 1 }
      : {
          price_data: {
            currency,
            unit_amount: asInt(amount, 0),
            recurring: { interval, interval_count: asInt(interval_count, 1) },
            product_data: {
              name: plan_name || "Plano",
              description: plan_description || undefined,
            },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        ui_mode: "embedded",
        customer: customer_id || undefined,
        customer_email: customer_id ? undefined : customer_email || undefined,
        line_items: [lineItem],
        return_url,
        allow_promotion_codes: allow_promotion_codes != null ? !!allow_promotion_codes : undefined,
        discounts:
          coupon || promotion_code
            ? [
                {
                  ...(coupon ? { coupon } : {}),
                  ...(promotion_code ? { promotion_code } : {}),
                },
              ]
            : undefined,
        subscription_data: {
          trial_period_days:
            trial_period_days != null ? asInt(trial_period_days, 0) : undefined,
          metadata: { ...(metadata || {}), organization_id: organization_id || "" },
        },
        metadata: { ...(metadata || {}), organization_id: organization_id || "" },
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 200, { client_secret: session.client_secret, id: session.id });
  }),

  getCheckoutSession: withStripe(async (req, res) => {
    const { session_id } = req.params;
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["customer", "subscription", "payment_intent", "line_items"],
    });
    return safeJson(res, 200, session);
  }),

  // =========================================
  // Saldo / Saques / Transações
  // =========================================
  getBalance: withStripe(async (_req, res) => {
    const balance = await stripe.balance.retrieve();
    return safeJson(res, 200, balance);
  }),

  listBalanceTransactions: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const type = req.query.type || undefined; // charge|payment|refund|payout|...
    const created_gte = toUnix(req.query.created_gte);
    const created_lte = toUnix(req.query.created_lte);

    const txs = await stripe.balanceTransactions.list({
      limit,
      type,
      created:
        created_gte || created_lte
          ? { ...(created_gte ? { gte: created_gte } : {}), ...(created_lte ? { lte: created_lte } : {}) }
          : undefined,
    });

    return safeJson(res, 200, txs);
  }),

  listPayouts: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 100);
    const payouts = await stripe.payouts.list({ limit });
    return safeJson(res, 200, payouts);
  }),

  createPayout: withStripe(async (req, res) => {
    const { amount, currency = "brl", method, destination } = req.body || {};
    if (amount == null) return safeJson(res, 400, { message: "amount é obrigatório" });

    const payout = await stripe.payouts.create(
      {
        amount: asInt(amount, 0),
        currency,
        method: method || undefined, // standard | instant (availability depends)
        destination: destination || undefined,
      },
      { idempotencyKey: pickIdempotencyKey(req) }
    );

    return safeJson(res, 201, payout);
  }),

  // =========================================
  // Relatórios & Métricas (painel admin)
  // =========================================
  /**
   * Revenue summary from balance transactions (net/gross/fees) in a period
   * Query:
   * ?from=2026-02-01&to=2026-02-05
   */
  metricsRevenue: withStripe(async (req, res) => {
    const from = toUnix(req.query.from);
    const to = toUnix(req.query.to);

    const txs = await listAll({
      limitPerPage: 100,
      maxItems: 10000,
      fn: ({ limit, starting_after }) =>
        stripe.balanceTransactions.list({
          limit,
          starting_after,
          created:
            from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined,
        }),
    });

    // Aggregate only "charge" and "payment" like transactions
    let gross = 0;
    let net = 0;
    let fees = 0;

    for (const t of txs) {
      // Stripe amounts are in the smallest currency unit
      // include most revenue-impacting types
      if (["charge", "payment"].includes(t.type)) {
        gross += Number(t.amount || 0);
        net += Number(t.net || 0);
        fees += Number(t.fee || 0);
      }
    }

    return safeJson(res, 200, {
      currency: txs?.[0]?.currency || "brl",
      period: { from: from || null, to: to || null },
      totals: { gross, fees, net },
      counts: { total_txs: txs.length },
    });
  }),

  /**
   * Subscription metrics: active count, trialing, past_due, canceled in range, rough MRR
   * Query:
   * ?from=2026-02-01&to=2026-02-05
   */
  metricsSubscriptions: withStripe(async (req, res) => {
    const from = toUnix(req.query.from);
    const to = toUnix(req.query.to);

    const subs = await listAll({
      limitPerPage: 100,
      maxItems: 10000,
      fn: ({ limit, starting_after }) =>
        stripe.subscriptions.list({
          limit,
          starting_after,
          status: "all",
          expand: ["data.items.data.price"],
        }),
    });

    let active = 0;
    let trialing = 0;
    let past_due = 0;
    let unpaid = 0;
    let canceledInRange = 0;

    // Rough MRR: sum monthly equivalent of active subs
    let mrr = 0;

    for (const s of subs) {
      if (s.status === "active") active += 1;
      if (s.status === "trialing") trialing += 1;
      if (s.status === "past_due") past_due += 1;
      if (s.status === "unpaid") unpaid += 1;

      const canceled_at = s.canceled_at || 0;
      if (from && to && canceled_at && canceled_at >= from && canceled_at <= to) canceledInRange += 1;

      if (s.status === "active") {
        for (const item of s.items?.data || []) {
          const price = item.price;
          const unit_amount = price?.unit_amount || 0;
          const interval = price?.recurring?.interval;
          const interval_count = price?.recurring?.interval_count || 1;
          const qty = item.quantity || 1;

          mrr += intervalToMonthly({ interval, interval_count, unit_amount }) * qty;
        }
      }
    }

    return safeJson(res, 200, {
      period: { from: from || null, to: to || null },
      counts: { total: subs.length, active, trialing, past_due, unpaid, canceledInRange },
      mrr_estimated: Math.round(mrr), // in cents
      note:
        "MRR é uma estimativa (conversão para mensal). Para métricas financeiras oficiais, use relatórios do Stripe ou consolide via invoices/charges.",
    });
  }),

  /**
   * Customer lifetime spend (top N) based on successful charges in a period (or all-time if no period).
   * Query:
   * ?limit=20&from=...&to=...
   */
  metricsTopCustomersBySpend: withStripe(async (req, res) => {
    const limit = asInt(req.query.limit, 20);
    const from = toUnix(req.query.from);
    const to = toUnix(req.query.to);

    const charges = await listAll({
      limitPerPage: 100,
      maxItems: 10000,
      fn: ({ limit: per, starting_after }) =>
        stripe.charges.list({
          limit: per,
          starting_after,
          created:
            from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined,
        }),
    });

    const byCustomer = new Map();
    for (const c of charges) {
      if (!c.paid || c.status !== "succeeded") continue;
      const customer = typeof c.customer === "string" ? c.customer : c.customer?.id;
      if (!customer) continue;

      const prev = byCustomer.get(customer) || { customer, amount: 0, currency: c.currency, charges: 0 };
      prev.amount += Number(c.amount || 0);
      prev.charges += 1;
      byCustomer.set(customer, prev);
    }

    const top = Array.from(byCustomer.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);

    return safeJson(res, 200, {
      period: { from: from || null, to: to || null },
      top,
    });
  }),

  // =========================================
  // Webhooks (opcional, mas MUITO útil p/ painel)
  // =========================================
  /**
   * IMPORTANT:
   * - Você precisa configurar essa rota usando `express.raw({ type: 'application/json' })`
   *   (não JSON parser) para validar assinatura.
   *
   * Example:
   *   app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), StripeController.webhook)
   */
  webhook: withStripe(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return safeJson(res, 500, { message: "STRIPE_WEBHOOK_SECRET não configurado" });
    }
    if (!sig) return safeJson(res, 400, { message: "stripe-signature ausente" });

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return safeJson(res, 400, { message: `Webhook inválido: ${err.message}` });
    }

    // Handle the event (add what you need)
    // eslint-disable-next-line no-console
    console.log("[Stripe webhook]", event.type);

    // Best-effort sync for subscription lifecycle
    if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    ) {
      const sub = event.data.object;

      // try to extract core info
      const price = sub.items?.data?.[0]?.price;
      const price_id = price?.id;
      const product_id = price?.product?.id || price?.product;

      await trySyncSubscriptionToSupabase({
        organization_id: sub.metadata?.organization_id,
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at,
        trial_end: sub.trial_end,
        latest_invoice_id: sub.latest_invoice,
        price_id,
        product_id,
        quantity: sub.items?.data?.[0]?.quantity,
        metadata: sub.metadata,
      });
    }

    return res.status(200).json({ received: true });
  }),
};

export default StripeController;