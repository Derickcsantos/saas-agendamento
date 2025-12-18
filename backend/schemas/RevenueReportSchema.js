/**
 * @swagger
 * components:
 *   schemas:
 *     RevenueReport:
 *       type: object
 *       description: Relatório financeiro consolidado do período
 *       properties:
 *         period:
 *           type: string
 *           description: Período analisado
 *           example: "2024-01-01 a 2024-01-31"
 *         total_appointments:
 *           type: integer
 *           description: Total de agendamentos no período
 *           example: 150
 *         total_revenue:
 *           type: number
 *           format: float
 *           description: Faturamento total
 *           example: 12500.50
 *         total_commissions:
 *           type: number
 *           format: float
 *           description: Total de comissões pagas
 *           example: 2500.00
 *         details:
 *           type: array
 *           description: Detalhamento financeiro por funcionário
 *           items:
 *             $ref: '#/components/schemas/EmployeeRevenueDetail'
 * 
 *     EmployeeRevenueDetail:
 *       type: object
 *       description: Detalhamento de receitas por funcionário
 *       properties:
 *         id:
 *           type: integer
 *           description: ID do funcionário
 *           example: 3
 *         name:
 *           type: string
 *           description: Nome do funcionário
 *           example: "Maria Silva"
 *         commission_rate:
 *           type: number
 *           description: Percentual de comissão
 *           example: 20
 *         appointments_count:
 *           type: integer
 *           description: Total de atendimentos realizados
 *           example: 40
 *         total_revenue:
 *           type: number
 *           format: float
 *           description: Faturamento gerado pelo funcionário
 *           example: 4000.00
 *         commission_value:
 *           type: number
 *           format: float
 *           description: Valor total da comissão
 *           example: 800.00
 *         net_profit:
 *           type: number
 *           format: float
 *           description: Lucro líquido (faturamento - comissão)
 *           example: 3200.00
 */