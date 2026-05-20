import { Router } from 'express'
import {
  cancelLoggedInUserAppointment,
  getLoggedInUserAppointments,
} from '../controllers/loggedInUserController.js'
import { authenticateJWT } from '../middlewares/authMiddleware.js'

export const loggedInUserRouter = Router()

/**
 * @swagger
 * /api/logado/appointments:
 *   get:
 *     summary: Lista agendamentos de um cliente (por e-mail)
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: E-mail do cliente
 *     responses:
 *       200:
 *         description: Lista de agendamentos formatada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   date:
 *                     type: string
 *                     format: date
 *                   start_time:
 *                     type: string
 *                   end_time:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [confirmed, completed, canceled]
 *                   service_name:
 *                     type: string
 *                   service_price:
 *                     type: number
 *                   professional_name:
 *                     type: string
 *       500:
 *         description: Erro interno do servidor
 */
loggedInUserRouter.get('/appointments', authenticateJWT, getLoggedInUserAppointments)
loggedInUserRouter.delete('/:slug/appointments/:id', authenticateJWT, cancelLoggedInUserAppointment)
