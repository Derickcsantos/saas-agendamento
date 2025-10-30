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
 *     summary: Retorna todos os usuários em uma organização
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID da organização
 *     responses:
 *       200:
 *         description: Lista de todos os usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Erro interno do servidor
 */
userRouter.get('/', authenticateJWT, extractOrganizationId, getUsers)

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Retorna um usuário específico em uma organização
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID da organização
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */

userRouter.get('/:id', authenticateJWT, extractOrganizationId, getUserById)


/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Cria um novo usuário em uma organização
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Usuário ou email já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */
userRouter.post('/', authenticateJWT, extractOrganizationId, createUser)

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Atualiza um usuário existente em uma organização
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário
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
 *         description: Nome de usuário e e-mail são obrigatórios
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
userRouter.put('/:id', authenticateJWT, extractOrganizationId, updateUser)


/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Remove um usuário em uma organização
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: false
 *         description: Organização do usuário
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
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
userRouter.delete('/:id', authenticateJWT, extractOrganizationId, deleteUser)

