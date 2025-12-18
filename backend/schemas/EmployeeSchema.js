/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       description: Representa um funcionário da organização
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           description: Nome completo do funcionário
 *           example: "João Silva"
 *         email:
 *           type: string
 *           format: email
 *           description: E-mail do funcionário
 *           example: "joao@exemplo.com"
 *         phone:
 *           type: string
 *           description: Telefone de contato
 *           example: "11999998888"
 *         comissao:
 *           type: number
 *           format: float
 *           description: Percentual de comissão do funcionário
 *           example: 10.5
 *         imagem_funcionario:
 *           type: string
 *           nullable: true
 *           description: Imagem do funcionário em base64 ou data URL
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *         is_active:
 *           type: boolean
 *           description: Indica se o funcionário está ativo
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação do registro
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data da última atualização
 * 
 *     EmployeeWithDetails:
 *       description: Funcionário com serviços e horários de trabalho
 *       allOf:
 *         - $ref: '#/components/schemas/Employee'
 *         - type: object
 *           properties:
 *             services:
 *               type: array
 *               description: Lista de serviços que o funcionário realiza
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Corte de Cabelo"
 *                   price:
 *                     type: number
 *                     format: float
 *                     example: 35.90
 *             work_schedules:
 *               type: array
 *               description: Horários de trabalho do funcionário
 *               items:
 *                 $ref: '#/components/schemas/WorkSchedule'
 * 
 *     WorkSchedule:
 *       type: object
 *       description: Horário de trabalho do funcionário
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         employee_id:
 *           type: integer
 *           description: ID do funcionário
 *           example: 1
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
 *           description: Indica se o funcionário trabalha nesse horário
 *           example: true
 */