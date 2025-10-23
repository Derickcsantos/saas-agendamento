import { Router } from 'express';
import { authenticateJWT, extractOrganizationId } from '../middlewares/authMiddleware.js';
import {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon  
} from '../controllers/couponController.js';

export const couponRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Cupons
 *     description: Endpoints para gestão e validação de cupons de desconto
 */

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Lista todos os cupons
 *     description: Retorna todos os cupons cadastrados, ordenados por data de criação (mais recentes primeiro)
 *     tags: [Cupons]
 *     responses:
 *       200:
 *         description: Lista de cupons retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Coupon'
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.get('/', authenticateJWT, extractOrganizationId, getCoupons);

/**
 * @swagger
 * /api/coupons/{id}:
 *   get:
 *     summary: Obtém detalhes de um cupom específico
 *     tags: [Cupons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cupom
 *     responses:
 *       200:
 *         description: Dados do cupom
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Coupon'
 *       404:
 *         description: Cupom não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.get('/:id', authenticateJWT, extractOrganizationId, getCouponById);

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Cria um novo cupom
 *     tags: [Cupons]
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
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.post('/', authenticateJWT, extractOrganizationId, createCoupon);

/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Atualiza um cupom existente
 *     tags: [Cupons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cupom
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
 *       404:
 *         description: Cupom não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.put('/:id', authenticateJWT, extractOrganizationId, updateCoupon);

/**
 * @swagger
 * /api/coupons/{id}:
 *   delete:
 *     summary: Remove um cupom
 *     tags: [Cupons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cupom
 *     responses:
 *       204:
 *         description: Cupom removido com sucesso
 *       404:
 *         description: Cupom não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
couponRouter.delete('/:id', authenticateJWT, extractOrganizationId, deleteCoupon);