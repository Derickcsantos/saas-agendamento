import { Router } from 'express'
import { sendEmailConfirmation } from '../controllers/emailController.js'

export const emailRouter = Router()

/**
 * @swagger
 * /api/send-confirmation-email:
 *   post:
 *     summary: Enviar e-mail de confirmação
 *     description: Envia um e-mail com assunto e corpo personalizados.
 *     tags:
 *       - Notificações
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - subject
 *               - body
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: cliente@exemplo.com
 *               subject:
 *                 type: string
 *                 example: Confirmação de Agendamento
 *               body:
 *                 type: string
 *                 example: "<p>Olá! Seu agendamento está confirmado.</p>"
 *     responses:
 *       200:
 *         description: E-mail enviado com sucesso
 *       500:
 *         description: Erro ao enviar e-mail
 */
emailRouter.post('/', sendEmailConfirmation)