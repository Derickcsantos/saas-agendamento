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
 * /api/admin/employees/{slug}:
 *   get:
 *     summary: Lista todos os funcionários com detalhes
 *     description: Retorna todos os funcionários registrados na organização, incluindo serviços associados e horários de trabalho.
 *     tags: [Funcionários]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador único da organização
 *
 *     responses:
 *       200:
 *         description: Lista completa de funcionários com seus dados e serviços
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EmployeeWithDetails'
 *
 *       401:
 *         description: Token inválido ou não fornecido
 *
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
 * /api/admin/employees/{slug}/{id}:
 *   get:
 *     summary: Obtém detalhes de um funcionário específico
 *     description: Retorna os dados completos do funcionário, incluindo imagem convertida para Data URL se existir.
 *     tags: [Funcionários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     responses:
 *       200:
 *         description: Dados completos do funcionário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeWithDetails'
 *       404:
 *         description: Funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminEmployeeRouter.get('/:slug/:id', authenticateJWT, requireAdminOfOrganization, getEmployeeById);

/**
 * @swagger
 * /api/admin/employees/{slug}:
 *   post:
 *     summary: Cadastra um novo funcionário
 *     description: Cria um funcionário vinculado à organização autenticada. Suporta upload de imagem via multipart/form-data.
 *     tags: [Funcionários]
 *     security:
 *       - bearerAuth: []    # Requer JWT
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
 *                 description: Percentual de comissão do funcionário
 *                 example: 10.5
 *               is_active:
 *                 type: boolean
 *                 description: Define se o funcionário está ativo
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
 *         description: Dados inválidos ou incompletos enviados ao servidor
 *       401:
 *         description: Token JWT ausente ou inválido
 *       500:
 *         description: Erro interno do servidor
 */
adminEmployeeRouter.post('/:slug', authenticateJWT, requireAdminOfOrganization, upload.single('image'), createEmployee);

/**
 * @swagger
 * /api/admin/employees/{slug}/{id}:
 *   put:
 *     summary: Atualiza os dados de um funcionário existente
 *     description: Atualiza os dados de um funcionário vinculado à organização autenticada. Suporta envio de nova imagem via multipart/form-data.
 *     tags: [Funcionários]
 *     security:
 *       - bearerAuth: []    # Requer autenticação JWT
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário que será atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
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
 *                 example: 12.5
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Nova imagem do funcionário (opcional)
 *     responses:
 *       200:
 *         description: Funcionário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Dados inválidos enviados pelo cliente
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminEmployeeRouter.put('/:slug/:id', authenticateJWT, requireAdminOfOrganization, upload.single('image'), updateEmployee);

/**
 * @swagger
 * /api/admin/employees/{slug}/{id}:
 *   delete:
 *     summary: Remove um funcionário e todos os seus horários associados
 *     description: Exclui um funcionário pertencente à organização autenticada, removendo também seus horários de trabalho.
 *     tags: [Funcionários]
 *     security:
 *       - bearerAuth: []   # Requer autenticação JWT
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário que será removido
 *     responses:
 *       204:
 *         description: Funcionário removido com sucesso (sem corpo de resposta)
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
adminEmployeeRouter.delete('/:slug/:id', authenticateJWT, requireAdminOfOrganization, deleteEmployee);