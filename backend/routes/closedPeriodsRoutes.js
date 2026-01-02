import Router from 'express';
import { getClosedPeriods, getClosedPeriodById, createClosedPeriod, updateClosedPeriod, deleteClosedPeriod } from '../controllers/closedPeriodsController.js'
import { authenticateJWT} from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';

export const closedPeriodsRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Períodos fechados
 *     description: Gerenciamento de períodos fechados
 */

/**
 * @swagger
 * /api/closed-periods/{slug}:
 *   get:
 *     summary: Retorna todos os usuários de uma organização
 *     description: Retorna todos os usuários vinculados à organização identificada pelo slug.
 *     tags: [Períodos fechados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "barbearia-do-joao"
 *     responses:
 *       200:
 *         description: Lista de usuários da organização
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.get('/:slug', authenticateJWT, requireAdminOfOrganization, getClosedPeriods)

/**
 * @swagger
 * /api/closed-periods/{id}:
 *   get:
 *     summary: Retorna um usuário específico de uma organização
 *     description: Busca um usuário pelo ID dentro da organização identificada pelo slug.
 *     tags: [Períodos fechados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "barbearia-do-joao"
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *         example: "uuid-do-usuario"
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário ou organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.get('/:id', authenticateJWT, requireAdminOfOrganization, getClosedPeriodById)


/**
 * @swagger
 * /api/closed-periods/{slug}:
 *   post:
 *     summary: Cria um novo usuário dentro de uma organização
 *     description: Cria um usuário vinculado à organização identificada pelo slug.
 *     tags: [Períodos fechados]
 *     security:
 *       - bearerAuth: []
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
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Campos obrigatórios ausentes ou usuário já existente
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.post('/:slug', authenticateJWT, requireAdminOfOrganization, createClosedPeriod)

/**
 * @swagger
 * /api/closed-periods/{slug}/{id}:
 *   put:
 *     summary: Atualiza um usuário existente dentro da organização
 *     tags: [Períodos fechados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "barbearia-do-joao"
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos ou ausentes
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado na organização
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.put('/:slug/:id', authenticateJWT, requireAdminOfOrganization, updateClosedPeriod)

/**
 * @swagger
 * /api/closed-periods/{slug}/{id}:
 *   delete:
 *     summary: Remove um usuário da organização
 *     tags: [Períodos fechados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "barbearia-do-joao"
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário a ser removido
 *     responses:
 *       200:
 *         description: Usuário removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado na organização
 *       500:
 *         description: Erro interno do servidor
 */
closedPeriodsRouter.delete('/:slug/:id', authenticateJWT, requireAdminOfOrganization, deleteClosedPeriod)