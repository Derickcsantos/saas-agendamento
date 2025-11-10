import { Router } from 'express';
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js';
import multer from 'multer';
const upload = multer(); 
import {
  getServices,
  getServicesBySlug,
  getServiceById,
  createService,
  updateService,
  deleteService
} from '../controllers/servicesController.js';

export const serviceRouter = Router();

/**
 * @swagger
 * /api/admin/services:
 *   get:
 *     summary: Lista completa de serviços (admin)
 *     description: Retorna todos os serviços com informações da categoria associada
 *     tags: [Serviços]
 *     responses:
 *       200:
 *         description: Lista de serviços com detalhes da categoria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceWithCategory'
 *       500:
 *         description: Erro interno do servidor
 */
serviceRouter.get('/', authenticateJWT, extractOrganizationId, getServices);

serviceRouter.get('/slug/:slug', authenticateJWT, getServicesBySlug)

/**
 * @swagger
 * /api/admin/services/{id}:
 *   get:
 *     summary: Obtém detalhes de um serviço específico
 *     tags: [Serviços]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *     responses:
 *       200:
 *         description: Detalhes completos do serviço
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceWithCategory'
 *       404:
 *         description: Serviço não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
serviceRouter.get('/:id', authenticateJWT, extractOrganizationId, getServiceById); 

/**
 * @swagger
 * /api/admin/services:
 *   post:
 *     summary: Cria um novo serviço
 *     tags: [Serviços]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - name
 *               - duration
 *               - price
 *             properties:
 *               category_id:
 *                 type: integer
 *                 description: ID da categoria associada
 *                 example: 1
 *               name:
 *                 type: string
 *                 description: Nome do serviço
 *                 example: "Corte de Cabelo"
 *               description:
 *                 type: string
 *                 description: Descrição detalhada do serviço
 *                 example: "Corte profissional com técnicas modernas"
 *               duration:
 *                 type: integer
 *                 description: Duração em minutos
 *                 example: 30
 *               price:
 *                 type: number
 *                 format: float
 *                 description: Preço do serviço
 *                 example: 50.00
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagem ilustrativa do serviço (opcional)
 *     responses:
 *       201:
 *         description: Serviço criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       400:
 *         description: Dados inválidos ou faltando
 *       500:
 *         description: Erro interno do servidor
 */
// Rota POST de serviços
serviceRouter.post('/', upload.single('image'), authenticateJWT, extractOrganizationId, createService);

/**
 * @swagger
 * /api/admin/services/{id}:
 *   put:
 *     summary: Atualiza um serviço existente
 *     tags: [Serviços]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               category_id:
 *                 type: integer
 *                 example: 2
 *               name:
 *                 type: string
 *                 example: "Corte Premium"
 *               description:
 *                 type: string
 *                 example: "Corte com técnicas avançadas"
 *               duration:
 *                 type: integer
 *                 example: 45
 *               price:
 *                 type: number
 *                 example: 75.00
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Nova imagem do serviço (opcional)
 *     responses:
 *       200:
 *         description: Serviço atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       404:
 *         description: Serviço não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
serviceRouter.put('/:id', upload.single('image'), authenticateJWT, extractOrganizationId, updateService);

/**
 * @swagger
 * /api/admin/services/{id}:
 *   delete:
 *     summary: Remove um serviço
 *     tags: [Serviços]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *     responses:
 *       204:
 *         description: Serviço removido com sucesso
 *       404:
 *         description: Serviço não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
serviceRouter.delete('/:id', authenticateJWT, extractOrganizationId, deleteService); 