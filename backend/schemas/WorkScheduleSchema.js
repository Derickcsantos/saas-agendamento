
/**
 * @swagger
 * components:
 *   schemas:
 *     WorkSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         day_of_week:
 *           type: integer
 *           description: 0-6 (Domingo-Sábado)
 *         start_time:
 *           type: string
 *           format: time
 *         end_time:
 *           type: string
 *           format: time
 *         is_available:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 * 
 *     WorkScheduleWithEmployee:
 *       allOf:
 *         - $ref: '#/components/schemas/WorkSchedule'
 *         - type: object
 *           properties:
 *             employees:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 * 
 *     FormattedWorkSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         day_of_week:
 *           type: integer
 *         day:
 *           type: string
 *           description: Nome do dia da semana
 *         start_time:
 *           type: string
 *           description: Hora formatada (HH:MM)
 *         end_time:
 *           type: string
 *           description: Hora formatada (HH:MM)
 *         is_available:
 *           type: boolean
 */
