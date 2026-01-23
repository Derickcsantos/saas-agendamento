import express from "express";
import {
  abacatePayPixWebhook,
  createPixPayment,
  requestWithdrawal
} from "../controllers/organizationsPaymentsController.js";

export const organizationsPaymentsRouter = express.Router();

/**
 * @swagger
 * /api/payments/{slug}/pix:
 *   post:
 *     summary: Gera QR Code PIX para pagamento
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *               appointment_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: QR Code gerado
 */
organizationsPaymentsRouter.post(
  "/:slug/pix",
  createPixPayment
);


organizationsPaymentsRouter.post(
  "/webhooks/abacatepay/pix",
  express.json({ type: "*/*" }), 
  abacatePayPixWebhook
);

/**
 * @swagger
 * /api/payments/{slug}/withdraw:
 *   post:
 *     summary: Solicita saque PIX
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, pix_key, pix_key_type]
 *             properties:
 *               amount:
 *                 type: number
 *               pix_key:
 *                 type: string
 *               pix_key_type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Saque registrado
 */
organizationsPaymentsRouter.post(
  "/:slug/withdraw",
  requestWithdrawal
);

