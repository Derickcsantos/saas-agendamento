
/**
 * @swagger
 * components:
 *   schemas:
 *     RevenueReport:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *         total_appointments:
 *           type: integer
 *         total_revenue:
 *           type: number
 *         total_commissions:
 *           type: number
 *         details:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmployeeRevenueDetail'
 * 
 *     EmployeeRevenueDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         commission_rate:
 *           type: number
 *         appointments_count:
 *           type: integer
 *         total_revenue:
 *           type: number
 *         commission_value:
 *           type: number
 *         net_profit:
 *           type: number
 */