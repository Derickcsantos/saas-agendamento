import Router from 'express';
import multer from 'multer';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoriesController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';
import requireActiveSubscription from '../middlewares/requireActiveSubscription.js';

export const categoryRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   - name: Categorias
 *     description: Endpoints para gestão de categorias de serviços por organização (admin)
 */

/**
/**
 * @swagger
 * /api/admin/categories/{slug}:
 *   get:
 *     summary: Lista todas as categorias da organização autenticada
 *     tags: [Categorias]
 *     description: |
 *       Retorna todas as categorias pertencentes à organização identificada pelo slug.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug único da organização
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
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.get('/:slug', authenticateJWT, requireActiveSubscription, getAllCategories);


/**
 * @swagger
 * /api/admin/categories/{id}:
 *   get:
 *     summary: Obtém detalhes de uma categoria específica da organização autenticada
 *     tags: [Categorias]
 *     description: |
 *       Retorna os detalhes de uma categoria específica.  
 *       A organização é identificada automaticamente pelo token JWT.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da categoria que será consultada
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dados completos da categoria
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.get('/:id', authenticateJWT, requireAdminOfOrganization, requireActiveSubscription, getCategoryById);

/**
 * @swagger
 * /api/admin/categories/{slug}:
 *   post:
 *     summary: Cria uma nova categoria para a organização autenticada
 *     description: |
 *       Cria uma categoria vinculada à organização identificada pelo token JWT.
 *       O parâmetro `slug` representa a organização no contexto público.
 *     tags: [Categorias]
 *     security:
 *       - cookieAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug público da organização
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token ausente ou inválido
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.post('/:slug', authenticateJWT, requireAdminOfOrganization, requireActiveSubscription, upload.single('image'), createCategory);

/**
 * @swagger
 * /api/admin/categories/{slug}/{id}:
 *   put:
 *     summary: Atualiza uma categoria existente da organização autenticada
 *     description: |
 *       Atualiza os dados de uma categoria pertencente à organização identificada
 *       pelo token JWT. O `slug` define qual organização está sendo acessada.
 *     tags: [Categorias]
 *     security:
 *       - cookieAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da categoria que será atualizada
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.put('/:slug/:id', authenticateJWT, requireActiveSubscription,  upload.single('image'), updateCategory);

/**
 * @swagger
 * /api/admin/categories/{slug}/{id}:
 *   delete:
 *     summary: Remove uma categoria da organização autenticada
 *     description: |
 *       Exclui uma categoria pertencente à organização definida pelo slug,
 *       validada pelo token JWT.
 *     tags: [Categorias]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da categoria que será removida
 *     responses:
 *       204:
 *         description: Categoria removida com sucesso (sem corpo de resposta)
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
categoryRouter.delete('/:slug/:id', authenticateJWT, requireAdminOfOrganization, requireActiveSubscription, deleteCategory);
