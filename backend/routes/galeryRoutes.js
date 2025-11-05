import { Router } from 'express';
import {
  getImages,
  getImageById,
  getImageBySearch,
  addImage,
  deleteImage,
} from '../controllers/galeryController.js';
import multer from 'multer';
const upload = multer(); 

export const galeryRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Galeria
 *     description: Endpoints para gerenciamento de imagens na galeria
 */
/**
 * @swagger
 * /api/galeria:
 *   get:
 *     summary: Lista todas as imagens (apenas metadados)
 *     description: Retorna a lista de todas as imagens da galeria sem os dados binários, ordenadas por data de criação (mais recentes primeiro)
 *     tags: [Galeria]
 *     responses:
 *       200:
 *         description: Lista de imagens retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ImagemMetadata'
 *       500:
 *         description: Erro ao carregar galeria
 */
galeryRouter.get('/', getImages);

/**
 * @swagger
 * /api/galeria/imagem/{id}:
 *   get:
 *     summary: Recupera a imagem binária
 *     description: Retorna os dados binários da imagem com o Content-Type apropriado
 *     tags: [Galeria]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da imagem
 *     responses:
 *       200:
 *         description: Imagem retornada com sucesso
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Imagem não encontrada
 *       500:
 *         description: Erro no servidor
 */
galeryRouter.get('/imagem/:id', getImageById);

/**
 * @swagger
 * /api/galeria/busca:
 *   get:
 *     summary: Busca imagens por título
 *     description: Busca imagens cujo título corresponda ao termo (case insensitive)
 *     tags: [Galeria]
 *     parameters:
 *       - in: query
 *         name: termo
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo para busca
 *         example: "paisagem"
 *     responses:
 *       200:
 *         description: Resultados da busca
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ImagemMetadata'
 *       400:
 *         description: Termo de busca é obrigatório
 *       500:
 *         description: Erro ao buscar imagens
 */
galeryRouter.get('/busca', getImageBySearch);

/**
 * @swagger
 * /api/galeria/upload:
 *   post:
 *     summary: Faz upload de uma nova imagem
 *     description: Envia uma imagem para a galeria com título opcional
 *     tags: [Galeria]
 *     consumes:
 *       - multipart/form-data
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
 *                 description: Arquivo de imagem a ser enviado
 *               titulo:
 *                 type: string
 *                 description: Título opcional para a imagem
 *                 example: "Minha Foto"
 *     responses:
 *       200:
 *         description: Upload realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 id:
 *                   type: string
 *                   description: ID da imagem no banco de dados
 *                 titulo:
 *                   type: string
 *                   description: Título da imagem
 *                 criadoEm:
 *                   type: string
 *                   format: date-time
 *                   description: Data de criação
 *       400:
 *         description: Nenhuma imagem foi enviada
 *       500:
 *         description: Falha ao salvar imagem
 */
galeryRouter.post('/upload', upload.single('imagem'), addImage);

/**
 * @swagger
 * /api/galeria/{id}:
 *   delete:
 *     summary: Exclui uma imagem
 *     description: Remove permanentemente uma imagem da galeria
 *     tags: [Galeria]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da imagem a ser excluída
 *     responses:
 *       200:
 *         description: Imagem excluída com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Imagem excluída com sucesso"
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Imagem não encontrada
 *       500:
 *         description: Erro ao excluir imagem
 */
galeryRouter.delete('/:id', deleteImage);