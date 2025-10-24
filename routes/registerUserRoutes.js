import { Router } from 'express';
import { registerUser } from '../controllers/registerUserController.js';
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js';

export const registerUserRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Endpoints para registro e login de usuários
 */

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Cadastra um novo usuário no sistema
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - aniversario
 *               - password_plaintext
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário único
 *                 example: "derick_campos"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: E-mail válido do usuário
 *                 example: "derick@exemplo.com"
 *               aniversario:
 *                 type: string
 *                 format: date
 *                 description: Data de nascimento no formato YYYY-MM-DD
 *                 example: "1990-01-15"
 *               password_plaintext:
 *                 type: string
 *                 description: Senha em texto puro (em produção deve ser criptografada)
 *                 example: "senhaSegura123"
 *     responses:
 *       200:
 *         description: Usuário cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                     created_at:
 *                       type: string
 *       400:
 *         description: Erro na requisição (usuário ou e-mail já cadastrado)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Usuário ou email já cadastrado"
 *       500:
 *         description: Erro interno do servidor
 */
registerUserRouter.post('/', extractOrganizationId, registerUser);