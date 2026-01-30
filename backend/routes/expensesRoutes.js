import Router from 'express';
import multer from 'multer';
import {
  // Categorias
  getAllExpenseCategories,
  getExpenseCategoryById,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  // Métodos de pagamento
  getAllPaymentMethods,
  // Despesas
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  // Parcelas
  getExpenseInstallments,
  updateInstallmentStatus,
  // Anexos
  getExpenseAttachments,
  createExpenseAttachment,
  deleteExpenseAttachment,
  // Relatórios
  getExpensesSummary,
  // Importação AI
  importExpensesFromStatement,
} from '../controllers/expensesController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';

export const expensesRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   - name: Despesas - Categorias
 *     description: Endpoints para gestão de categorias de despesas
 *   - name: Despesas - Métodos de Pagamento
 *     description: Endpoints para consulta de métodos de pagamento
 *   - name: Despesas
 *     description: Endpoints para gestão de despesas da organização
 *   - name: Despesas - Parcelas
 *     description: Endpoints para gestão de parcelas de despesas
 *   - name: Despesas - Anexos
 *     description: Endpoints para gestão de anexos de despesas
 *   - name: Despesas - Relatórios
 *     description: Endpoints para relatórios e estatísticas de despesas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ExpenseCategory:
 *       type: object
 *       properties:
 *         category_expense_id:
 *           type: integer
 *           description: ID único da categoria
 *         organization_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID da organização (null para categorias globais)
 *         name_category:
 *           type: string
 *           maxLength: 200
 *           description: Nome da categoria
 *         description_category:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: Descrição da categoria
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único do método de pagamento
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Nome do método (PIX, Boleto, etc)
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     Expense:
 *       type: object
 *       properties:
 *         expense_id:
 *           type: integer
 *           description: ID único da despesa
 *         organization_id:
 *           type: string
 *           format: uuid
 *           description: ID da organização
 *         name_expense:
 *           type: string
 *           maxLength: 200
 *           description: Nome/descrição da despesa
 *         description_expense:
 *           type: string
 *           maxLength: 900
 *           nullable: true
 *           description: Descrição detalhada
 *         value_expense:
 *           type: number
 *           format: decimal
 *           description: Valor total da despesa
 *         category_expense_id:
 *           type: integer
 *           nullable: true
 *           description: ID da categoria
 *         payment_method_id:
 *           type: integer
 *           nullable: true
 *           description: ID do método de pagamento
 *         is_installment:
 *           type: boolean
 *           description: Se a despesa é parcelada
 *         status_expense:
 *           type: string
 *           maxLength: 100
 *           description: Status da despesa (pendente, pago, cancelado, etc)
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     ExpenseInstallment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único da parcela
 *         organization_id:
 *           type: string
 *           format: uuid
 *         expense_id:
 *           type: integer
 *           description: ID da despesa principal
 *         installment_number:
 *           type: integer
 *           description: Número da parcela (1, 2, 3...)
 *         installments_total:
 *           type: integer
 *           description: Total de parcelas
 *         due_date:
 *           type: string
 *           format: date
 *           description: Data de vencimento
 *         amount:
 *           type: number
 *           format: decimal
 *           description: Valor da parcela
 *         status:
 *           type: string
 *           enum: [pendente, pago, cancelada]
 *           description: Status da parcela
 *         paid_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Data/hora do pagamento
 *         created_at:
 *           type: string
 *           format: date-time
 *     
 *     ExpenseAttachment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único do anexo
 *         organization_id:
 *           type: string
 *           format: uuid
 *         expense_id:
 *           type: integer
 *           description: ID da despesa
 *         installment_id:
 *           type: integer
 *           nullable: true
 *           description: ID da parcela (opcional)
 *         public_url:
 *           type: string
 *           description: URL pública do arquivo
 *         note:
 *           type: string
 *           maxLength: 300
 *           nullable: true
 *           description: Observação sobre o anexo
 *         uploaded_at:
 *           type: string
 *           format: date-time
 */

// ==========================================
// CATEGORIAS DE DESPESAS
// ==========================================

