import { Router } from 'express';
import { getLandingPageBySlug, createLandingPage, updateLandingPage } from '../controllers/landingPagesController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

export const landingPageRouter = Router()


/**
 * @swagger
 * /api/landing-page/{slug}:
 *   get:
 *     summary: Retorna os dados da landing page de uma organização
 *     description: Busca informações da tabela `organization_landing` relacionadas ao slug informado, incluindo nome e telefone da organização.
 *     tags:
 *       - Landing page
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Dados da landing page da organização
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 slug:
 *                   type: string
 *                 hero_title:
 *                   type: string
 *                 hero_subtitle:
 *                   type: string
 *                 about_title:
 *                   type: string
 *                 about_text:
 *                   type: string
 *                 organizations:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno no servidor
 */
landingPageRouter.get("/:slug", getLandingPageBySlug)

/**
 * @swagger
 * /api/landing-page/{slug}:
 *   post:
 *     summary: Cria a landing page de uma organização
 *     description: Cria o registro da landing page para a organização identificada pelo slug informado.
 *     tags:
 *       - Landing page
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               hero_title:
 *                 type: string
 *                 example: Bem-vindo ao nosso salão
 *               hero_subtitle:
 *                 type: string
 *                 example: Cuidando de você com excelência
 *               about_title:
 *                 type: string
 *                 example: Sobre Nós
 *               about_text:
 *                 type: string
 *                 example: Somos um salão especializado em tendências modernas.
 *     responses:
 *       201:
 *         description: Landing page criada com sucesso
 *       400:
 *         description: Dados inválidos ou landing page já existente
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno no servidor
 */
landingPageRouter.post("/:slug", authenticateJWT, createLandingPage)


/**
 * @swagger
 * /api/landing-page/{slug}:
 *   put:
 *     summary: Atualiza os dados da landing page de uma organização
 *     description: Atualiza os campos da landing page existente relacionada ao slug informado.
 *     tags:
 *       - Landing page
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               hero_title:
 *                 type: string
 *                 example: Novo título da seção principal
 *               hero_subtitle:
 *                 type: string
 *                 example: Subtítulo atualizado
 *               about_title:
 *                 type: string
 *                 example: Quem Somos
 *               about_text:
 *                 type: string
 *                 example: Texto atualizado sobre a organização.
 *     responses:
 *       200:
 *         description: Landing page atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Landing page ou organização não encontrada
 *       500:
 *         description: Erro interno no servidor
 */
landingPageRouter.put("/:slug", authenticateJWT, updateLandingPage)