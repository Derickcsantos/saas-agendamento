import { Router } from 'express';
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js';
import multer from 'multer';

const upload = multer({
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      cb(null, true);
    } else {
      cb(new Error('Unexpected field: ' + file.fieldname));
    }
  }
}); 
import {
  getServices,
  getServicesBySlug,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getAdditionalServicesByServiceSlug,
  updateAdditionalServicesByServiceSlug
} from '../controllers/servicesController.js';
import requireActiveSubscription from '../middlewares/requireActiveSubscription.js';

export const serviceRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Serviços
 *     description: Gerenciamento de serviços oferecidos pela organização
 */

/**
 * @swagger
 * /api/admin/services:
 *   get:
 *     summary: Lista completa de serviços (admin)
 *     description: |
 *       Retorna todos os serviços cadastrados na organização,
 *       incluindo informações da categoria associada.
 *       Acesso restrito a usuários autenticados.
 *     tags: [Serviços]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de serviços com detalhes da categoria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceWithCategory'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
serviceRouter.get('/', authenticateJWT, requireActiveSubscription, getServices);


/**
 * @swagger
 * /api/admin/services/slug/{slug}:
 *   get:
 *     summary: Lista serviços de uma organização pelo slug
 *     description: |
 *       Retorna todos os serviços vinculados à organização identificada pelo slug.
 *       Inclui informações da categoria associada.
 *       Acesso restrito a usuários autenticados.
 *     tags: [Serviços]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "barbearia-do-joao"
 *     responses:
 *       200:
 *         description: Lista de serviços da organização
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceWithCategory'
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
serviceRouter.get('/slug/:slug', authenticateJWT, requireActiveSubscription, getServicesBySlug)

serviceRouter.get('/slug/:slug/:serviceId/additional-services', authenticateJWT, requireActiveSubscription, getAdditionalServicesByServiceSlug);
serviceRouter.put('/slug/:slug/:serviceId/additional-services', authenticateJWT, requireActiveSubscription, updateAdditionalServicesByServiceSlug);

/**
 * @swagger
 * /api/admin/services/{id}:
 *   get:
 *     summary: Obtém detalhes de um serviço específico
 *     description: |
 *       Retorna todas as informações de um serviço, incluindo
 *       os dados da categoria associada.
 *       Acesso restrito a usuários autenticados.
 *     tags: [Serviços]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *         example: 12
 *     responses:
 *       200:
 *         description: Detalhes completos do serviço
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceWithCategory'
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Serviço não encontrado
 *       500:
 *         description: Falha interna no servidor
 */
serviceRouter.get('/:id', authenticateJWT, requireActiveSubscription, getServiceById); 

/**
 * @swagger
 * /api/admin/services/{slug}:
 *   post:
 *     summary: Cria um novo serviço para uma organização
 *     description: |
 *       Cria um serviço vinculado a uma organização específica,
 *       identificada pelo slug.
 *       Permite upload de imagem opcional.
 *     tags: [Serviços]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "barbearia-do-joao"
 *     requestBody:
 *       required: true
 *       content:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       400:
 *         description: Dados inválidos ou incompletos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
serviceRouter.post('/:slug', upload.single('image'), authenticateJWT, requireActiveSubscription, createService);

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
serviceRouter.put('/:slug/:id', upload.single('image'), authenticateJWT, requireActiveSubscription, updateService);

/**
 * @swagger
 * /api/admin/services/{slug}/{id}:
 *   delete:
 *     summary: Remove um serviço
 *     description: Remove permanentemente um serviço vinculado a uma organização.
 *     tags: [Serviços]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *         example: "barbearia-do-joao"
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *         example: 12
 *     responses:
 *       204:
 *         description: Serviço removido com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Serviço não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
serviceRouter.delete('/:slug/:id', authenticateJWT, requireActiveSubscription, deleteService); 