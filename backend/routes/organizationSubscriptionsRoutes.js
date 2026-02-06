import { Router } from "express";
import OrganizationSubscriptionsController from "../controllers/organizationSubscriptionsController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

export const organizationSubscriptionsRouter = Router();

/**
 * ================================
 * Organization Subscriptions Routes
 * ================================
 */

// Listar planos disponíveis
organizationSubscriptionsRouter.get("/plans", OrganizationSubscriptionsController.listPlans);

// Obter assinatura ativa da organização
organizationSubscriptionsRouter.get(
  "/:organizationId/active",
  authenticateJWT,
  OrganizationSubscriptionsController.getActiveSubscription
);

// Criar nova assinatura
organizationSubscriptionsRouter.post(
  "/:organizationId",
  authenticateJWT,
  OrganizationSubscriptionsController.createSubscription
);

// Criar PaymentMethod (backend)
organizationSubscriptionsRouter.post(
  "/:organizationId/payment-method",
  authenticateJWT,
  OrganizationSubscriptionsController.createPaymentMethod
);

// Confirmar pagamento
organizationSubscriptionsRouter.post(
  "/:organizationId/confirm-payment",
  authenticateJWT,
  OrganizationSubscriptionsController.confirmSubscriptionPayment
);

// Trocar de plano
organizationSubscriptionsRouter.patch(
  "/:organizationId/change-plan",
  authenticateJWT,
  OrganizationSubscriptionsController.changePlan
);

// Cancelar assinatura
organizationSubscriptionsRouter.post(
  "/:organizationId/cancel",
  authenticateJWT,
  OrganizationSubscriptionsController.cancelSubscription
);

// Processar pagamento atrasado
organizationSubscriptionsRouter.post(
  "/:organizationId/pay-overdue",
  authenticateJWT,
  OrganizationSubscriptionsController.processOverduePayment
);

// Reativar assinatura
organizationSubscriptionsRouter.post(
  "/:organizationId/reactivate",
  authenticateJWT,
  OrganizationSubscriptionsController.reactivateSubscription
);

export default organizationSubscriptionsRouter;
