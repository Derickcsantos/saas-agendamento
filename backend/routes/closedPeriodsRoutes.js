import Router from 'express';
import {
  getAllClosedPeriods,
  getClosedPeriodsBySlug,
  getClosedPeriodById,
  createClosedPeriod,
  updateClosedPeriod,
  deleteClosedPeriod,
} from '../controllers/closedPeriodsController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';

export const closedPeriodsRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Períodos Fechados
 *     description: Endpoints para gestão de períodos de fechamento (feriados, férias, etc.)
 */

/**
 * @swagger
 * /api/closed-periods/{slug}:
 *   get:
 *     summary: Lista todos os períodos fechados da organização
 *     tags: [Períodos Fechados]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug único da organização
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de períodos fechados da organização
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.get('/:slug', authenticateJWT, getClosedPeriodsBySlug);

/**
 * @swagger
 * /api/closed-periods/{slug}/all:
 *   get:
 *     summary: Lista todos os períodos fechados (sem autenticação)
 *     description: Retorna lista completa de períodos fechados da organização sem necessidade de autenticação. Útil para o frontend público verificar disponibilidade
 *     tags: [Períodos Fechados]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "meu-salao"
 *     responses:
 *       200:
 *         description: Lista de períodos fechados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   start_day:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-12-25T00:00:00Z"
 *                   end_day:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-12-25T23:59:59Z"
 *                   reason:
 *                     type: string
 *                     example: "Natal"
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.get('/:slug/all', getAllClosedPeriods);

/**
 * @swagger
 * /api/closed-periods/{slug}/{id}:
 *   get:
 *     summary: Obtém detalhes de um período fechado específico
 *     tags: [Períodos Fechados]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do período fechado
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dados do período fechado
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Período fechado não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.get('/:slug/:id', authenticateJWT, requireAdminOfOrganization, getClosedPeriodById);

/**
 * @swagger
 * /api/closed-periods/{slug}:
 *   post:
 *     summary: Cria um novo período fechado
 *     tags: [Períodos Fechados]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - start_day
 *               - end_day
 *             properties:
 *               start_day:
 *                 type: string
 *                 format: date-time
 *                 description: Data/hora de início do período fechado
 *               end_day:
 *                 type: string
 *                 format: date-time
 *                 description: Data/hora de término do período fechado
 *     responses:
 *       201:
 *         description: Período fechado criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token ausente ou inválido
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.post('/:slug', authenticateJWT, requireAdminOfOrganization, createClosedPeriod);

/**
 * @swagger
 * /api/closed-periods/{slug}/{id}:
 *   put:
 *     summary: Atualiza um período fechado existente
 *     tags: [Períodos Fechados]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do período fechado
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               start_day:
 *                 type: string
 *                 format: date-time
 *                 description: Nova data/hora de início
 *               end_day:
 *                 type: string
 *                 format: date-time
 *                 description: Nova data/hora de término
 *     responses:
 *       200:
 *         description: Período fechado atualizado com sucesso
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Período fechado não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.put('/:slug/:id', authenticateJWT, requireAdminOfOrganization, updateClosedPeriod);

/**
 * @swagger
 * /api/closed-periods/{slug}/{id}:
 *   delete:
 *     summary: Remove um período fechado
 *     tags: [Períodos Fechados]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do período fechado
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       204:
 *         description: Período fechado removido com sucesso
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Período fechado não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.delete('/:slug/:id', authenticateJWT, requireAdminOfOrganization, deleteClosedPeriod);
