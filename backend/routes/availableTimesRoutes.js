import { Router } from 'express'
import { getAvailableTimes } from '../controllers/availableTimesController.js'
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js'

export const availableTimesRouter = Router()

/**
 * @swagger
 * /api/available-times:
 *   get:
 *     summary: Consulta horários disponíveis para agendamento
 *     description: |
 *       Retorna os horários disponíveis para agendamento considerando:
 *       - O horário de trabalho do funcionário
 *       - Os compromissos já marcados
 *       - A duração do serviço selecionado
 *     tags: [Agendamento]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *         example: 3
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data para consulta (formato YYYY-MM-DD)
 *         example: "2023-12-25"
 *       - in: query
 *         name: duration
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duração do serviço em minutos
 *         example: 30
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
 *                     description: Hora de início (HH:MM)
 *                     example: "14:30"
 *                   end:
 *                     type: string
 *                     format: time
 *                     description: Hora de término (HH:MM)
 *                     example: "15:00"
 *       400:
 *         description: Parâmetros inválidos ou faltando
 *       500:
 *         description: Erro interno do servidor
 */
availableTimesRouter.get('/', extractOrganizationId, getAvailableTimes)