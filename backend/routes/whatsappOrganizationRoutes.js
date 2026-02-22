import { Router } from 'express';
import {
  getWhatsappStatus,
  connectWhatsapp,
  disconnectWhatsapp,
  getContacts,
  getContactInfo,
  updateContactInfo,
  sendMessage,
  sendBulkMessages,
  getStatistics,
  getQRCode
} from '../controllers/whatsappOrganizationController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';
import requireActiveSubscription from '../middlewares/requireActiveSubscription.js';

export const whatsappOrganizationRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: WhatsApp Organization
 *     description: Gerenciamento de integração WhatsApp para organizações
 */

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/status:
 *   get:
 *     summary: Verifica status da conexão WhatsApp
 *     description: Retorna o status atual da conexão WhatsApp da organização
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "meu-salao"
 *     responses:
 *       200:
 *         description: Status da conexão
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                   example: true
 *                 phoneNumber:
 *                   type: string
 *                   example: "5511999998888"
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao verificar status
 */
whatsappOrganizationRouter.get(
  '/:slug/status',
  authenticateJWT,
  requireAdminOfOrganization,
  requireActiveSubscription,
  getWhatsappStatus
);

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/connect:
 *   post:
 *     summary: Inicia conexão WhatsApp (gera QR Code)
 *     description: Gera um QR Code para conectar o WhatsApp da organização
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: QR Code gerado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode:
 *                   type: string
 *                   description: QR Code em base64
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao conectar WhatsApp
 */
whatsappOrganizationRouter.post(
  '/:slug/connect',
  authenticateJWT,
  requireAdminOfOrganization,
  connectWhatsapp
);

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/disconnect:
 *   post:
 *     summary: Desconecta o WhatsApp da organização
 *     description: Encerra a sessão WhatsApp da organização
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: WhatsApp desconectado com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao desconectar
 */
whatsappOrganizationRouter.post(
  '/:slug/disconnect',
  authenticateJWT,
  requireAdminOfOrganization,
  disconnectWhatsapp
);

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/contacts:
 *   get:
 *     summary: Lista todos os contatos do WhatsApp
 *     description: Retorna lista de contatos sincronizados do WhatsApp da organização
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Lista de contatos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   jid:
 *                     type: string
 *                     example: "5511999998888@s.whatsapp.net"
 *                   name:
 *                     type: string
 *                     example: "João Silva"
 *                   notify:
 *                     type: string
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao buscar contatos
 */
whatsappOrganizationRouter.get(
  '/:slug/contacts',
  authenticateJWT,
  requireAdminOfOrganization,
  getContacts
);

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/contacts/{jid}:
 *   get:
 *     summary: Busca informações de um contato específico
 *     description: Retorna detalhes completos de um contato do WhatsApp
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: path
 *         name: jid
 *         required: true
 *         schema:
 *           type: string
 *         description: JID do contato (ex 5511999998888@s.whatsapp.net)
 *         example: "5511999998888@s.whatsapp.net"
 *     responses:
 *       200:
 *         description: Informações do contato
 *       404:
 *         description: Contato não encontrado
 *       500:
 *         description: Erro ao buscar contato
 */
whatsappOrganizationRouter.get(
  '/:slug/contacts/:jid',
  authenticateJWT,
  requireAdminOfOrganization,
  getContactInfo
);

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/contacts/{jid}:
 *   patch:
 *     summary: Atualiza informações locais de um contato
 *     description: Atualiza nome, observação ou imagem de um contato (apenas localmente, não no WhatsApp)
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: path
 *         name: jid
 *         required: true
 *         schema:
 *           type: string
 *         description: JID do contato
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               observation:
 *                 type: string
 *                 example: "Cliente VIP"
 *               image:
 *                 type: string
 *                 description: Imagem em base64
 *     responses:
 *       200:
 *         description: Contato atualizado com sucesso
 *       404:
 *         description: Contato não encontrado
 *       500:
 *         description: Erro ao atualizar contato
 */
whatsappOrganizationRouter.patch(
  '/:slug/contacts/:jid',
  authenticateJWT,
  requireAdminOfOrganization,
  updateContactInfo
);

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/send-message:
 *   post:
 *     summary: Envia mensagem individual via WhatsApp
 *     description: Envia uma mensagem de texto para um contato específico
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
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
 *               - to
 *               - message
 *             properties:
 *               to:
 *                 type: string
 *                 description: Número do destinatário (com código do país)
 *                 example: "5511999998888"
 *               message:
 *                 type: string
 *                 description: Texto da mensagem
 *                 example: "Olá! Tudo bem?"
 *     responses:
 *       200:
 *         description: Mensagem enviada com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao enviar mensagem
 */
whatsappOrganizationRouter.post(
  '/:slug/send-message',
  authenticateJWT,
  requireAdminOfOrganization,
  sendMessage
);

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/send-bulk:
 *   post:
 *     summary: Envia mensagens em lote via WhatsApp
 *     description: Envia a mesma mensagem para múltiplos contatos
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
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
 *               - contacts
 *               - message
 *             properties:
 *               contacts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de números (com código do país)
 *                 example: ["5511999998888", "5511888887777"]
 *               message:
 *                 type: string
 *                 description: Texto da mensagem
 *                 example: "Promoção especial hoje!"
 *     responses:
 *       200:
 *         description: Mensagens enviadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sent:
 *                   type: integer
 *                   example: 5
 *                 failed:
 *                   type: integer
 *                   example: 0
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao enviar mensagens
 */
whatsappOrganizationRouter.post(
  '/:slug/send-bulk',
  authenticateJWT,
  requireAdminOfOrganization,
  sendBulkMessages
);

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/statistics:
 *   get:
 *     summary: Obtém estatísticas de uso do WhatsApp
 *     description: Retorna estatísticas sobre mensagens enviadas, recebidas, etc
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Estatísticas do WhatsApp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messagesSent:
 *                   type: integer
 *                   example: 150
 *                 messagesReceived:
 *                   type: integer
 *                   example: 200
 *                 totalContacts:
 *                   type: integer
 *                   example: 50
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao buscar estatísticas
 */
whatsappOrganizationRouter.get(
  '/:slug/statistics',
  authenticateJWT,
  requireAdminOfOrganization,
  getStatistics
);

/**
 * @swagger
 * /api/whatsapp-organization/{slug}/qrcode:
 *   get:
 *     summary: Obtém QR Code para reconexão
 *     description: Gera um novo QR Code quando o anterior expira ou para reconectar
 *     tags: [WhatsApp Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: QR Code gerado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode:
 *                   type: string
 *                   description: QR Code em base64
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao gerar QR Code
 */
whatsappOrganizationRouter.get(
  '/:slug/qrcode',
  authenticateJWT,
  requireAdminOfOrganization,
  getQRCode
);
