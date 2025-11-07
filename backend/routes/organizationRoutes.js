import Router from 'express';
import multer from 'multer';
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '../controllers/organizationsController.js';

export const organizationRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   - name: Organizações
 *     description: Endpoints para gestão das organizações que usarão o sistema.
 */

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Lista todas as Organizações
 *     tags: [Organizações]
 *     responses:
 *       200:
 *         description: Lista de todas as organizações, ordenadas por data de cadastro
 *       500:
 *         description: Erro interno do servidor
 */
organizationRouter.get('/', getOrganizations);

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Obtém detalhes de uma organização específica
 *     tags: [Organizações]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da organização
 *     responses:
 *       200:
 *         description: Organização encontrada
 *       404:
 *         description: Organização não encontrada
 */
organizationRouter.get('/:id', getOrganizationById);

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Cria uma nova organização
 *     tags: [Organizações]
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
 *               phone:
 *                 type: string
 *               slug_organization:
 *                 type: string
 *               address:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Categoria cadastrada com sucesso
 */
organizationRouter.post('/', upload.single('image'), createOrganization);

/**
 * @swagger
 * /api/organizations/{id}:
 *   put:
 *     summary: Atualiza uma organização existente
 *     tags: [Organizações]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização
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
 *               phone:
 *                 type: string
 *               slug_organization:
 *                 type: string
 *               address:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Organização atualizada com sucesso
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
organizationRouter.put('/:id', upload.single('image'), updateOrganization);

/**
 * @swagger
 * /api/organizations/{id}:
 *   delete:
 *     summary: Remove uma organização
 *     tags: [Organizações]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização a ser removida
 *     responses:
 *       204:
 *         description: Organização removida com sucesso
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
organizationRouter.delete('/:id', deleteOrganization);
