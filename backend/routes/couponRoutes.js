import { Router } from 'express';
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js';
import {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,  
  validateCoupon,
  validateCouponMarcafy
} from '../controllers/couponController.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';

export const couponRouter = Router();

/**
 * @swagger
 * /api/coupons/validate-coupon/{slug}:
 *   get:
 *     summary: Valida um cupom para um serviço específico
 *     description: Verifica se um cupom é válido para aplicação em um determinado serviço.
 *     tags: [Cupons]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código do cupom a ser validado
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço para o qual o cupom será aplicado
 *     responses:
 *       200:
 *         description: Resultado da validação do cupom
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: Indica se o cupom é válido
 *                 message:
 *                   type: string
 *                   description: Mensagem detalhando o resultado
 *                 discount:
 *                   type: number
 *                   description: Valor do desconto (se válido)
 *                 discountType:
 *                   type: string
 *                   enum: [percentage, fixed]
 *                   description: Tipo de desconto (se válido)
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.get('/validate-coupon/:slug', validateCoupon)

couponRouter.get('/validate', validateCouponMarcafy)

/**
 * @swagger
 * tags:
 *   - name: Cupons
 *     description: Endpoints para gestão e validação de cupons de desconto
 */

/**
 * @swagger
 * /api/coupons/{slug}:
 *   get:
 *     summary: Lista cupons de um salão específico
 *     description: 
 *       Retorna todos os cupons associados ao salão identificado pelo `slug`.
 *       O retorno é ordenado por data de criação (mais recentes primeiro).
 *     tags: [Cupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do salão para buscar seus cupons
 *     responses:
 *       200:
 *         description: Lista de cupons retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Coupon'
 *       401:
 *         description: Token inválido ou não fornecido
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.get('/:slug', authenticateJWT, getCoupons);

/**
 * @swagger
 * /api/coupons/{slug}/{id}:
 *   get:
 *     summary: Obtém detalhes de um cupom específico
 *     description: Retorna os detalhes de um cupom pertencente ao salão identificado pelo `slug`.
 *     tags: [Cupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do salão
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cupom que será consultado
 *     responses:
 *       200:
 *         description: Dados do cupom retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Coupon'
 *       401:
 *         description: Token inválido ou não fornecido
 *       404:
 *         description: Cupom não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.get('/:slug/:id', authenticateJWT, getCouponById);


/**
 * @swagger
 * /api/coupons/{slug}:
 *   post:
 *     summary: Cria um novo cupom
 *     description: Cria um novo cupom associado ao salão identificado pelo `slug`.
 *     tags: [Cupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do salão ao qual o cupom será vinculado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CouponInput'
 *     responses:
 *       201:
 *         description: Cupom criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Coupon'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.post('/:slug', authenticateJWT, requireAdminOfOrganization, createCoupon);

/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Atualiza um cupom existente
 *     description: Atualiza os dados de um cupom já cadastrado.
 *     tags: [Cupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cupom a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CouponInput'
 *     responses:
 *       200:
 *         description: Cupom atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Coupon'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Cupom não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.put('/:slug/:id', authenticateJWT, requireAdminOfOrganization, updateCoupon);

/**
 * @swagger
 * /api/coupons/{slug}/{id}:
 *   delete:
 *     summary: Remove um cupom
 *     description: Remove um cupom de uma organização específica.
 *     tags: [Cupons]
 *     security:
 *       - bearerAuth: []
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
 *           type: integer
 *         description: ID do cupom
 *     responses:
 *       204:
 *         description: Cupom removido com sucesso (sem corpo)
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Cupom não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.delete('/:slug/:id', authenticateJWT, requireAdminOfOrganization, deleteCoupon);
