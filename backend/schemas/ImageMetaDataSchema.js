
/**
 * @swagger
 * components:
 *   schemas:
 *     ImagemMetadata:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único da imagem
 *         titulo:
 *           type: string
 *           description: Título da imagem
 *         criadoEm:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         imagem:
 *           type: object
 *           properties:
 *             tipo:
 *               type: string
 *               description: Tipo MIME da imagem
 *               example: "image/jpeg"
 */