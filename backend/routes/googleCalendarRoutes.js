// routes/googleCalendarRoutes.js
import { Router } from "express";
import {
  getCalendarStatus,
  connectGoogleCalendar,
  googleCalendarCallback,
  getCalendarEvents,
  createCalendarEvent,
  disconnectGoogleCalendar,
  patchCalendarEvent,
} from "../controllers/googleCalendarController.js";
import requireActiveSubscription from "../middlewares/requireActiveSubscription.js";

export const googleCalendarRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Google Calendar
 *     description: Integração com Google Calendar para sincronização de eventos e agendamentos
 */

/**
 * @swagger
 * /api/google-calendar/status:
 *   get:
 *     summary: Verifica status da integração com Google Calendar
 *     description: Verifica se o usuário já conectou sua conta do Google Calendar
 *     tags: [Google Calendar]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *         example: 1
 *     responses:
 *       200:
 *         description: Status da integração
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAuthorized:
 *                   type: boolean
 *                   example: true
 *                 email:
 *                   type: string
 *                   example: "usuario@gmail.com"
 *       400:
 *         description: userId é obrigatório
 *       500:
 *         description: Erro ao verificar integração
 */
googleCalendarRouter.get(
  "/status",
  getCalendarStatus
);

/**
 * @swagger
 * /api/google-calendar/{slug}/connect:
 *   get:
 *     summary: Inicia processo de autenticação OAuth com Google Calendar
 *     description: Redireciona o usuário para a tela de autorização do Google para conectar o Google Calendar
 *     tags: [Google Calendar]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "meu-salao"
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário que está conectando
 *         example: 1
 *     responses:
 *       302:
 *         description: Redirecionamento para autorização do Google
 *       400:
 *         description: userId é obrigatório
 *       500:
 *         description: Erro ao iniciar OAuth
 */
googleCalendarRouter.get(
  "/:slug/connect",
  connectGoogleCalendar
);

/**
 * @swagger
 * /api/google-calendar/callback:
 *   get:
 *     summary: Callback OAuth do Google Calendar
 *     description: Endpoint de callback após autorização do Google. Salva os tokens de acesso do usuário
 *     tags: [Google Calendar]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de autorização retornado pelo Google
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: Estado codificado contendo slug e userId
 *     responses:
 *       302:
 *         description: Redirecionamento para o frontend com sucesso
 *       400:
 *         description: Código ou state faltando
 *       500:
 *         description: Erro ao finalizar OAuth
 */
googleCalendarRouter.get(
  "/callback",
  googleCalendarCallback
);

/**
 * @swagger
 * /api/google-calendar/events:
 *   get:
 *     summary: Lista eventos do Google Calendar do usuário
 *     description: Retorna todos os eventos do Google Calendar do usuário dentro de um período especificado. Inclui eventos compartilhados e de terceiros, exceto feriados
 *     tags: [Google Calendar]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *         example: 1
 *       - in: query
 *         name: timeMin
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data/hora mínima (ISO 8601). Se não informado, usa 1 ano atrás
 *         example: "2025-01-01T00:00:00Z"
 *       - in: query
 *         name: timeMax
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data/hora máxima (ISO 8601). Se não informado, usa 1 ano à frente
 *         example: "2025-12-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Lista de eventos do Google Calendar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "abc123xyz"
 *                   summary:
 *                     type: string
 *                     example: "Reunião importante"
 *                   start:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-01-30T14:00:00-03:00"
 *                   end:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-01-30T15:00:00-03:00"
 *                   calendarId:
 *                     type: string
 *                     example: "primary"
 *       400:
 *         description: userId é obrigatório
 *       401:
 *         description: Google Calendar não está conectado
 *       500:
 *         description: Erro ao buscar eventos
 */
googleCalendarRouter.get(
  "/events",
  getCalendarEvents
);

/**
 * @swagger
 * /api/google-calendar/events:
 *   post:
 *     summary: Cria um novo evento no Google Calendar
 *     description: Cria um evento no Google Calendar do usuário autenticado
 *     tags: [Google Calendar]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - summary
 *               - start
 *               - end
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: ID do usuário
 *                 example: 1
 *               summary:
 *                 type: string
 *                 description: Título do evento
 *                 example: "Corte de Cabelo - João Silva"
 *               description:
 *                 type: string
 *                 description: Descrição do evento
 *                 example: "Agendamento criado via Marcafy"
 *               location:
 *                 type: string
 *                 description: Local do evento
 *                 example: "Rua Exemplo, 123"
 *               start:
 *                 type: string
 *                 format: date-time
 *                 description: Data/hora de início (ISO 8601)
 *                 example: "2025-01-30T14:00:00-03:00"
 *               end:
 *                 type: string
 *                 format: date-time
 *                 description: Data/hora de término (ISO 8601)
 *                 example: "2025-01-30T15:00:00-03:00"
 *               colorId:
 *                 type: string
 *                 description: ID da cor do evento no Google Calendar (1-11)
 *                 example: "9"
 *     responses:
 *       201:
 *         description: Evento criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "abc123xyz"
 *                 summary:
 *                   type: string
 *                   example: "Corte de Cabelo - João Silva"
 *                 start:
 *                   type: object
 *                 end:
 *                   type: object
 *                 htmlLink:
 *                   type: string
 *                   example: "https://www.google.com/calendar/event?eid=abc123"
 *       400:
 *         description: Dados inválidos ou faltando
 *       401:
 *         description: Google Calendar não está conectado
 *       500:
 *         description: Erro ao criar evento
 */
googleCalendarRouter.post(
  "/events",
  createCalendarEvent
);

/**
 * @swagger
 * /api/google-calendar/events/{calendarId}/{eventId}:
 *   patch:
 *     summary: Atualiza um evento existente no Google Calendar
 *     description: Atualiza parcialmente um evento existente no Google Calendar do usuário
 *     tags: [Google Calendar]
 *     parameters:
 *       - in: path
 *         name: calendarId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do calendário (geralmente "primary")
 *         example: "primary"
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do evento a ser atualizado
 *         example: "abc123xyz"
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               summary:
 *                 type: string
 *                 example: "Reunião Atualizada"
 *               description:
 *                 type: string
 *               start:
 *                 type: object
 *                 properties:
 *                   dateTime:
 *                     type: string
 *                     format: date-time
 *               end:
 *                 type: object
 *                 properties:
 *                   dateTime:
 *                     type: string
 *                     format: date-time
 *               colorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Evento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 event:
 *                   type: object
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Google Calendar não está conectado
 *       500:
 *         description: Erro ao atualizar evento
 */
googleCalendarRouter.patch(
  "/events/:calendarId/:eventId",
  patchCalendarEvent
);

/**
 * @swagger
 * /api/google-calendar/disconnect:
 *   post:
 *     summary: Desconecta o Google Calendar do usuário
 *     description: Remove a integração do Google Calendar, deletando todos os tokens salvos
 *     tags: [Google Calendar]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *         example: 1
 *     responses:
 *       204:
 *         description: Google Calendar desconectado com sucesso (sem conteúdo)
 *       400:
 *         description: userId é obrigatório
 *       500:
 *         description: Erro ao desconectar
 */
googleCalendarRouter.post(
  "/disconnect",
  disconnectGoogleCalendar
);
