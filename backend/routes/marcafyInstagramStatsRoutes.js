import { scrapeInstagramProfile } from '../controllers/marcafyInstagramStatsController.js'
import { Router } from 'express'

export const marcafyInstagramStatsRouter = Router()

/**
 * @swagger
 * tags:
 *   - name: Marcafy Instagram Stats
 *     description: Estatísticas e dados do Instagram da Marcafy
 */

/**
 * @swagger
 * /api/marcafy-instagram-stats:
 *   get:
 *     summary: Obtém estatísticas do perfil do Instagram da Marcafy
 *     description: Realiza scraping do perfil oficial do Instagram da Marcafy e retorna estatísticas públicas
 *     tags: [Marcafy Instagram Stats]
 *     responses:
 *       200:
 *         description: Estatísticas do Instagram obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followers:
 *                   type: integer
 *                   description: Número de seguidores
 *                   example: 15420
 *                 following:
 *                   type: integer
 *                   description: Número de contas seguidas
 *                   example: 320
 *                 posts:
 *                   type: integer
 *                   description: Número de posts
 *                   example: 250
 *                 biography:
 *                   type: string
 *                   description: Biografia do perfil
 *                 profilePicture:
 *                   type: string
 *                   description: URL da foto de perfil
 *       500:
 *         description: Erro ao obter estatísticas do Instagram
 */
marcafyInstagramStatsRouter.get('/', scrapeInstagramProfile)
