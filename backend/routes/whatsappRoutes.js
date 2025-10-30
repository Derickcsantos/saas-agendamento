import Router from 'express'
import { sendWhatsappConfirmation } from '../controllers/whatsappController.js'

export const whatsappRouter = Router()


/**
 * @swagger
 * /api/send-whatsapp-confirmation:
 *   post:
 *     summary: Enviar mensagem de confirmação via WhatsApp
 *     description: Envia uma mensagem de confirmação de agendamento para o cliente via WhatsApp.
 *     tags:
 *       - Whatsapp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientPhone
 *               - appointmentDetails
 *             properties:
 *               clientPhone:
 *                 type: string
 *                 example: "11987654321"
 *               appointmentDetails:
 *                 type: object
 *                 required:
 *                   - service
 *                   - professional
 *                   - date
 *                   - time
 *                 properties:
 *                   service:
 *                     type: string
 *                     example: "Corte de Cabelo"
 *                   professional:
 *                     type: string
 *                     example: "Maria Silva"
 *                   date:
 *                     type: string
 *                     example: "2025-06-10"
 *                   time:
 *                     type: string
 *                     example: "14:00"
 *     responses:
 *       200:
 *         description: Mensagem enviada com sucesso
 *       400:
 *         description: Dados incompletos
 *       500:
 *         description: Erro ao enviar mensagem via WhatsApp
 */
whatsappRouter.post('/', sendWhatsappConfirmation)