/**
 * @swagger
 * /api/admin/expenses/categories/{slug}:
 *   get:
 *     summary: Lista todas as categorias de despesas da organização
 *     tags: [Despesas - Categorias]
 *     description: |
 *       Retorna categorias da organização e categorias globais (organization_id = null).
 *       Suporta busca por nome.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug único da organização
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nome da categoria
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorias
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ExpenseCategory'
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
expensesRouter.get('/categories/:slug', authenticateJWT, getAllExpenseCategories);

/**
 * @swagger
 * /api/admin/expenses/categories/{slug}/{id}:
 *   get:
 *     summary: Obtém detalhes de uma categoria específica
 *     tags: [Despesas - Categorias]
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
 *         description: ID da categoria
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Detalhes da categoria
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExpenseCategory'
 *       404:
 *         description: Categoria ou organização não encontrada
 *       500:
 *         description: Erro interno
 */
expensesRouter.get('/categories/:slug/:id', authenticateJWT, getExpenseCategoryById);

/**
 * @swagger
 * /api/admin/expenses/categories/{slug}:
 *   post:
 *     summary: Cria uma nova categoria de despesa
 *     tags: [Despesas - Categorias]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name_category
 *             properties:
 *               name_category:
 *                 type: string
 *                 maxLength: 200
 *                 description: Nome da categoria
 *               description_category:
 *                 type: string
 *                 maxLength: 500
 *                 description: Descrição opcional
 *     responses:
 *       201:
 *         description: Categoria criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExpenseCategory'
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Categoria com este nome já existe
 *       500:
 *         description: Erro interno
 */
expensesRouter.post('/categories/:slug', authenticateJWT, requireAdminOfOrganization, createExpenseCategory);

/**
 * @swagger
 * /api/admin/expenses/categories/{slug}/{id}:
 *   put:
 *     summary: Atualiza uma categoria de despesa
 *     tags: [Despesas - Categorias]
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
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name_category:
 *                 type: string
 *               description_category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Categoria atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExpenseCategory'
 *       404:
 *         description: Categoria não encontrada
 *       409:
 *         description: Nome já existe
 *       500:
 *         description: Erro interno
 */
expensesRouter.put('/categories/:slug/:id', authenticateJWT, requireAdminOfOrganization, updateExpenseCategory);

/**
 * @swagger
 * /api/admin/expenses/categories/{slug}/{id}:
 *   delete:
 *     summary: Exclui uma categoria de despesa
 *     tags: [Despesas - Categorias]
 *     description: |
 *       Exclui a categoria. Despesas vinculadas terão category_expense_id setado como NULL.
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
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Categoria excluída com sucesso
 *       500:
 *         description: Erro interno
 */
expensesRouter.delete('/categories/:slug/:id', authenticateJWT, requireAdminOfOrganization, deleteExpenseCategory);

// ==========================================
// MÉTODOS DE PAGAMENTO
// ==========================================

/**
 * @swagger
 * /api/admin/expenses/payment-methods:
 *   get:
 *     summary: Lista todos os métodos de pagamento disponíveis
 *     tags: [Despesas - Métodos de Pagamento]
 *     description: |
 *       Retorna lista de métodos de pagamento globais (PIX, Boleto, Transferência, etc).
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de métodos de pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentMethod'
 *       500:
 *         description: Erro interno
 */
expensesRouter.get('/payment-methods', authenticateJWT, getAllPaymentMethods);

// ==========================================
// DESPESAS
// ==========================================

/**
 * @swagger
 * /api/admin/expenses/{slug}:
 *   get:
 *     summary: Lista todas as despesas da organização
 *     tags: [Despesas]
 *     description: |
 *       Retorna despesas com filtros opcionais.
 *       Inclui dados relacionados (categoria, método de pagamento, contagem de parcelas).
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar em nome ou descrição
 *       - in: query
 *         name: status_expense
 *         schema:
 *           type: string
 *         description: Filtrar por status
 *       - in: query
 *         name: category_expense_id
 *         schema:
 *           type: integer
 *         description: Filtrar por categoria
 *       - in: query
 *         name: payment_method_id
 *         schema:
 *           type: integer
 *         description: Filtrar por método de pagamento
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (created_at)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (created_at)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de despesas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno
 */
// rota movida mais abaixo junto de outras específicas (summary, ai-import)

/**
 * @swagger
 * /api/admin/expenses/{slug}/{id}:
 *   get:
 *     summary: Obtém detalhes de uma despesa específica
 *     tags: [Despesas]
 *     description: |
 *       Retorna despesa com todas as informações relacionadas:
 *       categoria, método de pagamento, parcelas e anexos.
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
 *         description: ID da despesa
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Detalhes da despesa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Despesa não encontrada
 *       500:
 *         description: Erro interno
 */
