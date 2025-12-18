/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       description: Serviço oferecido pelo salão
 *       properties:
 *         id:
 *           type: integer
 *           description: ID do serviço
 *           example: 1
 *         category_id:
 *           type: integer
 *           description: ID da categoria vinculada
 *           example: 2
 *         name:
 *           type: string
 *           description: Nome do serviço
 *           example: "Corte de Cabelo"
 *         description:
 *           type: string
 *           description: Descrição do serviço
 *           example: "Corte profissional masculino e feminino"
 *         duration:
 *           type: integer
 *           description: Duração do serviço em minutos
 *           example: 30
 *         price:
 *           type: number
 *           format: float
 *           description: Preço do serviço
 *           example: 50.00
 *         imagem_service:
 *           type: string
 *           nullable: true
 *           description: Imagem do serviço em base64 ou null
 *           example: "iVBORw0KGgoAAAANSUhEUgAA..."
 *         is_active:
 *           type: boolean
 *           description: Indica se o serviço está ativo
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *           example: "2024-01-01T10:00:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data da última atualização
 *           example: "2024-01-05T15:30:00Z"
 * 
 *     ServiceWithCategory:
 *       description: Serviço com informações da categoria associada
 *       allOf:
 *         - $ref: '#/components/schemas/Service'
 *         - type: object
 *           properties:
 *             category:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 2
 *                 name:
 *                   type: string
 *                   example: "Cabelo"
 */