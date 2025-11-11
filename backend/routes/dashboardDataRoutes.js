import { Router } from 'express'
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js'
import { getDashboardData } from '../controllers/dashboardDataController.js'

export const dashboardDataRouter = Router()

/**
 * @swagger
 * tags:
 *   - name: Dashboard
 *     description: Endpoints para dados do painel administrativo
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Obtém dados consolidados para o painel administrativo
 *     description: |
 *       Retorna métricas e dados estatísticos para exibição no dashboard administrativo,
 *       incluindo contagens totais, distribuições e dados para gráficos.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dados do dashboard retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEmployees:
 *                   type: integer
 *                   description: Número total de funcionários cadastrados
 *                   example: 15
 *                 totalCategories:
 *                   type: integer
 *                   description: Número total de categorias cadastradas
 *                   example: 5
 *                 totalServices:
 *                   type: integer
 *                   description: Número total de serviços cadastrados
 *                   example: 25
 *                 totalAppointments:
 *                   type: integer
 *                   description: Número total de agendamentos confirmados
 *                   example: 120
 *                 monthlyAppointments:
 *                   type: array
 *                   description: Contagem de agendamentos por mês (índices 0-11 representando Janeiro-Dezembro)
 *                   items:
 *                     type: integer
 *                   example: [10, 12, 15, 8, 5, 12, 18, 20, 10, 5, 8, 7]
 *                 employeesStatus:
 *                   type: object
 *                   description: Distribuição de funcionários por status
 *                   properties:
 *                     active:
 *                       type: integer
 *                       example: 12
 *                     inactive:
 *                       type: integer
 *                       example: 3
 *                 usersDistribution:
 *                   type: object
 *                   description: Distribuição de usuários por tipo
 *                   properties:
 *                     admin:
 *                       type: integer
 *                       example: 3
 *                     comum:
 *                       type: integer
 *                       example: 45
 *                 couponsStatus:
 *                   type: object
 *                   description: Distribuição de cupons por status
 *                   properties:
 *                     active:
 *                       type: integer
 *                       example: 8
 *                     inactive:
 *                       type: integer
 *                       example: 5
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp da última atualização dos dados
 *                   example: "2023-08-15T14:30:00.000Z"
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
dashboardDataRouter.get('/:slug', authenticateJWT, getDashboardData)