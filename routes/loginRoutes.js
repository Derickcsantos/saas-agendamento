import { Router } from 'express'
import { login } from '../controllers/loginController.js'
import { extractOrganizationId, authenticateJWT } from '../middlewares/authMiddleware.js'

export const loginRouter = Router()

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Autentica um usuário no sistema (versão desenvolvimento)
 *     description: |
 *       Esta rota é uma versão SIMPLIFICADA para desenvolvimento que compara a senha em texto puro.
 *       EM PRODUÇÃO, substitua por um sistema seguro com hash de senha e JWT.
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário cadastrado
 *                 example: "derick_campos"
 *               password:
 *                 type: string
 *                 description: Senha em texto puro (APENAS PARA DESENVOLVIMENTO)
 *                 example: "senhaSegura123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
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
 *                     tipo:
 *                       type: string
 *                       enum: [comum, admin]
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Cookie HTTP-only contendo os dados do usuário autenticado
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Credenciais inválidas"
 *       500:
 *         description: Erro interno do servidor
 */
loginRouter.post('/', authenticateJWT, extractOrganizationId, login)