// ⚠️ Rotas mais específicas precisam vir antes de /:slug/:id para evitar colisão (ex: /summary)
/**
 * @swagger
 * /api/admin/expenses/{slug}/ai-import:
 *   post:
 *     summary: Importa despesas a partir de extrato (PDF ou CSV) usando Gemini
 *     tags: [Despesas]
 *     security:
 *       - bearerAuth: []
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
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Extrato em PDF ou CSV
 *     responses:
 *       201:
 *         description: Despesas importadas com sucesso
 *       400:
 *         description: Requisição inválida
 *       503:
 *         description: Gemini não configurado
 *       500:
 *         description: Erro ao importar
 */
expensesRouter.get('/:slug/summary', authenticateJWT, getExpensesSummary);
// Rotas específicas antes de /:slug para evitar colisão de parâmetros
expensesRouter.post('/:slug/ai-import', authenticateJWT, requireAdminOfOrganization, upload.single('file'), importExpensesFromStatement);
expensesRouter.get('/:slug', authenticateJWT, getAllExpenses);

/**
 * @swagger
 * /api/admin/expenses/{slug}/{id}:
 *   get:
 *     summary: Obtém detalhes de uma despesa específica
 *     tags: [Despesas]
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
 *           type: string
 *         description: ID da despesa
 *     responses:
 *       200:
 *         description: Detalhes da despesa retornados com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Despesa não encontrada
 *       500:
 *         description: Erro ao buscar despesa
 */
expensesRouter.get('/:slug/:id', authenticateJWT, getExpenseById);

/**
 * @swagger
 * /api/admin/expenses/{slug}:
 *   post:
 *     summary: Cria uma nova despesa
 *     description: Registra uma nova despesa para a organização, podendo ser única ou parcelada
 *     tags: [Despesas]
 *     security:
 *       - bearerAuth: []
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
 *               - description_expense
 *               - value_expense
 *               - date_expense
 *               - category_id
 *               - payment_method_id
 *             properties:
 *               description_expense:
 *                 type: string
 *                 description: Descrição da despesa
 *                 example: "Compra de produtos"
 *               value_expense:
 *                 type: number
 *                 description: Valor total da despesa
 *                 example: 500.00
 *               date_expense:
 *                 type: string
 *                 format: date
 *                 description: Data da despesa
 *                 example: "2025-01-30"
 *               category_id:
 *                 type: integer
 *                 description: ID da categoria da despesa
 *                 example: 1
 *               payment_method_id:
 *                 type: integer
 *                 description: ID do método de pagamento
 *                 example: 2
 *               is_recurring:
 *                 type: boolean
 *                 description: Se a despesa é recorrente
 *                 example: false
 *               installments:
 *                 type: integer
 *                 description: Número de parcelas (se aplicável)
 *                 example: 3
 *               notes:
 *                 type: string
 *                 description: Observações adicionais
 *     responses:
 *       201:
 *         description: Despesa criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 description_expense:
 *                   type: string
 *                 value_expense:
 *                   type: number
 *                 date_expense:
 *                   type: string
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao criar despesa
 */
expensesRouter.post('/:slug', authenticateJWT, requireAdminOfOrganization, createExpense);

/**
 * @swagger
 * /api/admin/expenses/{slug}/{id}:
 *   put:
 *     summary: Atualiza uma despesa
 *     tags: [Despesas]
 *     description: |
 *       Atualiza informações da despesa.
 *       Não permite alterar parcelas (use endpoint específico).
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
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name_expense:
 *                 type: string
 *               description_expense:
 *                 type: string
 *               value_expense:
 *                 type: number
 *               category_expense_id:
 *                 type: integer
 *               payment_method_id:
 *                 type: integer
 *               status_expense:
 *                 type: string
 *     responses:
 *       200:
 *         description: Despesa atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Despesa não encontrada
 *       500:
 *         description: Erro interno
 */
expensesRouter.put('/:slug/:id', authenticateJWT, requireAdminOfOrganization, updateExpense);

/**
 * @swagger
 * /api/admin/expenses/{slug}/{id}:
 *   delete:
 *     summary: Exclui uma despesa
 *     tags: [Despesas]
 *     description: |
 *       Exclui despesa e todas as suas parcelas e anexos (CASCADE).
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
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Despesa excluída com sucesso
 *       500:
 *         description: Erro interno
 */
