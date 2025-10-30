import { Router } from 'express';
import {
  getEmployeeServicesByEmployeeId,
  updateEmployeeServices,
} from '../controllers/employeeServicesController.js';

export const employeeServicesRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Serviços de Funcionários
 *     description: Endpoints para gestão da relação entre funcionários e serviços
 */

/**
 * @swagger
 * /api/employee-services/{employeeId}:
 *   get:
 *     summary: Lista serviços associados a um funcionário
 *     description: Retorna todos os IDs de serviços que um funcionário pode realizar
 *     tags: [Serviços de Funcionários]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de IDs de serviços associados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   service_id:
 *                     type: integer
 *                     description: ID do serviço que o funcionário pode realizar
 *                     example: 5
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
employeeServicesRouter.get('/:employeeId', getEmployeeServicesByEmployeeId);

/**
 * @swagger
 * /api/employee-services/{employeeId}:
 *   put:
 *     summary: Atualiza serviços associados a um funcionário
 *     description: |
 *       Substitui completamente a lista de serviços que um funcionário pode realizar.
 *       Primeiro remove todas as associações existentes e depois cria as novas.
 *     tags: [Serviços de Funcionários]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - service_id
 *                 - employee_id
 *               properties:
 *                 service_id:
 *                   type: integer
 *                   description: ID do serviço a ser associado
 *                   example: 3
 *                 employee_id:
 *                   type: integer
 *                   description: ID do funcionário (deve corresponder ao parâmetro da URL)
 *                   example: 1
 *             example:
 *               - service_id: 3
 *                 employee_id: 1
 *               - service_id: 5
 *                 employee_id: 1
 *     responses:
 *       200:
 *         description: Serviços atualizados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Dados inválidos (IDs inconsistentes ou formato incorreto)
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
employeeServicesRouter.put('/:employeeId', updateEmployeeServices);