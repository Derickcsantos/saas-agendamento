/**
 * @swagger
 * components:
 *   responses:
 *     CouponValidationResponse:
 *       description: Resposta de validação de cupom
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valid:
 *                 type: boolean
 *                 example: true
 *               message:
 *                 type: string
 *                 example: "Cupom aplicado! Desconto de 10%"
 *               discount:
 *                 type: number
 *                 example: 10
 *               discountType:
 *                 type: string
 *                 example: "percentage"
 */