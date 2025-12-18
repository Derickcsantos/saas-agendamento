import Router from 'express'
import { sendWhatsappConfirmation } from '../controllers/whatsappController.js'

export const whatsappRouter = Router()


/**
 * @swagger
 * /api/whatsapp/confirmation/{slug}:
 *   post:
 *     summary: Envia mensagem de confirmação de agendamento via WhatsApp
 *     description: |
 *       Envia uma mensagem de confirmação de agendamento para o cliente
 *       utilizando o WhatsApp da organização informada.
 *     tags: [Whatsapp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "barbearia-do-joao"
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
 *                     format: date
 *                     example: "2025-06-10"
 *                   time:
 *                     type: string
 *                     example: "14:00"
 *     responses:
 *       200:
 *         description: Mensagem enviada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mensagem enviada com sucesso"
 *       400:
 *         description: Dados inválidos ou incompletos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao enviar mensagem via WhatsApp
 */
whatsappRouter.post('/', sendWhatsappConfirmation)