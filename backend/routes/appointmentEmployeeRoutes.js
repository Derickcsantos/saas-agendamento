import { Router } from 'express';
import { getAppointmentEmployeeByService } from '../controllers/appointmentEmployeeController.js';
import { extractOrganizationId } from '../middlewares/authMiddleware.js';

export const appointmentEmployeeRouter = Router();

/**
 * @swagger
 * /api/employees/{serviceId}:
 *   get:
 *     summary: Lista funcionários disponíveis para um serviço
 *     description: Retorna os profissionais qualificados para realizar um serviço específico, com imagens de perfil em base64
 *     tags: [Agendamento]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *         example: 3
 *     responses:
 *       200:
 *         description: Lista de funcionários retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 3
 *                   name:
 *                     type: string
 *                     example: "João Silva"
 *                   imagem_funcionario:
 *                     type: string
 *                     description: Imagem em formato data URL (base64) ou null
 *                     example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *                   is_active:
 *                     type: boolean
 *                     description: Indica se o funcionário está ativo
 *                     example: true
 *       500:
 *         description: Erro interno do servidor
 */
appointmentEmployeeRouter.get('/:serviceId', extractOrganizationId, getAppointmentEmployeeByService);

