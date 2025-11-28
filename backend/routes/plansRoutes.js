import { Router } from "express";
import {
  getPlans,
  getPlansByOrganization,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} from "../controllers/plansController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

export const plansRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Plans
 *   description: Gestão de planos
 */

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Lista todos os planos
 *     tags: [Plans]
 *     responses:
 *       200:
 *         description: Lista de planos retornada com sucesso
 */
plansRouter.get("/", getPlans);

/**
 * @swagger
 * /plans/organization/{slug}:
 *   get:
 *     summary: Lista os planos de uma organização específica
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 *       404:
 *         description: Organização não encontrada
 */
plansRouter.get("/organization/:slug", getPlansByOrganization);

/**
 * @swagger
 * /plans/{id}:
 *   get:
 *     summary: Retorna um plano pelo ID
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do plano
 *     responses:
 *       200:
 *         description: Plano encontrado
 *       404:
 *         description: Plano não encontrado
 */
plansRouter.get("/:id", getPlanById);

/**
 * @swagger
 * /plans:
 *   post:
 *     summary: Cria um novo plano
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name_plan:
 *                 type: string
 *               price_plan:
 *                 type: number
 *               description_plan:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Plano criado com sucesso
 */
plansRouter.post("/", authenticateJWT, createPlan);

/**
 * @swagger
 * /plans/{id}:
 *   put:
 *     summary: Atualiza um plano existente
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do plano
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name_plan:
 *                 type: string
 *               price_plan:
 *                 type: number
 *               description_plan:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Plano atualizado com sucesso
 */
plansRouter.put("/:id", authenticateJWT, updatePlan);

/**
 * @swagger
 * /plans/{id}:
 *   delete:
 *     summary: Remove um plano
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do plano
 *     responses:
 *       200:
 *         description: Registro removido
 */
plansRouter.delete("/:id", authenticateJWT, deletePlan);
