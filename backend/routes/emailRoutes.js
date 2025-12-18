import { Router } from 'express'
import { sendEmailConfirmation } from '../controllers/emailController.js'

export const emailRouter = Router()

/**
 * @swagger
 * /api/send-confirmation-email:
 *   post:
 *     summary: Envia um e-mail de confirmação
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
 *                 example: "cliente@exemplo.com"
 *                 description: Endereço de e-mail do destinatário.
 *               subject:
 *                 type: string
 *                 example: "Confirmação de Agendamento"
 *                 description: Assunto do e-mail.
 *               body:
 *                 type: string
 *                 example: "<p>Olá! Seu agendamento está confirmado.</p>"
 *                 description: Corpo do e-mail em HTML ou texto puro.
 *     responses:
 *       200:
 *         description: E-mail enviado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "E-mail enviado com sucesso."
 *       500:
 *         description: Erro ao enviar o e-mail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Falha ao enviar o e-mail."
 */
emailRouter.post('/', sendEmailConfirmation)