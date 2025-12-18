import { Router } from 'express'
import { forgotPassword } from '../controllers/forgotPasswordController.js'

export const forgotPasswordRouter = Router()

/**
 * @swagger
 * /api/forgot-password/{slug}:
 *   post:
 *     summary: Recuperação de senha
 *     description: Envia uma nova senha para o e-mail do usuário caso ele tenha esquecido.
 *     tags:
 *       - Autenticação
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@exemplo.com
 *     responses:
 *       200:
 *         description: Senha enviada com sucesso por e-mail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: E-mail não encontrado
 *       500:
 *         description: Erro interno ao processar a solicitação
 */
forgotPasswordRouter.post('/:slug', forgotPassword) 