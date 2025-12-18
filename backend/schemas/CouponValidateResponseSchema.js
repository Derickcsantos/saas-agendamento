/**
 * @swagger
 * components:
 *   responses:
 *     CouponValidationResponse:
 *       description: Resposta da validação de cupom
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valid:
 *                 type: boolean
 *                 description: Indica se o cupom é válido para uso
 *                 example: true
 *               message:
 *                 type: string
 *                 description: Mensagem informativa sobre o resultado da validação
 *                 example: "Cupom aplicado! Desconto de 10%"
 *               discount:
 *                 type: number
 *                 nullable: true
 *                 description: Valor do desconto aplicado (0 ou null se inválido)
 *                 example: 10
 *               discount_type:
 *                 type: string
 *                 nullable: true
 *                 enum: [percentage, fixed]
 *                 description: Tipo de desconto aplicado
 *                 example: "percentage"
 */