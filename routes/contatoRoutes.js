import Router from 'express';
import { emailContact } from '../controllers/contatosController.js';

export const emailContactRouter = Router();

/**
 * @swagger
 * /api/contato:
 *   post:
 *     summary: Envia uma mensagem de contato do site Paula Tranças
 *     description: Envia um e-mail para o salão com as informações do formulário de contato do site.
 *     tags:
 *       - Contato
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Maria Silva"
 *                 description: Nome do remetente.
 *               email:
 *                 type: string
 *                 example: "maria@email.com"
 *                 description: E-mail do remetente.
 *               phone:
 *                 type: string
 *                 example: "(11) 99999-9999"
 *                 description: Telefone do remetente (opcional).
 *               message:
 *                 type: string
 *                 example: "Olá, gostaria de saber mais sobre os serviços de tranças."
 *                 description: Mensagem enviada pelo usuário.
 *     responses:
 *       200:
 *         description: Mensagem enviada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mensagem enviada com sucesso!"
 *       400:
 *         description: Campos obrigatórios não informados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Nome, email e mensagem são obrigatórios"
 *       500:
 *         description: Erro interno ao enviar o e-mail.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ocorreu um erro ao enviar a mensagem. Por favor, tente novamente mais tarde."
 */
emailContactRouter.post('/', emailContact )