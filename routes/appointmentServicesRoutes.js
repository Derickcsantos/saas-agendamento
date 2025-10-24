import { Router } from 'express';
import { getAppointmentServices, getAppointmentServicesByCategory } from '../controllers/appointmentServicesController.js';
import { extractOrganizationId } from '../middlewares/authMiddleware.js';

export const appointmentServicesRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Serviços
 *     description: Endpoints para gestão de serviços
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Lista todos os serviços disponíveis
 *     description: Retorna todos os serviços cadastrados no sistema, ordenados por nome
 *     tags: [Serviços]
 *     responses:
 *       200:
 *         description: Lista de serviços retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Service'
 *       500:
 *         description: Erro interno do servidor
 */
appointmentServicesRouter.get('/', extractOrganizationId, getAppointmentServices);

/**
 * @swagger
 * /api/services/{categoryId}:
 *   get:
 *     summary: Lista serviços de uma categoria específica
 *     description: Retorna todos os serviços disponíveis para uma categoria, com imagens convertidas para base64
 *     tags: [Agendamento]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da categoria
 *         example: 2
 *     responses:
 *       200:
 *         description: Lista de serviços retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 5
 *                   name:
 *                     type: string
 *                     example: "Corte masculino"
 *                   price:
 *                     type: number
 *                     format: float
 *                     example: 45.90
 *                   duration:
 *                     type: integer
 *                     description: Duração em minutos
 *                     example: 30
 *                   imagem_service:
 *                     type: string
 *                     description: Imagem em formato data URL (base64) ou null
 *                     example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *       500:
 *         description: Erro interno do servidor
 */
appointmentServicesRouter.get('/:categoryId', extractOrganizationId, getAppointmentServicesByCategory);