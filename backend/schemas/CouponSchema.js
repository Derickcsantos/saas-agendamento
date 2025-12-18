/**
 * @swagger
 * components:
 *   schemas:
 *     Coupon:
 *       type: object
 *       description: Cupom de desconto aplicável a serviços
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
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
 *           description: Valor do desconto (percentual ou monetário)
 *           example: 10
 *         min_service_value:
 *           type: number
 *           description: Valor mínimo do serviço para aplicação do cupom
 *           example: 50
 *         max_uses:
 *           type: integer
 *           nullable: true
 *           description: Número máximo de usos (null = ilimitado)
 *           example: 100
 *         current_uses:
 *           type: integer
 *           description: Quantidade de usos já realizados
 *           example: 25
 *         valid_until:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Data de validade do cupom (null = sem expiração)
 *           example: "2025-12-31"
 *         is_active:
 *           type: boolean
 *           description: Indica se o cupom está ativo
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação do cupom
 *           example: "2024-01-01T10:30:00Z"
 */

/**
 * @swagger
 * components:
 *   schemas:
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
 *           description: Código do cupom
 *           example: "PROMO10"
 *         discount_type:
 *           type: string
 *           enum: [percentage, fixed]
 *           description: Tipo de desconto
 *           example: "percentage"
 *         discount_value:
 *           type: number
 *           description: Valor do desconto
 *           example: 10
 *         min_service_value:
 *           type: number
 *           description: Valor mínimo do serviço para uso do cupom
 *           example: 50
 *         max_uses:
 *           type: integer
 *           nullable: true
 *           description: Limite máximo de usos
 *           example: 100
 *         valid_until:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Data de expiração do cupom
 *           example: "2025-12-31"
 *         is_active:
 *           type: boolean
 *           description: Status do cupom
 *           example: true
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CouponUpdate:
 *       type: object
 *       description: Dados para atualização de um cupom
 *       properties:
 *         code:
 *           type: string
 *           example: "PROMO20"
 *         discount_type:
 *           type: string
 *           enum: [percentage, fixed]
 *           example: "fixed"
 *         discount_value:
 *           type: number
 *           example: 20
 *         min_service_value:
 *           type: number
 *           example: 80
 *         max_uses:
 *           type: integer
 *           nullable: true
 *           example: 200
 *         valid_until:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2026-12-31"
 *         is_active:
 *           type: boolean
 *           example: false
 */