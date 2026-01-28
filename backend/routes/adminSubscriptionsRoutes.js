import { Router } from 'express'
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';
import { createSubscription, deleteSubscription, editSubscription, listHistorySubscription, listSubscription } from '../controllers/adminSubscriptionsController.js';

export const adminSubscriptionRouter = Router();

/**
 * @swagger
 * /api/admin/subscriptions/{slug}:
 *   post:
 *     summary: Cadastra uma nova assinatura
 *     tags: [Assinaturas dos usuários]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           example: minha-barbearia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idUser
 *               - idPlan
 *               - methodPayment
 *               - isActive
 *               - startDate
 *             properties:
 *               idUser:
 *                 type: integer
 *               idPlan:
 *                 type: integer
 *               methodPayment:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               startDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Assinatura criado com sucesso
 */

adminSubscriptionRouter.post('/:slug', authenticateJWT, requireAdminOfOrganization, createSubscription);

/**
 * @swagger
 * /api/admin/subscriptions/{slug}:
 *   get:
 *     summary: Lista todas as assinaturas
 *     description: Retorna todas as assinaturas registradas na organização.
 *     tags: [Assinaturas dos usuários]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador único da organização
 *
 *     responses:
 *       200:
 *         description: Lista completa de assinaturas
 *
 *       401:
 *         description: Token inválido ou não fornecido
 *
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
adminSubscriptionRouter.get('/:slug', authenticateJWT, requireAdminOfOrganization, listSubscription);

/**
 * @swagger
 * /api/admin/subscriptions/{slug}/{id}:
 *   put:
 *     summary: Atualiza os dados de uma assinatura existente
 *     description: Atualiza os dados de uma assinatura vinculada à organização autenticada.
 *     tags: [Assinaturas dos usuários]
 *     security:
 *       - bearerAuth: []
 *     
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           description: ID da assinatura que será atualizada
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           description: Slug da organização que contém a assinatura será atualizada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idUser:
 *                 type: integer
 *                 example: 1
 *               idPlan:
 *                 type: integer
 *                 example: 1
 *               methodPayment:
 *                 type: string
 *                 example: "PIX"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               startDate:
 *                 type: string
 *                 example: "2026-01-18"
 *     responses:
 *       200:
 *         description: Assinatura atualizada com sucesso
 *       400:
 *         description: Dados inválidos enviados pelo cliente
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Assinatura não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminSubscriptionRouter.put('/:slug/:id', authenticateJWT, requireAdminOfOrganization, editSubscription);

/**
 * @swagger
 * /api/admin/subscriptions/{slug}/{id}:
 *   delete:
 *     summary: Remove uma assinatura
 *     description: Exclui uma assinatura pertencente à organização autenticada.
 *     tags: [Assinaturas dos usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da assinatura que será removida
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização que terá a assinatura removida
 *     responses:
 *       204:
 *         description: Assinatura removida com sucesso
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Plano não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminSubscriptionRouter.delete('/:slug/:id', authenticateJWT, requireAdminOfOrganization, deleteSubscription);

/**
 * @swagger
 * /api/admin/subscriptions/{slug}/{id}/history:
 *   get:
 *     summary: Lista todo o histórico de uma assinatura
 *     description: Retorna todo o histórico de uma assinatura da organização.
 *     tags: [Assinaturas dos usuários]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da assinatura que será removida
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização que terá a assinatura removida
 *
 *     responses:
 *       200:
 *         description: Lista completa de histórico de assinaturas
 *
 *       401:
 *         description: Token inválido ou não fornecido
 *
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
adminSubscriptionRouter.get('/:slug/:id/history', authenticateJWT, requireAdminOfOrganization, listHistorySubscription);