/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       description: Categoria de serviços
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Cabelo"
 *         image:
 *           type: string
 *           nullable: true
 *           description: Imagem da categoria em base64
 *           example: "iVBORw0KGgoAAAANSUhEUgAA..."
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2023-01-02T00:00:00Z"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CategoryInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "Cabelo"
 *         image:
 *           type: string
 *           nullable: true
 *           description: Imagem da categoria em base64
 *           example: "iVBORw0KGgoAAAANSUhEUgAA..."
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CategoryUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Cabelo Masculino"
 *         image:
 *           type: string
 *           nullable: true
 *           description: Nova imagem da categoria em base64
 */