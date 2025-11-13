import { Router } from 'express';
import { registerUser, registerBySlug } from '../controllers/registerUserController.js';
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js';

export const registerUserRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Endpoints para registro de usuários
 */

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Cadastra um novo usuário na organização extraída do token
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password_plaintext
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário único
 *                 example: "derick_campos"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: E-mail do usuário
 *                 example: "derick@exemplo.com"
 *               aniversario:
 *                 type: string
 *                 format: date
 *                 description: Data de nascimento (opcional)
 *                 example: "1990-01-15"
 *               phone:
 *                 type: string
 *                 description: Telefone do usuário (opcional)
 *                 example: "+55 11 99999-9999"
 *               password_plaintext:
 *                 type: string
 *                 description: Senha em texto puro
 *                 example: "senhaSegura123"
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Usuário cadastrado com sucesso!"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     aniversario:
 *                       type: string
 *                       nullable: true
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                     created_at:
 *                       type: string
 *       400:
 *         description: Dados inválidos ou usuário já existe
 *       500:
 *         description: Erro interno do servidor
 */

registerUserRouter.post('/', extractOrganizationId, registerUser);

/**
 * @swagger
 * /api/register/{slug}:
 *   post:
 *     summary: Cadastra um usuário em uma organização identificada pelo slug
 *     tags: [Autenticação]
 *     parameters:
 *       - in: path
 *         name: slug
 *         schema:
 *           type: string
 *         required: true
 *         description: Slug público da organização
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password_plaintext
 *             properties:
 *               username:
 *                 type: string
 *                 example: "novo_usuario"
 *               email:
 *                 type: string
 *                 example: "email@empresa.com"
 *               aniversario:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               phone:
 *                 type: string
 *                 example: "+55 11 98888-7777"
 *               password_plaintext:
 *                 type: string
 *                 example: "senhaForte123"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       404:
 *         description: Organização não encontrada
 *       400:
 *         description: Usuário ou email já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */
registerUserRouter.post('/:slug', registerBySlug)