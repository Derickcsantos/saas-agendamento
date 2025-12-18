import { Router } from 'express'
import { login, loginBySlug } from '../controllers/loginController.js'
import { extractOrganizationId, authenticateJWT } from '../middlewares/authMiddleware.js'

export const loginRouter = Router()

/**
 * @swagger
 * /api/login/{slug}:
 *   post:
 *     summary: Realiza login utilizando o slug da organização
 *     tags:
 *       - Login
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         description: Slug da organização que identifica qual ambiente de login deve ser utilizado
 *         schema:
 *           type: string
 *           example: minha-barbearia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - password
 *             properties:
 *               login:
 *                 type: string
 *                 example: usuario@email.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR...
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Credenciais incorretas
 *       404:
 *         description: Slug não encontrado
 *       500:
 *         description: Erro interno no servidor
 */
loginRouter.post('/:slug', loginBySlug)