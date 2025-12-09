/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         category_id:
 *           type: integer
 *           example: 2
 *         name:
 *           type: string
 *           example: "Corte de Cabelo"
 *         description:
 *           type: string
 *           example: "Corte profissional"
 *         duration:
 *           type: integer
 *           description: Duração em minutos
 *           example: 30
 *         price:
 *           type: number
 *           format: float
 *           example: 50.00
 *         is_online:
 *           type: boolean
 *           example: TRUE
 *         imagem_service:
 *           type: string
 *           description: Imagem em base64 ou null
 *           example: "iVBORw0KGgoAAAANSUhEUgAA..."
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * 
 *     ServiceWithCategory:
 *       allOf:
 *         - $ref: '#/components/schemas/Service'
 *         - type: object
 *           properties:
 *             categories:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Cabelo"
 */