expensesRouter.delete('/:slug/:id', authenticateJWT, requireAdminOfOrganization, deleteExpense);

// ==========================================
// PARCELAS
// ==========================================

/**
 * @swagger
 * /api/admin/expenses/{slug}/{expenseId}/installments:
 *   get:
 *     summary: Lista parcelas de uma despesa
 *     tags: [Despesas - Parcelas]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de parcelas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ExpenseInstallment'
 *       500:
 *         description: Erro interno
 */
expensesRouter.get('/:slug/:expenseId/installments', authenticateJWT, getExpenseInstallments);

/**
 * @swagger
 * /api/admin/expenses/{slug}/installments/{installmentId}/status:
 *   patch:
 *     summary: Atualiza status de uma parcela
 *     tags: [Despesas - Parcelas]
 *     description: |
 *       Atualiza status da parcela (pendente/pago/cancelada).
 *       Quando marcada como "pago", registra paid_at automaticamente.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: installmentId
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pendente, pago, cancelada]
 *     responses:
 *       200:
 *         description: Status atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExpenseInstallment'
 *       400:
 *         description: Status inválido
 *       404:
 *         description: Parcela não encontrada
 *       500:
 *         description: Erro interno
 */
expensesRouter.patch('/:slug/installments/:installmentId/status', authenticateJWT, requireAdminOfOrganization, updateInstallmentStatus);

// ==========================================
// ANEXOS
// ==========================================

/**
 * @swagger
 * /api/admin/expenses/{slug}/{expenseId}/attachments:
 *   get:
 *     summary: Lista anexos de uma despesa
 *     tags: [Despesas - Anexos]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de anexos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ExpenseAttachment'
 *       500:
 *         description: Erro interno
 */
expensesRouter.get('/:slug/:expenseId/attachments', authenticateJWT, getExpenseAttachments);

/**
 * @swagger
 * /api/admin/expenses/{slug}/{expenseId}/attachments:
 *   post:
 *     summary: Adiciona anexo a uma despesa
 *     tags: [Despesas - Anexos]
 *     description: |
 *       Adiciona anexo (comprovante, nota fiscal, etc) a uma despesa.
 *       Pode vincular a uma parcela específica (opcional).
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - public_url
 *             properties:
 *               public_url:
 *                 type: string
 *                 description: URL do arquivo (ex. do Supabase Storage)
 *               installment_id:
 *                 type: integer
 *                 nullable: true
 *                 description: ID da parcela (opcional)
 *               note:
 *                 type: string
 *                 maxLength: 300
 *                 description: Observação sobre o anexo
 *     responses:
 *       201:
 *         description: Anexo criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExpenseAttachment'
 *       400:
 *         description: URL obrigatória
 *       500:
 *         description: Erro interno
 */
expensesRouter.post('/:slug/:expenseId/attachments', authenticateJWT, requireAdminOfOrganization, upload.single('file'), createExpenseAttachment);

/**
 * @swagger
 * /api/admin/expenses/{slug}/attachments/{attachmentId}:
 *   delete:
 *     summary: Exclui um anexo
 *     tags: [Despesas - Anexos]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Anexo excluído com sucesso
 *       500:
 *         description: Erro interno
 */
expensesRouter.delete('/:slug/attachments/:attachmentId', authenticateJWT, requireAdminOfOrganization, deleteExpenseAttachment);

// ==========================================
// RELATÓRIOS
// ==========================================

/**
 * @swagger
 * /api/admin/expenses/{slug}/summary:
 *   get:
 *     summary: Obtém resumo/estatísticas de despesas
 *     tags: [Despesas - Relatórios]
 *     description: |
 *       Retorna resumo consolidado:
 *       - Total de despesas
 *       - Valor total
 *       - Agrupamento por status
 *       - Agrupamento por categoria
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Resumo de despesas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_expenses:
 *                   type: integer
 *                   description: Quantidade total de despesas
 *                 total_value:
 *                   type: number
 *                   description: Valor total somado
 *                 by_status:
 *                   type: object
 *                   description: Agrupamento por status
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       count:
 *                         type: integer
 *                       total:
 *                         type: number
 *                 by_category:
 *                   type: object
 *                   description: Agrupamento por categoria
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       count:
 *                         type: integer
 *                       total:
 *                         type: number
 *       500:
 *         description: Erro interno
 */
