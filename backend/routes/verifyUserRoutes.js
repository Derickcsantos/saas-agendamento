import { authenticateJWT, extractOrganizationId } from "../middlewares/authMiddleware.js";
import { Router } from "express";
import { verifyUser } from "../controllers/verifyUserController.js";

export const verifyUserRouter = Router();

/**
 * @swagger
 * /api/verifica-usuario:
 *   post:
 *     summary: Verifica se um nome de usuário já está cadastrado
 *     description: |
 *       Endpoint utilizado para verificar a disponibilidade de um username durante o cadastro,
 *       evitando duplicidades no sistema.
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário a ser verificado
 *                 example: "derick_campos"
 *     responses:
 *       200:
 *         description: Resposta da verificação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: Indica se o usuário já está cadastrado
 *                   example: true
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: Sempre retorna false em caso de erro
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro (apenas em modo de desenvolvimento)
 *                   example: "Erro ao acessar o banco de dados"
 */
verifyUserRouter.post("/", authenticateJWT, extractOrganizationId, verifyUser);