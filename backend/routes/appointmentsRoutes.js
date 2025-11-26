import { Router } from 'express';
import { createAppointment, getAppointmentsByEmployee} from '../controllers/appointmentsController.js';
import { extractOrganizationId } from '../middlewares/authMiddleware.js';

export const appointmentsRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Agendamentos
 *     description: Endpoints para gestão de agendamentos
 */

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Cria um novo agendamento
 *     tags: [Agendamentos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_name
 *               - client_email
 *               - client_phone
 *               - service_id
 *               - employee_id
 *               - date
 *               - start_time
 *               - end_time
 *             properties:
 *               client_name:
 *                 type: string
 *                 example: "João Silva"
 *               client_email:
 *                 type: string
 *                 format: email
 *                 example: "joao@exemplo.com"
 *               client_phone:
 *                 type: string
 *                 example: "11999998888"
 *               service_id:
 *                 type: integer
 *                 example: 1
 *               employee_id:
 *                 type: integer
 *                 example: 2
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2023-12-25"
 *               start_time:
 *                 type: string
 *                 format: time
 *                 example: "14:30"
 *               end_time:
 *                 type: string
 *                 format: time
 *                 example: "15:00"
 *               final_price:
 *                 type: number
 *                 example: 80.50
 *               coupon_code:
 *                 type: string
 *                 example: "DESCONTO10"
 *               original_price:
 *                 type: number
 *                 example: 90.00
 *     responses:
 *       201:
 *         description: Agendamento criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       500:
 *         description: Erro interno do servidor
 */
appointmentsRouter.post('/:slug', createAppointment);

appointmentsRouter.get('/by-employee/:userId', getAppointmentsByEmployee)