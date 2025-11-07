import { Router } from 'express';
import {
  getColorsBySlug,
  getColorsByOrgId,
  createColorsBySlug,
  upsertColorsBySlug,
  deleteColorsBySlug
} from '../controllers/organizationColorsController.js';

export const organizationColorsRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Organization Colors
 *     description: Paleta de cores por organização
 */

/**
 * @swagger
 * /api/organization-colors/{slug}:
 *   get:
 *     summary: Obtém a paleta de cores de uma organização (via slug)
 *     tags: [Organization Colors]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Paleta retornada (ou defaults, se não existir)
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro ao buscar paleta
 */
organizationColorsRouter.get('/:slug', getColorsBySlug);

/**
 * @swagger
 * /api/organization-colors:
 *   get:
 *     summary: Obtém a paleta por organization_id (admin/opcional)
 *     tags: [Organization Colors]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID da organização
 *     responses:
 *       200:
 *         description: Paleta retornada (ou defaults, se não existir)
 *       400:
 *         description: Parâmetro id é obrigatório
 *       500:
 *         description: Erro ao buscar paleta
 */
organizationColorsRouter.get('/', getColorsByOrgId);

/**
 * @swagger
 * /api/organization-colors/{slug}:
 *   post:
 *     summary: Cria a paleta para a organização (falha se já existir)
 *     tags: [Organization Colors]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               strong_color: { type: string, example: "#5E3BEE" }
 *               light_color:  { type: string, example: "#FFFFFF" }
 *               text_color:   { type: string, example: "#111" }
 *     responses:
 *       201:
 *         description: Paleta criada
 *       404:
 *         description: Organização não encontrada
 *       409:
 *         description: Paleta já existe
 *       500:
 *         description: Erro ao criar paleta
 */
organizationColorsRouter.post('/:slug', createColorsBySlug);

/**
 * @swagger
 * /api/organization-colors/{slug}:
 *   put:
 *     summary: Cria ou atualiza (upsert) a paleta da organização
 *     tags: [Organization Colors]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               strong_color: { type: string, example: "#5E3BEE" }
 *               light_color:  { type: string, example: "#FFFFFF" }
 *               text_color:   { type: string, example: "#111" }
 *     responses:
 *       200:
 *         description: Paleta salva
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro ao salvar paleta
 */
organizationColorsRouter.put('/:slug', upsertColorsBySlug);

/**
 * @swagger
 * /api/organization-colors/{slug}:
 *   delete:
 *     summary: Remove a paleta da organização
 *     tags: [Organization Colors]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paleta removida
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro ao remover paleta
 */
organizationColorsRouter.delete('/:slug', deleteColorsBySlug);
