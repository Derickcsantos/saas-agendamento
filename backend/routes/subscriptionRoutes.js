import { Router } from "express";
import {
  getSubscriptions,
  getSubscriptionsByOrganization,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "../controllers/subscriptionsController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

export const subscriptionsRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Gestão de assinaturas
 */

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: Lista todas as assinaturas
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 */
subscriptionsRouter.get("/", getSubscriptions);

/**
 * @swagger
 * /subscriptions/organization/{slug}:
 *   get:
 *     summary: Busca assinaturas pelo slug da organização
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: slug
 *         schema:
 *           type: string
 *         required: true
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Assinaturas retornadas
 *       404:
 *         description: Organização não encontrada
 */
subscriptionsRouter.get("/organization/:slug", getSubscriptionsByOrganization);

/**
 * @swagger
 * /subscriptions/{id}:
 *   get:
 *     summary: Retorna uma assinatura pelo ID
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da assinatura
 *     responses:
 *       200:
 *         description: Assinatura encontrada
 *       404:
 *         description: Assinatura não encontrada
 */
subscriptionsRouter.get("/:id", getSubscriptionById);

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Cria uma assinatura
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organization_id:
 *                 type: string
 *               plan_id:
 *                 type: number
 *               status:
 *                 type: string
 *               current_period_start:
 *                 type: string
 *               current_period_end:
 *                 type: string
 *               trial_end:
 *                 type: string
 *               pagarme_subscription_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assinatura criada com sucesso
 */
subscriptionsRouter.post("/", authenticateJWT, createSubscription);

/**
 * @swagger
 * /subscriptions/{id}:
 *   put:
 *     summary: Atualiza uma assinatura
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da assinatura
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan_id: { type: number }
 *               status: { type: string }
 *               current_period_start: { type: string }
 *               current_period_end: { type: string }
 *               trial_end: { type: string }
 *               pagarme_subscription_id: { type: string }
 *     responses:
 *       200:
 *         description: Assinatura atualizada
 */
subscriptionsRouter.put("/:id", authenticateJWT, updateSubscription);

/**
 * @swagger
 * /subscriptions/{id}:
 *   delete:
 *     summary: Remove uma assinatura
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da assinatura
 *     responses:
 *       200:
 *         description: Assinatura removida
 */
subscriptionsRouter.delete("/:id", authenticateJWT, deleteSubscription);
