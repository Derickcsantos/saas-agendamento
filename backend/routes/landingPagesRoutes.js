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

landingPageRouter.post("/:slug", authenticateJWT, createLandingPage)

landingPageRouter.put("/:slug", authenticateJWT, updateLandingPage)