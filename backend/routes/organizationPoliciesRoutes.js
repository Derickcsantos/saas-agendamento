import Router from "express";
import {
  getOrganizationPolicies,
  updateOrganizationPolicies,
  hasSecretCode,
  verifySecretCodeEndpoint,
} from "../controllers/organizationPoliciesController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { requireAdminOfOrganization } from "../middlewares/requireAdminOfOrganization.js";
import requireActiveSubscription from "../middlewares/requireActiveSubscription.js";

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
organizationPoliciesRouter.put("/:slug", authenticateJWT, requireAdminOfOrganization, requireActiveSubscription, updateOrganizationPolicies);

/**
 * @swagger
 * /api/organization-policies/{slug}/has-secret-code:
 *   get:
 *     summary: Verifica se a organização tem um secret code definido
 *     description: Retorna um booleano indicando se já existe um código de segurança cadastrado
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
 *         description: Status do secret code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasSecretCode:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro ao verificar secret code
 */
organizationPoliciesRouter.get("/:slug/has-secret-code", authenticateJWT, requireAdminOfOrganization, hasSecretCode);

/**
 * @swagger
 * /api/organization-policies/{slug}/verify-secret-code:
 *   post:
 *     summary: Verifica se o secret code fornecido está correto
 *     description: Valida o código de segurança de 4 dígitos contra o código armazenado criptografado
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
 *             required:
 *               - secret_code
 *             properties:
 *               secret_code:
 *                 type: string
 *                 description: Código de 4 dígitos a ser verificado
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Código verificado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verified:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Código inválido ou não definido
 *       401:
 *         description: Código incorreto
 *       500:
 *         description: Erro ao verificar código
 */
organizationPoliciesRouter.post("/:slug/verify-secret-code", authenticateJWT, requireAdminOfOrganization, verifySecretCodeEndpoint);
