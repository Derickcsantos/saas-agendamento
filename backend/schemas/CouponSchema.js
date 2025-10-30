
/**
 * @swagger
 * components:
 *   schemas:
 *     Coupon:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *           description: Código do cupom (em maiúsculas)
 *           example: "PROMO10"
 *         discount_type:
 *           type: string
 *           enum: [percentage, fixed]
 *           description: Tipo de desconto (percentual ou valor fixo)
 *           example: "percentage"
 *         discount_value:
 *           type: number
 *           description: Valor do desconto
 *           example: 10
 *         min_service_value:
 *           type: number
 *           description: Valor mínimo do serviço para aplicar o cupom
 *           example: 50
 *         max_uses:
 *           type: integer
 *           nullable: true
 *           description: Número máximo de usos (null para ilimitado)
 *           example: 100
 *         current_uses:
 *           type: integer
 *           description: Número de vezes que o cupom já foi usado
 *           example: 25
 *         valid_until:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Data de validade (null para sem expiração)
 *           example: "2023-12-31"
 *         is_active:
 *           type: boolean
 *           description: Indica se o cupom está ativo
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 * 
 *     CouponInput:
 *       type: object
 *       required:
 *         - code
 *         - discount_type
 *         - discount_value
 *         - min_service_value
 *       properties:
 *         code:
 *           type: string
 *           example: "PROMO10"
 *         discount_type:
 *           type: string
 *           enum: [percentage, fixed]
 *           example: "percentage"
 *         discount_value:
 *           type: number
 *           example: 10
 *         min_service_value:
 *           type: number
 *           example: 50
 *         max_uses:
 *           type: integer
 *           nullable: true
 *           example: 100
 *         valid_until:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2023-12-31"
 *         is_active:
 *           type: boolean
 *           example: true
 */