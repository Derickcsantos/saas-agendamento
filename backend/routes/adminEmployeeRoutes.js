import { Router } from 'express';
import { 
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../controllers/adminEmployeesController.js';  
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js';
import { create } from 'domain';
import multer from 'multer';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';
const upload = multer(); 

export const adminEmployeeRouter = Router();


/**
 * @swagger
 * tags:
 *   - name: Funcionários
 *     description: Endpoints para gestão de funcionários/profissionais
 */

/**
 * @swagger
 * /api/admin/employees:
 *   get:
 *     summary: Lista todos os funcionários com detalhes
 *     description: Retorna todos os funcionários cadastrados com seus serviços associados e horários de trabalho
 *     tags: [Funcionários]
 *     responses:
 *       200:
 *         description: Lista completa de funcionários com detalhes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EmployeeWithDetails'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
adminEmployeeRouter.get('/:slug', authenticateJWT, requireAdminOfOrganization, getEmployees);

/**
 * @swagger
 * /api/admin/employees/{id}:
 *   get:
 *     summary: Obtém detalhes de um funcionário específico
 *     description: Retorna os dados completos de um funcionário, convertendo a imagem para data URL se existir
 *     tags: [Funcionários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     responses:
 *       200:
 *         description: Dados do funcionário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminEmployeeRouter.get('/:slug/:id', authenticateJWT, requireAdminOfOrganization, getEmployeeById);

/**
 * @swagger
 * /api/admin/employees:
 *   post:
 *     summary: Cadastra um novo funcionário
 *     tags: [Funcionários]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@exemplo.com"
 *               phone:
 *                 type: string
 *                 example: "11999998888"
 *               comissao:
 *                 type: number
 *                 format: float
 *                 description: Percentual de comissão
 *                 example: 10.5
 *               is_active:
 *                 type: boolean
 *                 description: Status do funcionário
 *                 example: true
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Foto do funcionário (opcional)
 *     responses:
 *       201:
 *         description: Funcionário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Dados inválidos ou faltando
 *       500:
 *         description: Erro interno do servidor
 */
adminEmployeeRouter.post('/:slug', authenticateJWT, requireAdminOfOrganization, upload.single('image'), createEmployee);

/**
 * @swagger
 * /api/admin/employees/{id}:
 *   put:
 *     summary: Atualiza um funcionário existente
 *     tags: [Funcionários]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               comissao:
 *                 type: number
 *                 format: float
 *               is_active:
 *                 type: boolean
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Nova foto do funcionário (opcional)
 *     responses:
 *       200:
 *         description: Funcionário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminEmployeeRouter.put('/:slug/:id', authenticateJWT, requireAdminOfOrganization, upload.single('image'), updateEmployee);

/**
 * @swagger
 * /api/admin/employees/{id}:
 *   delete:
 *     summary: Remove um funcionário e seus horários associados
 *     tags: [Funcionários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     responses:
 *       204:
 *         description: Funcionário e horários removidos com sucesso
 *       404:
 *         description: Funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminEmployeeRouter.delete('/:slug/:id', authenticateJWT, requireAdminOfOrganization, deleteEmployee);