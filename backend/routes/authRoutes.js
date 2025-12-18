import { Router } from 'express';
import { checkAuth, logout } from '../controllers/authController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

export const authRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Autenticação
 *     description: Endpoints de verificação e controle de autenticação
 */
/**
 * @swagger
 * /api/auth/{slug}/check:
 *   get:
 *     summary: Verifica se o usuário está autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Verifica a validade do token JWT enviado pelo cliente.
 *       Retorna os dados do usuário autenticado se o token estiver válido.
 *     responses:
 *       200:
 *         description: Usuário autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                       example: "admin"
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro interno do servidor
 */
authRouter.get("/:slug/check", authenticateJWT, checkAuth)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Realiza logout do usuário
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     description: Remove o cookie de autenticação, finalizando a sessão do usuário.
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logout efetuado com sucesso"
 *       401:
 *         description: Token ausente ou inválido
 *       500:
 *         description: Erro interno do servidor
 */
authRouter.post('/logout', authenticateJWT, logout)