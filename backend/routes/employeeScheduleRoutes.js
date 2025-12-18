import { Router } from 'express'
import { 
  getSchedules,
  getScheduleByEmployeeId,
  createSchedule,
  updateSchedule,
  deleteAllSchedulesFromEmployee,
  deleteOnlyOneSchedule
} from '../controllers/employeeSchedulesController.js'

export const employeeScheduleRouter = Router()

/**
 * @swagger
 * tags:
 *   - name: Escalas de Trabalho
 *     description: Endpoints para gestão de horários e escalas de funcionários
 */

/**
 * @swagger
 * /api/admin/schedules/{slug}:
 *   get:
 *     summary: Lista todas as escalas de trabalho de uma organização
 *     description: Retorna todos os horários cadastrados, incluindo informações dos funcionários vinculados.
 *     tags: [Escalas de Trabalho]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização para filtragem das escalas
 *     responses:
 *       200:
 *         description: Lista de escalas de trabalho retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkScheduleWithEmployee'
 *       500:
 *         description: Erro interno do servidor
 */
employeeScheduleRouter.get('/:slug', getSchedules)

/**
 * @swagger
 * /api/admin/schedules/{slug}/{employee_id}:
 *   get:
 *     summary: Obtém a escala de um funcionário específico
 *     description: Retorna todos os horários cadastrados para um funcionário, com dias formatados.
 *     tags: [Escalas de Trabalho]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário cujo horário será retornado
 *     responses:
 *       200:
 *         description: Lista de horários do funcionário
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FormattedWorkSchedule'
 *       500:
 *         description: Erro interno do servidor
 */
employeeScheduleRouter.get('/:slug/:employee_id', getScheduleByEmployeeId)

/**
 * @swagger
 * /schedules:
 *   post:
 *     summary: Cria um novo horário na escala
 *     tags: [Escalas de Trabalho]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - day_of_week
 *               - start_time
 *               - end_time
 *             properties:
 *               employee_id:
 *                 type: integer
 *                 description: ID do funcionário
 *                 example: 1
 *               day_of_week:
 *                 type: string
 *                 description: Dia da semana (0-6 ou nome)
 *                 example: "Segunda-feira"
 *               start_time:
 *                 type: string
 *                 description: Hora de início (HH:MM ou HH:MM:SS)
 *                 example: "09:00"
 *               end_time:
 *                 type: string
 *                 description: Hora de término (HH:MM ou HH:MM:SS)
 *                 example: "18:00"
 *               is_available:
 *                 type: boolean
 *                 description: Se o horário está disponível
 *                 example: true
 *     responses:
 *       201:
 *         description: Horário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkSchedule'
 *       400:
 *         description: Dados inválidos ou incompletos
 *       500:
 *         description: Erro interno do servidor
 */
employeeScheduleRouter.post('/:slug', createSchedule)

/**
 * @swagger
 * /schedules/{employee_id}:
 *   put:
 *     summary: Atualiza toda a escala de um funcionário
 *     description: Substitui completamente os horários de um funcionário
 *     tags: [Escalas de Trabalho]
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - day_of_week
 *                 - start_time
 *                 - end_time
 *               properties:
 *                 day_of_week:
 *                   type: integer
 *                   description: Dia da semana (0-6)
 *                   example: 1
 *                 start_time:
 *                   type: string
 *                   description: Hora de início
 *                   example: "09:00:00"
 *                 end_time:
 *                   type: string
 *                   description: Hora de término
 *                   example: "17:00:00"
 *     responses:
 *       200:
 *         description: Escala atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Dados inválidos ou funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
employeeScheduleRouter.put('/:slug/:employee_id', updateSchedule)

/**
 * @swagger
 * /schedules/employees/{employee_id}:
 *   delete:
 *     summary: Remove todos os horários de um funcionário
 *     tags: [Escalas de Trabalho]
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     responses:
 *       204:
 *         description: Horários removidos com sucesso
 *       500:
 *         description: Erro interno do servidor
 */
employeeScheduleRouter.delete('/:slug/:employee_id', deleteAllSchedulesFromEmployee)

/**
 * @swagger
 * /schedules/{id}:
 *   delete:
 *     summary: Remove um horário específico
 *     tags: [Escalas de Trabalho]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do horário
 *     responses:
 *       204:
 *         description: Horário removido com sucesso
 *       500:
 *         description: Erro interno do servidor
 */
employeeScheduleRouter.delete('/:id', deleteOnlyOneSchedule)
