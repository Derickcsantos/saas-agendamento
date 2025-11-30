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
 *     summary: Relatório de receitas detalhado
 *     description: |
 *       Retorna um relatório completo de receitas, incluindo:
 *       - Total de agendamentos
 *       - Faturamento total
 *       - Comissões totais
 *       - Detalhes por funcionário (faturamento, comissões e lucro líquido)
 *     tags: [Relatórios]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do período (YYYY-MM-DD)
 *         example: "2023-01-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do período (YYYY-MM-DD)
 *         example: "2023-12-31"
 *     responses:
 *       200:
 *         description: Relatório de receitas retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: string
 *                   description: Período analisado
 *                   example: "2023-01-01 a 2023-12-31"
 *                 total_appointments:
 *                   type: integer
 *                   description: Número total de agendamentos
 *                   example: 150
 *                 total_revenue:
 *                   type: number
 *                   format: float
 *                   description: Faturamento total no período
 *                   example: 12500.50
 *                 total_commissions:
 *                   type: number
 *                   format: float
 *                   description: Total de comissões a pagar
 *                   example: 2500.10
 *                 details:
 *                   type: array
 *                   description: Detalhamento por funcionário
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID do funcionário
 *                       name:
 *                         type: string
 *                         description: Nome do funcionário
 *                       commission_rate:
 *                         type: number
 *                         description: Percentual de comissão
 *                       appointments_count:
 *                         type: integer
 *                         description: Número de agendamentos
 *                       total_revenue:
 *                         type: number
 *                         description: Faturamento gerado
 *                       commission_value:
 *                         type: number
 *                         description: Valor da comissão
 *                       net_profit:
 *                         type: number
 *                         description: Lucro líquido (faturamento - comissão)
 *       500:
 *         description: Erro interno do servidor
 */
revenueRouter.get('/:slug', authenticateJWT, requireAdminOfOrganization, getRevenues)


/**
 * @swagger
 * /api/admin/revenue/export:
 *   get:
 *     summary: Exporta relatório de receitas em Excel
 *     description: Gera um arquivo Excel com o mesmo relatório da rota principal
 *     tags: [Relatórios]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do período (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do período (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Arquivo Excel gerado com sucesso
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Erro interno do servidor
 */
revenueRouter.get('/export', authenticateJWT, requireAdminOfOrganization, exportRevenue)