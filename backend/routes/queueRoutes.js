import express from "express";
import cors from "cors";
import {
  getTodayQueue,
  createQueue,
  getQueueEntries,
  getAvailableEmployees,
  joinQueue,
  callNextInQueue,
  removeFromQueue,
  completeQueueEntry,
  updateQueue,
  reorderQueue,
  completeEntry,
  cancelEntry,
  getQueueStats,
  updateQueueEntry,
  updateMyQueueEntry,
  leaveQueueByToken,
} from "../controllers/queueController.js";
import { validateSlugForWebSocket } from "../controllers/websocketController.js";

export const queueRouter = express.Router();

// CORS mais permissivo para endpoint público de validação WebSocket
const publicCorsOptions = {
  origin: [
    'http://localhost:3000', 
    'https://ubiquitous-train-v6pw96wx6v64h664v-3000.app.github.dev', 
    'https://marcafy.com.br', 
    'https://www.marcafy.com.br', 
    'http://localhost:3001',
    'https://marcafy.vercel.app'
  ],
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Permite credenciais mas não exige
  optionsSuccessStatus: 204,
};

/**
 * @swagger
 * /api/queues/{slug}/today:
 *   get:
 *     tags: ['Queues']
 *     summary: 'Obter fila do dia'
 *     description: 'Retorna a fila de hoje (não cria automaticamente)'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: 'Slug da organização'
 *     responses:
 *       200:
 *         description: 'Fila do dia'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 queue_id:
 *                   type: integer
 *                 status:
 *                   type: string
 *                   enum: ['open', 'closed', 'paused']
 *                 queue_date:
 *                   type: string
 *                   format: date
 *                 opens_at:
 *                   type: string
 *                 closes_at:
 *                   type: string
 *                 queue_entries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/QueueEntry'
 *       404:
 *         description: 'Organização não encontrada'
 */
queueRouter.get("/:slug/today", getTodayQueue);

queueRouter.post("/:slug/create", createQueue);

/**
 * @swagger
 * /api/queues/{slug}/entries/{queueId}:
 *   get:
 *     tags: ['Queues']
 *     summary: 'Listar entries da fila'
 *     description: 'Retorna todas as entradas da fila ordenadas por posição'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 'Entradas da fila'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QueueEntry'
 */
queueRouter.get("/:slug/entries/:queueId", getQueueEntries);

/**
 * @swagger
 * /api/queues/{slug}/employees/{serviceId}:
 *   get:
 *     tags: ['Queues']
 *     summary: 'Listar funcionários disponíveis para um serviço'
 *     description: 'Retorna apenas funcionários que fazem o serviço e estão em horário de trabalho agora'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 'Funcionários disponíveis'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   imagem_funcionario:
 *                     type: string
 *                   start_time:
 *                     type: string
 *                   end_time:
 *                     type: string
 */
queueRouter.get("/:slug/employees/:serviceId", getAvailableEmployees);

/**
 * @swagger
 * /api/queues/{slug}/join:
 *   post:
 *     tags: ['Queues']
 *     summary: 'Cliente entra na fila'
 *     description: 'Cria uma nova entrada na fila para o cliente'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_name
 *               - service_id
 *               - employee_id
 *             properties:
 *               client_name:
 *                 type: string
 *                 example: 'João Silva'
 *               client_email:
 *                 type: string
 *                 format: email
 *               client_phone:
 *                 type: string
 *                 example: '11999999999'
 *               service_id:
 *                 type: integer
 *               employee_id:
 *                 type: integer
 *               coupon_code:
 *                 type: string
 *               original_price:
 *                 type: number
 *                 format: double
 *               final_price:
 *                 type: number
 *                 format: double
 *     responses:
 *       201:
 *         description: 'Cliente adicionado à fila com sucesso'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueueEntry'
 *       400:
 *         description: 'Dados inválidos ou cliente já na fila'
 */
queueRouter.post("/:slug/join", joinQueue);

/**
 * @swagger
 * /api/queues/{slug}/{queueId}/call-next:
 *   put:
 *     tags: ['Queues']
 *     summary: 'Profissional chama próximo cliente'
 *     description: 'Marca o próximo cliente da fila como sendo chamado'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *             properties:
 *               employee_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 'Cliente chamado com sucesso'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueueEntry'
 *       404:
 *         description: 'Nenhum cliente na fila'
 */
queueRouter.put("/:slug/:queueId/call-next", callNextInQueue);

/**
 * @swagger
 * /api/queues/{slug}/{queueId}/{entryId}/complete:
 *   put:
 *     tags: ['Queues']
 *     summary: 'Marcar cliente como atendido'
 *     description: 'Marca a entrada na fila como concluída (cliente atendido)'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 'Cliente marcado como atendido'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueueEntry'
 */
queueRouter.put("/:slug/:queueId/:entryId/complete", completeQueueEntry);

/**
 * @swagger
 * /api/queues/{slug}/{queueId}/{entryId}:
 *   delete:
 *     tags: ['Queues']
 *     summary: 'Remover cliente da fila'
 *     description: 'Remove uma entrada da fila'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 'Cliente removido com sucesso'
 */
