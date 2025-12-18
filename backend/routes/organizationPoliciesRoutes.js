import Router from "express";
import {
  getOrganizationPolicies,
  updateOrganizationPolicies,
} from "../controllers/organizationPoliciesController.js";

export const organizationPoliciesRouter = Router();

/**
 * @swagger
 * /api/organization-policies/{slug}:
 *   get:
 *     summary: Obtém as políticas da organização (via slug)
 *     description: Retorna as políticas configuradas na tabela correspondente para a organização informada.
 *     tags: [Organization Policies]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug da organização
 *     responses:
 *       200:
 *         description: Políticas retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cancellation_policy:
 *                   type: string
 *                 terms_of_service:
 *                   type: string
 *                 privacy_policy:
 *                   type: string
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro ao buscar políticas
 */
organizationPoliciesRouter.get("/:slug", getOrganizationPolicies);


/**
 * @swagger
 * /api/organization-policies/{slug}:
 *   put:
 *     summary: Atualiza as políticas da organização
 *     description: Cria ou atualiza as políticas vinculadas ao slug informado.
 *     tags: [Organization Policies]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellation_policy:
 *                 type: string
 *                 example: "Cancelamentos devem ser feitos com 2h de antecedência."
 *               terms_of_service:
 *                 type: string
 *                 example: "Ao utilizar nossos serviços, você concorda com..."
 *               privacy_policy:
 *                 type: string
 *                 example: "Seus dados serão usados somente para..."
 *     responses:
 *       200:
 *         description: Políticas atualizadas com sucesso
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro ao atualizar políticas
 */
organizationPoliciesRouter.put("/:slug", updateOrganizationPolicies);

