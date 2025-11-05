import { checkWhatsappHealth } from "../controllers/checkHealthController.js";
import { Router } from 'express'

export const checkHealthRouter = Router()

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica o estado da aplicação
 *     description: Retorna o status da API e do cliente WhatsApp.
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: Sistema está saudável
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Cliente WhatsApp não conectado
 */
checkHealthRouter.get('/whatsapp-health', checkWhatsappHealth)