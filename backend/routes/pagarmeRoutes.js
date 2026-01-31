import { Router } from "express";
import { PagarmeController } from "../controllers/pagarmeController.js";
import { NfeController } from "../controllers/nfeController.js";

export const pagarmeRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Pagar.me
 *     description: Integração com gateway de pagamento Pagar.me para cobranças, assinaturas e gerenciamento de clientes
 */

/**
 * @swagger
 * /api/pagarme/charges:
 *   post:
 *     summary: Cria uma nova cobrança
 *     description: Cria uma cobrança única via Pagar.me (cartão de crédito, boleto ou PIX)
 *     tags: [Pagar.me]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - payment_method
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: Valor em centavos
 *                 example: 10000
 *               payment_method:
 *                 type: string
 *                 enum: [credit_card, boleto, pix]
 *                 example: "credit_card"
 *               customer:
 *                 type: object
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cobrança criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao criar cobrança
 */
pagarmeRouter.post("/charges", PagarmeController.createCharge);

/**
 * @swagger
 * /api/pagarme/charges/{charge_id}:
 *   get:
 *     summary: Busca detalhes de uma cobrança
 *     description: Retorna os detalhes completos de uma cobrança específica
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: charge_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da cobrança no Pagar.me
 *         example: "ch_abc123xyz"
 *     responses:
 *       200:
 *         description: Detalhes da cobrança
 *       404:
 *         description: Cobrança não encontrada
 *       500:
 *         description: Erro ao buscar cobrança
 */
pagarmeRouter.get("/charges/:charge_id", PagarmeController.getCharge);

/**
 * @swagger
 * /api/pagarme/charges/{charge_id}/capture:
 *   post:
 *     summary: Captura uma cobrança pré-autorizada
 *     description: Captura o valor de uma cobrança que estava pré-autorizada
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: charge_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da cobrança
 *     responses:
 *       200:
 *         description: Cobrança capturada com sucesso
 *       400:
 *         description: Cobrança não pode ser capturada
 *       500:
 *         description: Erro ao capturar cobrança
 */
pagarmeRouter.post("/charges/:charge_id/capture", PagarmeController.captureCharge);

/**
 * @swagger
 * /api/pagarme/charges/{charge_id}/cancel:
 *   post:
 *     summary: Cancela uma cobrança
 *     description: Cancela uma cobrança existente
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: charge_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da cobrança
 *     responses:
 *       200:
 *         description: Cobrança cancelada com sucesso
 *       400:
 *         description: Cobrança não pode ser cancelada
 *       500:
 *         description: Erro ao cancelar cobrança
 */
pagarmeRouter.post("/charges/:charge_id/cancel", PagarmeController.cancelCharge);

/**
 * @swagger
 * /api/pagarme/customers:
 *   post:
 *     summary: Cria um novo cliente no Pagar.me
 *     description: Registra um novo cliente na plataforma Pagar.me
 *     tags: [Pagar.me]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@exemplo.com"
 *               document:
 *                 type: string
 *                 example: "12345678900"
 *               phone:
 *                 type: string
 *                 example: "11999998888"
 *     responses:
 *       201:
 *         description: Cliente criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao criar cliente
 */
pagarmeRouter.post("/customers", PagarmeController.createCustomer);

/**
 * @swagger
 * /api/pagarme/customers/{customer_id}:
 *   get:
 *     summary: Busca detalhes de um cliente
 *     description: Retorna os dados de um cliente específico cadastrado no Pagar.me
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: customer_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cliente no Pagar.me
 *         example: "cus_abc123xyz"
 *     responses:
 *       200:
 *         description: Detalhes do cliente
 *       404:
 *         description: Cliente não encontrado
 *       500:
 *         description: Erro ao buscar cliente
 */
pagarmeRouter.get("/customers/:customer_id", PagarmeController.getCustomer);

/**
 * @swagger
 * /api/pagarme/split:
 *   post:
 *     summary: Cria uma regra de split de pagamento
 *     description: Define regras de divisão de valores entre múltiplos recebedores
 *     tags: [Pagar.me]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               split_rules:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Split criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao criar split
 */
pagarmeRouter.post("/split", PagarmeController.createSplit);

/**
 * @swagger
 * /api/pagarme/webhook/pagarme:
 *   post:
 *     summary: Webhook principal do Pagar.me
 *     description: Recebe notificações de eventos do Pagar.me (pagamentos, estornos, etc)
 *     tags: [Pagar.me]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *       500:
 *         description: Erro ao processar webhook
 */
pagarmeRouter.post("/webhook/pagarme", PagarmeController.webhook);

/**
 * @swagger
 * /api/pagarme/plans:
 *   post:
 *     summary: Cria um novo plano de assinatura
 *     description: Cria um plano de recorrência no Pagar.me
 *     tags: [Pagar.me]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - amount
 *               - interval
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Plano Mensal"
 *               amount:
 *                 type: integer
 *                 description: Valor em centavos
 *                 example: 9990
 *               interval:
 *                 type: string
 *                 enum: [day, week, month, year]
 *                 example: "month"
 *               interval_count:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Plano criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao criar plano
 */
pagarmeRouter.post("/plans", PagarmeController.createPlan);

