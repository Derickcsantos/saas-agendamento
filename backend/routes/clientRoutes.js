import { Router } from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import {
  getOrCreateClient,
  listClients,
  updateClient,
  deleteClient,
} from '../controllers/clientsController.js';
import requireActiveSubscription from '../middlewares/requireActiveSubscription.js';

export const clientRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Clientes
 *     description: Gerenciamento de clientes
 */



/**
 * @swagger
 * /api/clients/or-create:
 *   post:
 *     summary: Buscar ou criar cliente
 *     description: |
 *       Busca cliente por email, depois por telefone.
 *       Se não encontrar, cria novo cliente.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               client_name:
 *                 type: string
 *               client_email:
 *                 type: string
 *               client_phone:
 *                 type: string
 *               organization_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       201:
 *         description: Cliente criado
 */
clientRouter.post('/or-create', authenticateJWT, requireActiveSubscription, getOrCreateClient);

/**
 * @swagger
 * /api/clients/{slug}:
 *   get:
 *     summary: Listar clientes de uma organização
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de clientes
 */
clientRouter.get('/:slug', authenticateJWT, requireActiveSubscription, listClients);

/**
 * @swagger
 * /api/clients/{slug}/{clientId}:
 *   put:
 *     summary: Atualizar cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               client_name:
 *                 type: string
 *               client_email:
 *                 type: string
 *               client_phone:
 *                 type: string
 *               client_observation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cliente atualizado
 */
clientRouter.put('/:slug/:clientId', authenticateJWT, requireActiveSubscription, updateClient);

/**
 * @swagger
 * /api/clients/{slug}/{clientId}:
 *   delete:
 *     summary: Deletar cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Cliente deletado
 */
clientRouter.delete('/:slug/:clientId', authenticateJWT, requireActiveSubscription, deleteClient);
