import { Router } from 'express'
import { getAvailableTimes } from '../controllers/availableTimesController.js'
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js'

export const availableTimesRouter = Router()

/**
 * @swagger
 * /api/available-times/{slug}:
 *   get:
 *     summary: Consulta horários disponíveis para agendamento
 *     tags: [Agendamento]
 *     description: |
 *       Retorna os horários disponíveis para agendamento considerando:
 *       - O funcionário selecionado
 *       - A data informada
 *       - A duração do serviço selecionado
 *       - Os horários de trabalho e horários indisponíveis
 * 
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador da organização
 *         example: "meu-salao"
 * 
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *         example: 3
 * 
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data para consulta (YYYY-MM-DD)
 *         example: "2025-03-10"
 * 
 *       - in: query
 *         name: duration
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duração do serviço em minutos
 *         example: 45
 * 
 *     responses:
 *       200:
 *         description: Lista de horários disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: time
 *                     example: "14:00"
 *                   end:
 *                     type: string
 *                     format: time
 *                     example: "14:45"
 * 
 *       400:
 *         description: Parâmetros inválidos ou faltando
 *       500:
 *         description: Erro interno do servidor
 */
availableTimesRouter.get('/:slug', getAvailableTimes)