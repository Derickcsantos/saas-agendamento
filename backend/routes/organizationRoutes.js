import Router from 'express';
import multer from 'multer';
import {
  getOrganizations,
  getOrganizationById,
  getOrganizationBySlug,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '../controllers/organizationsController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';

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
 *     description: Retorna todas as organizações cadastradas no sistema, ordenadas pela data de criação.
 *     tags: [Organizações]
 *     responses:
 *       200:
 *         description: Lista de organizações retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   slug:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Erro interno do servidor
 */
organizationRouter.get('/', getOrganizations);

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Obtém detalhes de uma organização específica
 *     description: Retorna todos os dados da organização correspondente ao ID informado.
 *     tags: [Organizações]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da organização
 *         example: 1
 *     responses:
 *       200:
 *         description: Organização encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 slug:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
organizationRouter.get('/:id', getOrganizationById);

/**
 * @swagger
 * /api/organizations/slug/{slug}:
 *   get:
 *     summary: Obtém detalhes de uma organização pelo slug
 *     description: Retorna as informações da organização correspondente ao slug informado.
 *     tags: [Organizações]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "studio-bella"
 *     responses:
 *       200:
 *         description: Organização encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 slug:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
organizationRouter.get('/slug/:slug', getOrganizationBySlug);

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Cria uma nova organização
 *     description: Registra uma nova organização no sistema, permitindo envio de imagem (logo) via multipart/form-data.
 *     tags: [Organizações]
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
 *               - slug_organization
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Studio Bella"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contato@studiobella.com"
 *               phone:
 *                 type: string
 *                 example: "(11) 90000-0000"
 *               slug_organization:
 *                 type: string
 *                 example: "studio-bella"
 *               address:
 *                 type: string
 *                 example: "Rua Exemplo, 123 - Centro"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Logo da organização
 *     responses:
 *       201:
 *         description: Organização cadastrada com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */
organizationRouter.post('/', upload.single('image'), createOrganization);

/**
 * @swagger
 * /api/organizations/{slug}:
 *   put:
 *     summary: Atualiza uma organização existente
 *     tags: [Organizações]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "studio-bella"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Studio Bella"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contato@studiobella.com"
 *               phone:
 *                 type: string
 *                 example: "(11) 90000-0000"
 *               slug_organization:
 *                 type: string
 *                 example: "studio-bella"
 *               address:
 *                 type: string
 *                 example: "Rua Exemplo, 123 - Centro"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Logo da organização
 *     responses:
 *       200:
 *         description: Organização atualizada com sucesso
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
organizationRouter.put('/:slug', upload.single('image'), authenticateJWT, requireAdminOfOrganization, updateOrganization);

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
 *         example: "1"
 *     responses:
 *       204:
 *         description: Organização removida com sucesso (sem conteúdo retornado)
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
organizationRouter.delete('/:id', authenticateJWT, requireAdminOfOrganization, deleteOrganization);
