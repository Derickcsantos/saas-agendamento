import { Router } from 'express'
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js'
import { getRevenues, exportRevenue } from '../controllers/revenueController.js'
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js'

export const revenueRouter = Router()


/**
 * @swagger
 * tags:
 *   - name: Relatórios
 *     description: Endpoints para geração de relatórios financeiros
 */

/**
 * @swagger
 * /api/admin/revenue/{slug}:
 *   get:
 *     summary: Relatório de receitas detalhado por organização
 *     description: |
 *       Retorna um relatório financeiro completo da organização informada pelo slug.
 *       Requer autenticação administrativa.
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug público da organização
 *         example: "time-cut-barber"
 *       - in: query
 *         name: start_date
 *         schema:
	@@ -49,49 +55,37 @@ export const revenueRouter = Router()
 *               properties:
 *                 period:
 *                   type: string
 *                   example: "2023-01-01 a 2023-12-31"
 *                 total_appointments:
 *                   type: integer
 *                   example: 150
 *                 total_revenue:
 *                   type: number
 *                   example: 12500.5
 *                 total_commissions:
 *                   type: number
 *                   example: 2500.1
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       commission_rate:
 *                         type: number
 *                       appointments_count:
 *                         type: integer
 *                       total_revenue:
 *                         type: number
 *                       commission_value:
 *                         type: number
 *                       net_profit:
 *                         type: number
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
revenueRouter.get('/:slug', authenticateJWT, requireAdminOfOrganization, getRevenues)

/**
 * @swagger
 * /api/admin/revenue/export:
 *   get:
 *     summary: Exporta relatório de receitas em Excel
 *     description: |
 *       Gera um arquivo Excel com o relatório financeiro da organização
 *       identificada pelo token JWT.
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         example: "2023-01-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         example: "2023-12-31"
 *     responses:
 *       200:
 *         description: Arquivo Excel gerado com sucesso
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
revenueRouter.get('/:slug/export', authenticateJWT, requireAdminOfOrganization, exportRevenue)