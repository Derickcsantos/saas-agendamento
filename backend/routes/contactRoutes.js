import express from "express";
import { confirmedAppointmentWhatsApp } from "../controllers/contatosController.js";

export const contactRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Contatos
 *     description: Endpoints para envio de mensagens e confirmações via WhatsApp
 */

/**
 * @swagger
 * /api/contato/whatsapp/confirmedAppointment:
 *   post:
 *     summary: Envia confirmação de agendamento via WhatsApp
 *     description: Envia uma mensagem de confirmação automática via WhatsApp quando um agendamento é criado
 *     tags: [Contatos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - clientName
 *               - date
 *               - time
 *               - service
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Número de telefone do cliente (com código do país)
 *                 example: "5511999998888"
 *               clientName:
 *                 type: string
 *                 description: Nome do cliente
 *                 example: "João Silva"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Data do agendamento
 *                 example: "2025-01-30"
 *               time:
 *                 type: string
 *                 description: Horário do agendamento
 *                 example: "14:30"
 *               service:
 *                 type: string
 *                 description: Nome do serviço agendado
 *                 example: "Corte de Cabelo"
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
 *                   example: "Confirmação enviada com sucesso"
 *       400:
 *         description: Dados inválidos ou faltando
 *       500:
 *         description: Erro ao enviar mensagem
 */
contactRouter.post(
  "/whatsapp/confirmedAppointment",
  confirmedAppointmentWhatsApp
);

