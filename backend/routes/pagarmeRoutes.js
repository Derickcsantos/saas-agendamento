import { Router } from "express";
import { PagarmeController } from "../controllers/pagarmeController.js";

export const pagarmeRouter = Router();

// Cobranças
pagarmeRouter.post("/charges", PagarmeController.createCharge);
pagarmeRouter.get("/charges/:charge_id", PagarmeController.getCharge);
pagarmeRouter.post("/charges/:charge_id/capture", PagarmeController.captureCharge);
pagarmeRouter.post("/charges/:charge_id/cancel", PagarmeController.cancelCharge);

// Cliente
pagarmeRouter.post("/customers", PagarmeController.createCustomer);
pagarmeRouter.get("/customers/:customer_id", PagarmeController.getCustomer);

// Split
pagarmeRouter.post("/split", PagarmeController.createSplit);

// Webhook
pagarmeRouter.post("/webhook/pagarme", PagarmeController.webhook);

pagarmeRouter.post("/plans", PagarmeController.createPlan);

// Listar e editar planos
pagarmeRouter.get("/plans", PagarmeController.listPlans);

pagarmeRouter.put("/plans/:plan_id", PagarmeController.updatePlan);

// Excluir plano
pagarmeRouter.delete("/plans/:plan_id", PagarmeController.deletePlan);

pagarmeRouter.get("/subscriptions", PagarmeController.listSubscriptions);
// Assinaturas (recorrência)
pagarmeRouter.post("/subscriptions", PagarmeController.createSubscription);

// Atualizar e cancelar assinatura
pagarmeRouter.patch("/subscriptions/:subscription_id", PagarmeController.updateSubscription);

pagarmeRouter.post("/subscriptions/:subscription_id/cancel", PagarmeController.cancelSubscription);

// Reembolso
pagarmeRouter.post("/charges/:charge_id/refund", PagarmeController.refundCharge);

// Webhooks de recorrência
pagarmeRouter.post("/webhooks/recurrence", PagarmeController.webhookRecurrence);
