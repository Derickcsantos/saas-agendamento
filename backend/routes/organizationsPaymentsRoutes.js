import express from "express";
import {
  abacatePayPixWebhook,
  createPixPayment,
  requestWithdrawal,
  getAvailableBalance,
  getIncomeHistory,
} from "../controllers/organizationsPaymentsController.js";

export const organizationsPaymentsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Gerenciamento de pagamentos e transações financeiras das organizações
 */

/**
 * @swagger
 * /api/payments/{slug}/pix:
 *   post:
 *     summary: Gera QR Code PIX para pagamento
 *     description: Cria uma cobrança PIX e retorna o QR Code para pagamento
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "meu-salao"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Valor a ser cobrado em reais
 *                 example: 50.00
 *               appointment_id:
 *                 type: string
 *                 description: ID do agendamento relacionado (opcional)
 *                 example: "123"
 *     responses:
 *       201:
 *         description: QR Code PIX gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode:
 *                   type: string
 *                   description: Código do QR Code PIX
 *                 qrCodeImage:
 *                   type: string
 *                   description: Imagem do QR Code em base64
 *                 pixKey:
 *                   type: string
 *                 transactionId:
 *                   type: string
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao gerar QR Code
 */
organizationsPaymentsRouter.post(
  "/:slug/pix",
  createPixPayment
);

/**
 * @swagger
 * /api/payments/{slug}/balance:
 *   get:
 *     summary: Obtém saldo disponível da organização
 *     description: Retorna o saldo atual disponível para saque
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Saldo disponível
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 availableBalance:
 *                   type: number
 *                   example: 1500.50
 *                 pendingBalance:
 *                   type: number
 *                   example: 250.00
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro ao buscar saldo
 */
organizationsPaymentsRouter.get(
  "/:slug/balance",
  getAvailableBalance
);

/**
 * @swagger
 * /api/payments/{slug}/history:
 *   get:
 *     summary: Obtém histórico de transações
 *     description: Retorna o histórico completo de entradas e saídas financeiras da organização
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do período
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do período
 *         example: "2025-01-31"
 *     responses:
 *       200:
 *         description: Histórico de transações
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [income, withdrawal]
 *                   amount:
 *                     type: number
 *                   date:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *                   description:
 *                     type: string
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro ao buscar histórico
 */
organizationsPaymentsRouter.get(
  "/:slug/history",
  getIncomeHistory
);

/**
 * @swagger
 * /api/payments/webhooks/abacatepay/pix:
 *   post:
 *     summary: Webhook do AbacatePay para pagamentos PIX
 *     description: Recebe notificações de confirmação de pagamentos PIX via AbacatePay
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload do webhook enviado pelo AbacatePay
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao processar webhook
 */
organizationsPaymentsRouter.post(
  "/webhooks/abacatepay/pix",
  express.json({ type: "*/*" }), 
  abacatePayPixWebhook
);

/**
 * @swagger
 * /api/payments/{slug}/withdraw:
 *   post:
 *     summary: Solicita saque via PIX
 *     description: Cria uma solicitação de saque do saldo disponível para uma chave PIX
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - pix_key
 *               - pix_key_type
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Valor do saque em reais
 *                 example: 500.00
 *               pix_key:
 *                 type: string
 *                 description: Chave PIX de destino
 *                 example: "11999998888"
 *               pix_key_type:
 *                 type: string
 *                 enum: [cpf, cnpj, email, phone, random]
 *                 description: Tipo da chave PIX
 *                 example: "phone"
 *     responses:
 *       201:
 *         description: Saque solicitado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, completed, failed]
 *                 amount:
 *                   type: number
 *                 requestedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Saldo insuficiente ou dados inválidos
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro ao processar saque
 */
organizationsPaymentsRouter.post(
  "/:slug/withdraw",
  requestWithdrawal
);

