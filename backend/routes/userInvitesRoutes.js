import Router from 'express';
import {
  createUserInvite,
  validateInvite,
  getUserInvites,
  redeemInvite,
  deleteUserInvite,
} from '../controllers/userInvitesController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

export const userInvitesRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: User Invites
 *     description: Gerenciamento de convites de usuários
 */

/**
 * @swagger
 * /api/user-invites/{slug}:
 *   post:
 *     summary: Cria um novo convite para um usuário
 *     description: Apenas administradores podem criar convites
 *     tags: [User Invites]
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               invited_name:
 *                 type: string
 *               invited_type:
 *                 type: string
 *                 enum: ['comum', 'funcionario', 'admin']
 *     responses:
 *       201:
 *         description: Convite criado com sucesso
 */
userInvitesRouter.post('/:slug', authenticateJWT, createUserInvite);

/**
 * @swagger
 * /api/user-invites/{slug}:
 *   get:
 *     summary: Lista convites da organização
 *     description: Apenas administradores podem visualizar
 *     tags: [User Invites]
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
 *         description: Lista de convites
 */
userInvitesRouter.get('/:slug', authenticateJWT, getUserInvites);

/**
 * @swagger
 * /api/user-invites/{slug}/validate/{code}:
 *   get:
 *     summary: Valida um código de convite
 *     description: Retorna dados do convite se válido e não expirado
 *     tags: [User Invites]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Convite válido
 *       404:
 *         description: Convite não encontrado
 *       410:
 *         description: Convite expirado
 */
userInvitesRouter.get('/:slug/validate/:code', validateInvite);

/**
 * @swagger
 * /api/user-invites/{slug}/redeem/{code}:
 *   post:
 *     summary: Resgata um convite durante o cadastro
 *     description: Cria um novo usuário com o tipo especificado no convite
 *     tags: [User Invites]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               aniversario:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 */
userInvitesRouter.post('/:slug/redeem/:code', redeemInvite);

/**
 * @swagger
 * /api/user-invites/{slug}/{inviteId}:
 *   delete:
 *     summary: Remove um convite não usado
 *     description: Apenas administradores podem deletar
 *     tags: [User Invites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Convite removido
 */
userInvitesRouter.delete('/:slug/:inviteId', authenticateJWT, deleteUserInvite);
