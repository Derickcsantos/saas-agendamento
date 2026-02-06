import { Router } from "express";
import OrganizationSubscriptionsController from "../controllers/organizationSubscriptionsController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

export const organizationSubscriptionsRouter = Router();

// Listar planos disponíveis
organizationSubscriptionsRouter.get("/plans", OrganizationSubscriptionsController.listPlans);

// Obter assinatura ativa da organização
organizationSubscriptionsRouter.get(
  "/:slug/active",
  authenticateJWT,
  OrganizationSubscriptionsController.getActiveSubscription
);

// Criar nova assinatura
organizationSubscriptionsRouter.post(
  "/:slug",
  authenticateJWT,
  OrganizationSubscriptionsController.createSubscription
);

// Criar PaymentMethod (backend)
organizationSubscriptionsRouter.post(
  "/:slug/payment-method",
  authenticateJWT,
  OrganizationSubscriptionsController.createPaymentMethod
);

// Confirmar pagamento
organizationSubscriptionsRouter.post(
  "/:slug/confirm-payment",
  authenticateJWT,
  OrganizationSubscriptionsController.confirmSubscriptionPayment
);

// Trocar de plano
organizationSubscriptionsRouter.patch(
  "/:slug/change-plan",
  authenticateJWT,
  OrganizationSubscriptionsController.changePlan
);

// Cancelar assinatura
organizationSubscriptionsRouter.post(
  "/:slug/cancel",
  authenticateJWT,
  OrganizationSubscriptionsController.cancelSubscription
);

// Processar pagamento atrasado
organizationSubscriptionsRouter.post(
  "/:slug/pay-overdue",
  authenticateJWT,
  OrganizationSubscriptionsController.processOverduePayment
);

// Reativar assinatura
organizationSubscriptionsRouter.post(
  "/:slug/reactivate",
  authenticateJWT,
  OrganizationSubscriptionsController.reactivateSubscription
);


