/**
 * @swagger
 * components:
 *   schemas:
 *     WorkSchedule:
 *       type: object
 *       description: Agenda de trabalho de um funcionário
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         employee_id:
 *           type: integer
 *           description: ID do funcionário
 *           example: 3
 *         day_of_week:
 *           type: integer
 *           description: Dia da semana (0 = Domingo, 6 = Sábado)
 *           example: 1
 *         start_time:
 *           type: string
 *           format: time
 *           description: Horário de início
 *           example: "09:00:00"
 *         end_time:
 *           type: string
 *           format: time
 *           description: Horário de término
 *           example: "18:00:00"
 *         is_available:
 *           type: boolean
 *           description: Indica se o funcionário está disponível nesse dia
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação do horário
 *           example: "2023-01-01T08:00:00Z"
 * 
 *     WorkScheduleWithEmployee:
 *       description: Agenda de trabalho com dados básicos do funcionário
 *       allOf:
 *         - $ref: '#/components/schemas/WorkSchedule'
 *         - type: object
 *           properties:
 *             employees:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "João Silva"
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "joao@exemplo.com"
 * 
 *     FormattedWorkSchedule:
 *       type: object
 *       description: Agenda de trabalho formatada para exibição
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         employee_id:
 *           type: integer
 *           example: 3
 *         day_of_week:
 *           type: integer
 *           example: 1
 *         day:
 *           type: string
 *           description: Nome do dia da semana
 *           example: "Segunda-feira"
 *         start_time:
 *           type: string
 *           description: Horário inicial formatado (HH:MM)
 *           example: "09:00"
 *         end_time:
 *           type: string
 *           description: Horário final formatado (HH:MM)
 *           example: "18:00"
 *         is_available:
 *           type: boolean
 *           example: true
 */