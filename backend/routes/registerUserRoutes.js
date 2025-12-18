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
 * /api/register/{slug}:
 *   post:
 *     summary: Cadastra um usuário em uma organização pública via slug
 *     description: |
 *       Permite o cadastro de usuários sem autenticação,
 *       utilizando o slug público da organização.
 *     tags: [Autenticação]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug público da organização
 *         example: "paula-trancas"
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
 *                 format: email
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Organização não encontrada
 *       400:
 *         description: Usuário ou e-mail já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */
registerUserRouter.post('/:slug', registerBySlug)