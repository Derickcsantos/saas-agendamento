import { Router } from 'express';
import { 
  getAppointmentCategories,
  getAppointmentServices, 
  getAppointmentServicesByCategory,
  getAppointmentEmployeeByService,
  getAppointmentAdditionalServices,
  getAvailableTimes
} from '../controllers/appointmentProccessController.js';
import requireActiveSubscription from '../middlewares/requireActiveSubscription.js';


export const appointmentProcessRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Processo de Agendamentos
 *     description: Endpoints envolvidos no fluxo de criação de um agendamento
 */

/**
 * @swagger
 * /api/process/categories/{slug}:
 *   get:
 *     summary: Lista categorias disponíveis para agendamentos
 *     tags: [Processo de Agendamentos]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Lista de categorias
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       500:
 *         description: Erro interno do servidor
 */
appointmentProcessRouter.get('/categories/:slug', getAppointmentCategories);

/**
 * @swagger
 * /api/process/services:
 *   get:
 *     summary: Lista todos os serviços disponíveis no sistema
 *     tags: [Processo de Agendamentos]
 *     responses:
 *       200:
 *         description: Lista de serviços
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Service'
 *       500:
 *         description: Erro interno do servidor
 */
appointmentProcessRouter.get('/services', getAppointmentServices);

/**
 * @swagger
 * /api/process/services/{categoryId}/{slug}:
 *   get:
 *     summary: Lista serviços pertencentes a uma categoria específica
 *     tags: [Processo de Agendamentos]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da categoria
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Lista de serviços da categoria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Service'
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
appointmentProcessRouter.get('/services/:categoryId/:slug', getAppointmentServicesByCategory);

/**
 * @swagger
 * /api/process/employees/{serviceId}/{slug}:
 *   get:
 *     summary: Lista funcionários que executam um determinado serviço
 *     tags: [Processo de Agendamentos]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Lista de funcionários disponíveis para o serviço
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Serviço não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
appointmentProcessRouter.get('/employees/:serviceId/:slug', getAppointmentEmployeeByService);
appointmentProcessRouter.get('/additional-services/:serviceId/:employeeId/:slug', getAppointmentAdditionalServices);

/**
 * @swagger
 * /api/process/available-times/{slug}:
 *   get:
 *     summary: Lista horários disponíveis para agendamento
 *     tags: [Processo de Agendamentos]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: integer
 *         description: ID do serviço selecionado
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data desejada para agendamento (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de horários disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 example: "14:30"
 *       400:
 *         description: Parâmetros inválidos ou faltando
 *       500:
 *         description: Erro interno do servidor
 */
appointmentProcessRouter.get('/available-times/:slug', getAvailableTimes);