queueRouter.delete("/:slug/:queueId/:entryId", removeFromQueue);

/**
 * @swagger
 * /api/queues/{slug}/{queueId}:
 *   put:
 *     tags: ['Queues']
 *     summary: 'Atualizar status da fila'
 *     description: 'Altera o status da fila (open, closed, paused)'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ['open', 'closed', 'paused']
 *     responses:
 *       200:
 *         description: 'Status da fila atualizado'
 */
queueRouter.put("/:slug/:queueId", updateQueue);

/**
 * @swagger
 * components:
 *   schemas:
 *     QueueEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         position:
 *           type: integer
 *           description: 'Posição do cliente na fila'
 *         status:
 *           type: string
 *           enum: ['confirmed', 'calling', 'completed', 'no-show']
 *         client_id:
 *           type: integer
 *         service_id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         original_price:
 *           type: number
 *           format: double
 *         final_price:
 *           type: number
 *           format: double
 *         coupon_code:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         clients:
 *           type: object
 *           properties:
 *             client_name:
 *               type: string
 *             client_phone:
 *               type: string
 *             client_email:
 *               type: string
 *         services:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             price:
 *               type: number
 *         employees:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             imagem_funcionario:
 *               type: string
 */

/**
 * @swagger
 * /api/queues/{slug}/{queueId}/reorder:
 *   post:
 *     tags: ['Queues']
 *     summary: 'Reordenar fila (Admin)'
 *     description: 'Permite ao admin arrastar e reordenar posições na fila'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entryId
 *               - newPosition
 *             properties:
 *               entryId:
 *                 type: integer
 *               newPosition:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 'Fila reordenada com sucesso'
 */
queueRouter.post("/:slug/:queueId/reorder", reorderQueue);

/**
 * @swagger
 * /api/queues/{slug}/{queueId}/{entryId}/complete:
 *   patch:
 *     tags: ['Queues']
 *     summary: 'Marcar entrada como completada (Admin)'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 'Entrada completada'
 */
queueRouter.patch("/:slug/:queueId/:entryId/complete", completeEntry);

/**
 * @swagger
 * /api/queues/{slug}/{queueId}/{entryId}/cancel:
 *   patch:
 *     tags: ['Queues']
 *     summary: 'Cancelar entrada (Admin)'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 'Entrada cancelada'
 */
queueRouter.patch("/:slug/:queueId/:entryId/cancel", cancelEntry);

/**
 * @swagger
 * /api/queues/{slug}/{queueId}/{entryId}/update:
 *   put:
 *     tags: ['Queues']
 *     summary: 'Admin atualiza serviço/funcionário de uma entrada'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_id:
 *                 type: integer
 *               employee_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 'Entrada atualizada'
 */
queueRouter.put("/:slug/:queueId/:entryId/update", updateQueueEntry);

/**
 * @swagger
 * /api/queues/public/{publicToken}/update:
 *   put:
 *     tags: ['Queues']
 *     summary: 'Cliente atualiza seu serviço/funcionário usando token público'
 *     parameters:
 *       - in: path
 *         name: publicToken
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_id:
 *                 type: integer
 *               employee_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 'Entrada atualizada'
 */
queueRouter.put("/public/:publicToken/update", updateMyQueueEntry);

/**
 * @swagger
 * /api/queues/public/{publicToken}/leave:
 *   delete:
 *     tags: ['Queues']
 *     summary: 'Cliente sai da fila usando token público'
 *     parameters:
 *       - in: path
 *         name: publicToken
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 'Cliente removido da fila'
 */
queueRouter.delete("/public/:publicToken/leave", leaveQueueByToken);

/**
 * @swagger
 * /api/queues/{slug}/{queueId}/stats:
 *   get:
 *     tags: ['Queues']
 *     summary: 'Estatísticas da fila do dia (Admin)'
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 'Estatísticas da fila'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 completed:
 *                   type: integer
 *                 cancelled:
 *                   type: integer
 *                 waiting:
 *                   type: integer
 *                 calling:
 *                   type: integer
 *                 totalRevenue:
 *                   type: number
 *                 totalMinutes:
 *                   type: integer
 *                 averageTimePerClient:
 *                   type: integer
 */
queueRouter.get("/:slug/:queueId/stats", getQueueStats);

/**
 * @swagger
 * /api/queues/validate-websocket/{slug}:
 *   get:
 *     summary: Valida slug e retorna organization ID para WebSocket
 *     description: Endpoint de validação seguro que resolve slug → organizationId. Usado pelo frontend para conectar ao WebSocket de forma segura.
 *     tags: [Fila]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Validação bem-sucedida, retorna organization ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizationId:
 *                   type: string
 *                   format: uuid
 *                 slug:
 *                   type: string
 *       404:
 *         description: Organização não encontrada
 *       403:
 *         description: Organização inativa
 */
queueRouter.options("/validate-websocket/:slug", cors(publicCorsOptions));
queueRouter.get("/validate-websocket/:slug", cors(publicCorsOptions), validateSlugForWebSocket);

export default queueRouter;
