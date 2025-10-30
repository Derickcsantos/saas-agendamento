
/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "João Silva"
 *         email:
 *           type: string
 *           format: email
 *           example: "joao@exemplo.com"
 *         phone:
 *           type: string
 *           example: "11999998888"
 *         comissao:
 *           type: number
 *           format: float
 *           example: 10.5
 *         imagem_funcionario:
 *           type: string
 *           description: Imagem em base64 ou data URL
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *         is_active:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * 
 *     EmployeeWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/Employee'
 *         - type: object
 *           properties:
 *             services:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Corte de Cabelo"
 *             work_schedules:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkSchedule'
 * 
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
 *           example: "09:00:00"
 *         end_time:
 *           type: string
 *           format: time
 *           example: "18:00:00"
 *         is_available:
 *           type: boolean
 */