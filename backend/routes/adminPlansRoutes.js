import { Router } from 'express'
import { createPlan, deletePlan, editPlan, listActivesPlan, listPlan } from '../controllers/adminPlansController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';

export const adminPlanRouter = Router();

/**
 * @swagger
 * /api/admin/plans/{slug}:
 *   post:
 *     summary: Cadastra um novo plano de assinatura
 *     tags: [Planos de assinatura]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: minha-barbearia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name_plansubscription
 *               - value_plansubscription
 *               - description_plansubscription
 *               - paymentinterval_plansubscription
 *               - services
 *               - isActive
 *             properties:
 *               name_plansubscription:
 *                 type: string
 *               value_plansubscription:
 *                 type: number
 *               description_plansubscription:
 *                 type: string
 *               paymentinterval_plansubscription:
 *                 type: integer
 *               services:
 *                 type: array
 *                 items:
 *                   type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Plano criado com sucesso
 */

adminPlanRouter.post('/:slug', authenticateJWT, requireAdminOfOrganization, createPlan);

/**
 * @swagger
 * /api/admin/plans/{slug}:
 *   get:
 *     summary: Lista todos os planos
 *     description: Retorna todos os planos registrados na organização.
 *     tags: [Planos de assinatura]
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
 *         description: Lista completa de planoss
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
adminPlanRouter.get('/:slug', authenticateJWT, requireAdminOfOrganization, listPlan);

/**
 * @swagger
 * /api/admin/plans/{slug}/{id}:
 *   put:
 *     summary: Atualiza os dados de um plano existente
 *     description: Atualiza os dados de um plano vinculado à organização autenticada.
 *     tags: [Planos de assinatura]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do plano que será atualizado
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização que contém plano que será atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name_plansubscription:
 *                 type: string
 *                 example: "Plano basic"
 *               value_plansubscription:
 *                 type: number
 *                 example: 120
 *               description_plansubscription:
 *                 type: string
 *                 example: "Description qualquer"
 *               paymentinterval_plansubscription:
 *                 type: number
 *                 example: 2
 *               services:
 *                 type: array
 *                 items:
 *                  type: integer
 *                 example: [ 1, 2, 3 ]
 *               isActive:
 *                  type: boolean
 *     responses:
 *       200:
 *         description: Plano atualizado com sucesso
 *       400:
 *         description: Dados inválidos enviados pelo cliente
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Plano não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminPlanRouter.put('/:slug/:id', authenticateJWT, requireAdminOfOrganization, editPlan);

/**
 * @swagger
 * /api/admin/plans/{slug}/{id}:
 *   delete:
 *     summary: Remove um plano
 *     description: Exclui um plano pertencente à organização autenticada.
 *     tags: [Planos de assinatura]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do plano que será removido
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do plano que será removido
 *     responses:
 *       204:
 *         description: Plano removido com sucesso (sem corpo de resposta)
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Plano não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminPlanRouter.delete('/:slug/:id', authenticateJWT, requireAdminOfOrganization, deletePlan);

/**
 * @swagger
 * /api/admin/plans/{slug}/form-data:
 *   get:
 *     summary: Lista todos os planos ativos
 *     description: Retorna todos os planos ativos registrados na organização.
 *     tags: [Planos de assinatura]
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
 *         description: Lista completa de planos ativos
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
adminPlanRouter.get('/:slug/form-data', authenticateJWT, requireAdminOfOrganization, listActivesPlan)