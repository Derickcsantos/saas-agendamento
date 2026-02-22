import { Router } from 'express';
import multer from 'multer';
import {
  getImagesBySlug,
  uploadImageBySlug,
  deleteImageBySlug,
  deleteImagesBatchBySlug
} from '../controllers/galleryController.js';
import requireActiveSubscription from '../middlewares/requireActiveSubscription.js';

const storage = multer.memoryStorage();
const upload = multer({storage})
export const galleryRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Galeria
 *     description: Endpoints para gerenciamento de imagens da galeria (Supabase)
 */

/**
 * @swagger
 * /api/galeria/{slug}:
 *   get:
 *     summary: Lista imagens da galeria por organização (slug)
 *     description: Retorna as imagens de uma organização com paginação e busca opcional por nome.
 *     tags: [Galeria]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Página atual
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Limite de imagens por página
 *       - in: query
 *         name: termo
 *         schema:
 *           type: string
 *         description: Termo para busca pelo nome da imagem
 *     responses:
 *       200:
 *         description: Lista de imagens com metadados
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno
 */
galleryRouter.get('/:slug', requireActiveSubscription, getImagesBySlug);

/**
 * @swagger
 * /api/galeria/{slug}/upload:
 *   post:
 *     summary: Upload de imagem para a galeria de uma organização
 *     description: Faz o upload de uma imagem (com compressão 70%) e a associa à organização.
 *     tags: [Galeria]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagem:
 *                 type: string
 *                 format: binary
 *               titulo:
 *                 type: string
 *               descricao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Upload realizado com sucesso
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro no upload
 */
galleryRouter.post('/:slug/upload', requireActiveSubscription, upload.array('imagens[]', 10), uploadImageBySlug);


/**
 * @swagger
 * /api/galeria/{slug}/batch:
 *   delete:
 *     summary: Exclusão em lote de imagens
 *     tags: [Galeria]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Imagens removidas com sucesso
 */
galleryRouter.delete(
  '/:slug/batch',
  requireActiveSubscription,
  deleteImagesBatchBySlug
);

/**
 * @swagger
 * /api/galeria/{slug}/{id}:
 *   delete:
 *     summary: Exclui imagem da galeria
 *     description: Remove a imagem do Supabase Storage e do banco de dados.
 *     tags: [Galeria]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da imagem
 *     responses:
 *       200:
 *         description: Imagem excluída com sucesso
 *       404:
 *         description: Imagem ou organização não encontrada
 *       500:
 *         description: Erro interno
 */
galleryRouter.delete('/:slug/:id', deleteImageBySlug);
