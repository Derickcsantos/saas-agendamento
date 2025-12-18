import { checkWhatsappHealth } from "../controllers/checkHealthController.js";
import { Router } from 'express'

export const checkHealthRouter = Router()

/**
 * @swagger
 * /api/whatsapp-health:
 *   get:
 *     summary: Verifica o estado de conexão com o cliente WhatsApp
 *     description: Retorna o status geral da API e a situação da conexão com o cliente WhatsApp.
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: Cliente WhatsApp conectado e API funcionando normalmente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 whatsapp:
 *                   type: string
 *                   example: "connected"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Cliente WhatsApp não está conectado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 *                 whatsapp:
 *                   type: string
 *                   example: "disconnected"
 *       500:
 *         description: Erro interno ao verificar o estado do cliente WhatsApp
 */
checkHealthRouter.get('/whatsapp-health', checkWhatsappHealth)