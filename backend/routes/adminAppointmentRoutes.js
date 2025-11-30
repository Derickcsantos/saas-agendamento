import { Router } from 'express';
import { 
  getAdminAppointments, 
  getAdminAppointmentById, 
  updateAdminAppointmentToCompleted, 
  updateAdminAppointmentToCompletedYesterday,
  updateAdminAppointmentToCanceled,
  getAdminAppointmentsByEmployee,
  getCancelledAppointments
} from '../controllers/adminAppointmentsController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';

export const adminAppointmentRouter = Router();

/**
 * @swagger
 * /api/admin/appointments:
 *   get:
 *     summary: Lista completa de agendamentos com filtros (admin)
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Busca por nome, e-mail ou telefone do cliente
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           pattern: '^\d{2}-\d{2}-\d{4}$'
 *         description: Data no formato DD-MM-YYYY
 *       - in: query
 *         name: employee
 *         schema:
 *           type: string
 *         description: Nome do profissional
 *     responses:
 *       200:
 *         description: Lista filtrada de agendamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AppointmentWithDetails'
 *       500:
 *         description: Erro interno do servidor
 */
adminAppointmentRouter.get('/:slug', authenticateJWT, requireAdminOfOrganization, getAdminAppointments);


/**
 * @swagger
 * /api/admin/appointments/{id}:
 *   get:
 *     summary: Detalhes de um agendamento específico
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes completos do agendamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 client_name:
 *                   type: string
 *                 service:
 *                   type: string
 *                 professional:
 *                   type: string
 *                 date:
 *                   type: string
 *                   format: date
 *                 start_time:
 *                   type: string
 *                 end_time:
 *                   type: string
 *                 status:
 *                   type: string
 *                 price:
 *                   type: number
 *       404:
 *         description: Agendamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminAppointmentRouter.get('/:slug/:id', authenticateJWT, requireAdminOfOrganization, getAdminAppointmentById);

/**
 * @swagger
 * /api/admin/appointments/{id}/complete:
 *   put:
 *     summary: Marca agendamento como concluído
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agendamento atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Agendamento já concluído ou cancelado
 *       404:
 *         description: Agendamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminAppointmentRouter.put('/:id/complete', authenticateJWT, updateAdminAppointmentToCompleted);


adminAppointmentRouter.put('/complete-yesterday', updateAdminAppointmentToCompletedYesterday);

/**
 * @swagger
 * /api/admin/appointments/{id}/cancel:
 *   put:
 *     summary: Cancela um agendamento
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agendamento cancelado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Agendamento já concluído ou cancelado
 *       404:
 *         description: Agendamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminAppointmentRouter.put('/:id/cancel', updateAdminAppointmentToCanceled);

/**
 * @swagger
 * /api/admin/appointments/by-employee:
 *   get:
 *     summary: Contagem de agendamentos por funcionário (dashboard admin)
 *     tags: [Agendamentos]
 *     responses:
 *       200:
 *         description: Lista ordenada por quantidade de agendamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   employee_id:
 *                     type: integer
 *                   employee_name:
 *                     type: string
 *                   count:
 *                     type: integer
 *                     description: Número de agendamentos confirmados
 *       500:
 *         description: Erro interno do servidor
 */
adminAppointmentRouter.get('/by-employee', authenticateJWT, getAdminAppointmentsByEmployee);

adminAppointmentRouter.get('/canceled_appointments', getCancelledAppointments)