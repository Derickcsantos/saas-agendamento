import Router from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/usersController.js'
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js';

export const userRouter = Router();


/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gerenciamento de usuários
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Retorna todos os usuários da organização do token
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de todos os usuários da organização autenticada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Erro interno do servidor
 */
userRouter.get('/', authenticateJWT, getUsers)

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Retorna um usuário específico da organização autenticada
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário a ser consultado
 *     responses:
 *       200:
 *         description: Dados do usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuário não encontrado na organização
 *       500:
 *         description: Erro interno do servidor
 */

userRouter.get('/:id', authenticateJWT, getUserById)


/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Cria um novo usuário dentro da organização autenticada
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Campos obrigatórios ausentes ou usuário já existente
 *       500:
 *         description: Erro interno do servidor
 */

userRouter.post('/', authenticateJWT, createUser)

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Atualiza um usuário existente dentro da organização autenticada
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos ou ausentes
 *       404:
 *         description: Usuário não encontrado na organização
 *       500:
 *         description: Erro interno do servidor
 */
userRouter.put('/:id', authenticateJWT, updateUser)


/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Remove um usuário da organização autenticada
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário a ser removido
 *     responses:
 *       200:
 *         description: Usuário removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Usuário não encontrado na organização
 *       500:
 *         description: Erro interno do servidor
 */
userRouter.delete('/:id', authenticateJWT, deleteUser)

