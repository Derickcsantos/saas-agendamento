import { Router } from 'express';
import {
  getWhatsappStatus,
  connectWhatsapp,
  disconnectWhatsapp,
  getContacts,
  sendMessage,
  sendBulkMessages,
  getStatistics
} from '../controllers/whatsappOrganizationController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';

export const whatsappOrganizationRouter = Router();

// Verificar status da conexão
whatsappOrganizationRouter.get(
  '/:slug/status',
  authenticateJWT,
  requireAdminOfOrganization,
  getWhatsappStatus
);

// Conectar WhatsApp (gerar QR Code)
whatsappOrganizationRouter.post(
  '/:slug/connect',
  authenticateJWT,
  requireAdminOfOrganization,
  connectWhatsapp
);

// Desconectar WhatsApp
whatsappOrganizationRouter.post(
  '/:slug/disconnect',
  authenticateJWT,
  requireAdminOfOrganization,
  disconnectWhatsapp
);

// Buscar contatos
whatsappOrganizationRouter.get(
  '/:slug/contacts',
  authenticateJWT,
  requireAdminOfOrganization,
  getContacts
);

// Enviar mensagem individual
whatsappOrganizationRouter.post(
  '/:slug/send-message',
  authenticateJWT,
  requireAdminOfOrganization,
  sendMessage
);

// Enviar mensagens em lote
whatsappOrganizationRouter.post(
  '/:slug/send-bulk',
  authenticateJWT,
  requireAdminOfOrganization,
  sendBulkMessages
);

// Obter estatísticas
whatsappOrganizationRouter.get(
  '/:slug/statistics',
  authenticateJWT,
  requireAdminOfOrganization,
  getStatistics
);
