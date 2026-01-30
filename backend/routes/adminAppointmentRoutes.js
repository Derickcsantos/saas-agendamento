import { Router } from 'express';
import { 
  getAdminAppointments, 
  getAdminAppointmentById, 
  updateAdminAppointmentToCompleted, 
  updateAdminAppointmentToCompletedYesterday,
  updateAdminAppointment,
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
 * /api/admin/appointments/{slug}/{id}/cancel:
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
adminAppointmentRouter.put('/:slug/:id', authenticateJWT, requireAdminOfOrganization, updateAdminAppointment);

/**
 * @swagger
 * /api/admin/appointments/{slug}/{id}/complete:
 *   put:
 *     summary: Marca agendamento como concluído (admin)
 *     tags: [Agendamentos]
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do agendamento a ser marcado como concluído
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *
 *     responses:
 *       200:
 *         description: Agendamento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *
 *       400:
 *         description: O agendamento já está concluído ou cancelado
 *
 *       404:
 *         description: Agendamento não encontrado
 *
 *       500:
 *         description: Erro interno do servidor
 */
adminAppointmentRouter.put('/:slug/:id/complete', authenticateJWT, requireAdminOfOrganization, updateAdminAppointmentToCompleted);

/**
 * @swagger
 * /api/admin/appointments/complete-yesterday:
 *   put:
 *     summary: Marca como concluídos todos os agendamentos de ontem
 *     description: Atualiza automaticamente o status de todos os agendamentos do dia anterior para "concluído"
 *     tags: [Agendamentos]
 *     responses:
 *       200:
 *         description: Agendamentos atualizados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 updated:
 *                   type: integer
 *                   description: Número de agendamentos atualizados
 *                   example: 15
 *       500:
 *         description: Erro ao atualizar agendamentos
 */
adminAppointmentRouter.put('/complete-yesterday', updateAdminAppointmentToCompletedYesterday);


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

/**
 * @swagger
 * /api/admin/appointments/canceled_appointments:
 *   get:
 *     summary: Lista todos os agendamentos cancelados
 *     tags: [Agendamentos]
 *     responses:
 *       200:
 *         description: Lista de agendamentos cancelados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   client_name:
 *                     type: string
 *                   service:
 *                     type: string
 *                   professional:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date
 *                   start_time:
 *                     type: string
 *                   end_time:
 *                     type: string
 *                   status:
 *                     type: string
 *                     example: canceled
 *       500:
 *         description: Erro interno do servidor
 */
adminAppointmentRouter.get('/canceled_appointments', getCancelledAppointments)