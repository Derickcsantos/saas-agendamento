import { Router } from 'express';
import { getAppointmentCategories } from '../controllers/appointmentCategoriesController.js';
import { extractOrganizationId } from '../middlewares/authMiddleware.js';

export const appointmentCategoryRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Agendamento
 *     description: Endpoints para o processo de agendamento online
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Lista todas as categorias de serviços disponíveis para uma organização
 *     description: Retorna todas as categorias cadastradas no sistema para a organização especificada com suas imagens convertidas para formato base64
 *     tags: [Agendamento]
 *     parameters:
 *       - in: header
 *         name: organization-id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da organização
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         required: false
 *         description: ID da organização (alternativa ao header)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Lista de categorias retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "Cabelo"
 *                   imagem_category:
 *                     type: string
 *                     description: Imagem em formato data URL (base64) ou null
 *                     example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *                   organization_id:
 *                     type: string
 *                     description: ID da organização à qual a categoria pertence
 *                     example: "123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: ID da organização não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Organization ID é obrigatório"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

appointmentCategoryRouter.get('/', extractOrganizationId, getAppointmentCategories)