/**
 * @swagger
 * /api/pagarme/plans:
 *   get:
 *     summary: Lista todos os planos de assinatura
 *     description: Retorna uma lista de todos os planos cadastrados no Pagar.me
 *     tags: [Pagar.me]
 *     responses:
 *       200:
 *         description: Lista de planos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Erro ao listar planos
 */
pagarmeRouter.get("/plans", PagarmeController.listPlans);

/**
 * @swagger
 * /api/pagarme/plans/{plan_id}:
 *   put:
 *     summary: Atualiza um plano de assinatura
 *     description: Atualiza os dados de um plano existente
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: plan_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do plano
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               amount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Plano atualizado com sucesso
 *       404:
 *         description: Plano não encontrado
 *       500:
 *         description: Erro ao atualizar plano
 */
pagarmeRouter.put("/plans/:plan_id", PagarmeController.updatePlan);

/**
 * @swagger
 * /api/pagarme/plans/{plan_id}:
 *   delete:
 *     summary: Exclui um plano de assinatura
 *     description: Remove um plano da plataforma
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: plan_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do plano
 *     responses:
 *       204:
 *         description: Plano excluído com sucesso
 *       404:
 *         description: Plano não encontrado
 *       500:
 *         description: Erro ao excluir plano
 */
pagarmeRouter.delete("/plans/:plan_id", PagarmeController.deletePlan);

/**
 * @swagger
 * /api/pagarme/subscriptions:
 *   get:
 *     summary: Lista todas as assinaturas
 *     description: Retorna uma lista de todas as assinaturas ativas e inativas
 *     tags: [Pagar.me]
 *     responses:
 *       200:
 *         description: Lista de assinaturas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Erro ao listar assinaturas
 */
pagarmeRouter.get("/subscriptions", PagarmeController.listSubscriptions);

/**
 * @swagger
 * /api/pagarme/subscriptions:
 *   post:
 *     summary: Cria uma nova assinatura
 *     description: Cria uma assinatura recorrente para um cliente
 *     tags: [Pagar.me]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan_id
 *               - customer_id
 *               - payment_method
 *             properties:
 *               plan_id:
 *                 type: string
 *                 example: "plan_abc123"
 *               customer_id:
 *                 type: string
 *                 example: "cus_abc123"
 *               payment_method:
 *                 type: string
 *                 enum: [credit_card, boleto]
 *     responses:
 *       201:
 *         description: Assinatura criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao criar assinatura
 */
pagarmeRouter.post("/subscriptions", PagarmeController.createSubscription);

/**
 * @swagger
 * /api/pagarme/nfe/{document_id}:
 *   get:
 *     summary: Consulta nota fiscal eletrônica
 *     description: Busca informações de uma NFe específica
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do documento fiscal
 *     responses:
 *       200:
 *         description: Dados da nota fiscal
 *       404:
 *         description: Nota fiscal não encontrada
 *       500:
 *         description: Erro ao consultar nota
 */
pagarmeRouter.get("/nfe/:document_id", NfeController.consultarNota);

/**
 * @swagger
 * /api/pagarme/subscriptions/{subscription_id}:
 *   patch:
 *     summary: Atualiza uma assinatura existente
 *     description: Atualiza dados de uma assinatura ativa
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: subscription_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da assinatura
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_method:
 *                 type: string
 *               next_billing_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Assinatura atualizada com sucesso
 *       404:
 *         description: Assinatura não encontrada
 *       500:
 *         description: Erro ao atualizar assinatura
 */
pagarmeRouter.patch("/subscriptions/:subscription_id", PagarmeController.updateSubscription);

/**
 * @swagger
 * /api/pagarme/subscriptions/{subscription_id}/cancel:
 *   post:
 *     summary: Cancela uma assinatura
 *     description: Cancela uma assinatura ativa imediatamente
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: subscription_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da assinatura
 *     responses:
 *       200:
 *         description: Assinatura cancelada com sucesso
 *       404:
 *         description: Assinatura não encontrada
 *       500:
 *         description: Erro ao cancelar assinatura
 */
pagarmeRouter.post("/subscriptions/:subscription_id/cancel", PagarmeController.cancelSubscription);

/**
 * @swagger
 * /api/pagarme/charges/{charge_id}/refund:
 *   post:
 *     summary: Reembolsa uma cobrança
 *     description: Realiza o estorno total ou parcial de uma cobrança
 *     tags: [Pagar.me]
 *     parameters:
 *       - in: path
 *         name: charge_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da cobrança
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: Valor a ser reembolsado em centavos. Se não informado, reembolsa o valor total
 *                 example: 5000
 *     responses:
 *       200:
 *         description: Reembolso realizado com sucesso
 *       400:
 *         description: Cobrança não pode ser reembolsada
 *       500:
 *         description: Erro ao processar reembolso
 */
pagarmeRouter.post("/charges/:charge_id/refund", PagarmeController.refundCharge);

/**
 * @swagger
 * /api/pagarme/webhooks/recurrence:
 *   post:
 *     summary: Webhook de recorrência do Pagar.me
 *     description: Recebe notificações específicas de eventos de assinaturas recorrentes
 *     tags: [Pagar.me]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *       500:
 *         description: Erro ao processar webhook
 */
pagarmeRouter.post("/webhooks/recurrence", PagarmeController.webhookRecurrence);
