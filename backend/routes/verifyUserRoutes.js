import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { Router } from "express";
import { verifyUser } from "../controllers/verifyUserController.js";

export const verifyUserRouter = Router();

/**
 * @swagger
 * /api/verifica-usuario/{slug}:
 *   post:
 *     summary: Verifica se um nome de usuário já está cadastrado
 *     description: |
 *       Verifica se o username já existe dentro da organização informada.
 *       Usado durante o cadastro para evitar duplicidades.
 *     tags: [Autenticação]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "barbearia-do-joao"
 *     requestBody:
 *       required: true
 *       content:
	@@ -24,34 +32,19 @@ export const verifyUserRouter = Router();
 *             properties:
 *               username:
 *                 type: string
 *                 example: "derick_campos"
 *     responses:
 *       200:
 *         description: Resultado da verificação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Erro interno do servidor
 */
verifyUserRouter.post("/:slug", authenticateJWT, verifyUser);