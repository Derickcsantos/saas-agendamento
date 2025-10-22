import Router from 'express';
import multer from 'multer';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoriesController.js';
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js';

export const categoryRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   - name: Categorias
 *     description: Endpoints para gestão de categorias de serviços por organização (admin)
 */

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Lista todas as categorias da organização autenticada
 *     tags: [Categorias]
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização cujas categorias serão listadas
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorias da organização, ordenadas por nome
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       401:
 *         description: Token ausente ou inválido
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.get('/', authenticateJWT, extractOrganizationId, getAllCategories);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   get:
 *     summary: Obtém detalhes de uma categoria específica da organização
 *     tags: [Categorias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da categoria
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização da categoria
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dados completos da categoria
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.get('/:id', authenticateJWT, extractOrganizationId, getCategoryById);

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Cria uma nova categoria para a organização autenticada
 *     tags: [Categorias]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização na qual a categoria será criada
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da categoria
 *                 example: "Cabelo"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagem da categoria (opcional)
 *     responses:
 *       201:
 *         description: Categoria criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token ausente ou inválido
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.post('/', authenticateJWT, extractOrganizationId, upload.single('image'), createCategory);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Atualiza uma categoria existente da organização
 *     tags: [Categorias]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da categoria
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização à qual a categoria pertence
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Novo nome da categoria
 *                 example: "Cabelo e Barba"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Nova imagem da categoria (opcional)
 *     responses:
 *       200:
 *         description: Categoria atualizada com sucesso
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.put('/:id', authenticateJWT, extractOrganizationId, upload.single('image'), updateCategory);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Remove uma categoria de uma organização
 *     tags: [Categorias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da categoria a ser removida
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização à qual a categoria pertence
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       204:
 *         description: Categoria removida com sucesso
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.delete('/:id', authenticateJWT, extractOrganizationId, deleteCategory);
