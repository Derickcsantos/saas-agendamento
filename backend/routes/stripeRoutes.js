import { Router } from "express";
import { StripeController } from "../controllers/stripeController.js";

export const stripeRouter = Router();

/**
 * ================================
 * Stripe Routes (Express)
 * ================================
 */

// Health Check
stripeRouter.get("/ping", StripeController.ping);

// ================================
// Products (CRUD)
// ================================
stripeRouter.get("/products", StripeController.listProducts);
stripeRouter.get("/products/:product_id", StripeController.getProduct);
stripeRouter.post("/products", StripeController.createProduct);
stripeRouter.patch("/products/:product_id", StripeController.updateProduct);
stripeRouter.delete("/products/:product_id", StripeController.archiveProduct);

// ================================
// Prices (CRUD)
// ================================
stripeRouter.get("/prices", StripeController.listPrices);
stripeRouter.get("/prices/:price_id", StripeController.getPrice);
stripeRouter.post("/prices", StripeController.createPrice);
stripeRouter.patch("/prices/:price_id", StripeController.updatePrice);
stripeRouter.delete("/prices/:price_id", StripeController.archivePrice);

// ================================
// Coupons / Promotion Codes
// ================================
stripeRouter.get("/coupons", StripeController.listCoupons);
stripeRouter.post("/coupons", StripeController.createCoupon);
stripeRouter.delete("/coupons/:coupon_id", StripeController.deleteCoupon);
stripeRouter.get("/promo-codes", StripeController.listPromotionCodes);
stripeRouter.post("/promo-codes", StripeController.createPromotionCode);

// ================================
// Customers (CRUD)
// ================================
stripeRouter.get("/customers", StripeController.listCustomers);
stripeRouter.get("/customers/:customer_id", StripeController.getCustomer);
stripeRouter.post("/customers", StripeController.createCustomer);
stripeRouter.patch("/customers/:customer_id", StripeController.updateCustomer);
stripeRouter.delete("/customers/:customer_id", StripeController.deleteCustomer);

// ================================
// Subscriptions (CRUD+)
// ================================
stripeRouter.get("/subscriptions", StripeController.listSubscriptions);
stripeRouter.get("/subscriptions/:subscription_id", StripeController.getSubscription);
stripeRouter.post("/subscriptions", StripeController.createSubscription);
stripeRouter.patch("/subscriptions/:subscription_id", StripeController.updateSubscription);
stripeRouter.post("/subscriptions/:subscription_id/cancel", StripeController.cancelSubscription);
stripeRouter.post("/subscriptions/:subscription_id/pause", StripeController.pauseSubscription);
stripeRouter.post("/subscriptions/:subscription_id/resume", StripeController.resumeSubscription);
stripeRouter.post("/subscriptions/preview-upcoming-invoice", StripeController.previewUpcomingInvoice);

// ================================
// Invoices (CRUD++)
// ================================
stripeRouter.get("/invoices", StripeController.listInvoices);
stripeRouter.get("/invoices/:invoice_id", StripeController.getInvoice);
stripeRouter.post("/invoices", StripeController.createInvoice);
stripeRouter.post("/invoices/:invoice_id/finalize", StripeController.finalizeInvoice);
stripeRouter.post("/invoices/:invoice_id/pay", StripeController.payInvoice);
stripeRouter.post("/invoices/:invoice_id/send", StripeController.sendInvoice);
stripeRouter.post("/invoices/:invoice_id/void", StripeController.voidInvoice);
stripeRouter.post("/invoices/:invoice_id/uncollectible", StripeController.markInvoiceUncollectible);
stripeRouter.delete("/invoices/:invoice_id", StripeController.deleteDraftInvoice);

// ================================
// Invoice Items
// ================================
stripeRouter.get("/invoice-items", StripeController.listInvoiceItems);
stripeRouter.delete("/invoice-items/:invoiceitem_id", StripeController.deleteInvoiceItem);

// ================================
// Payments / Charges / Refunds
// ================================
stripeRouter.get("/payment-intents", StripeController.listPaymentIntents);
stripeRouter.get("/payment-intents/:payment_intent_id", StripeController.getPaymentIntent);
stripeRouter.post("/payment-intents/one-time", StripeController.createOneTimePaymentIntent);
stripeRouter.post("/checkout/one-time", StripeController.createOneTimeCheckoutSession);
stripeRouter.get("/charges", StripeController.listCharges);
stripeRouter.get("/refunds", StripeController.listRefunds);
stripeRouter.post("/refunds", StripeController.createRefund);
stripeRouter.get("/disputes", StripeController.listDisputes);

// ================================
// Balance / Payouts / Transactions
// ================================
stripeRouter.get("/balance", StripeController.getBalance);
stripeRouter.get("/balance/transactions", StripeController.listBalanceTransactions);
stripeRouter.get("/payouts", StripeController.listPayouts);
stripeRouter.post("/payouts", StripeController.createPayout);

// ================================
// Checkout (Embedded)
// ================================
stripeRouter.post("/checkout/subscription", StripeController.createCheckoutSession);
stripeRouter.get("/checkout/sessions/:session_id", StripeController.getCheckoutSession);

// ================================
// Metrics
// ================================
stripeRouter.get("/metrics/revenue", StripeController.metricsRevenue);
stripeRouter.get("/metrics/subscriptions", StripeController.metricsSubscriptions);
stripeRouter.get("/metrics/top-customers", StripeController.metricsTopCustomersBySpend);