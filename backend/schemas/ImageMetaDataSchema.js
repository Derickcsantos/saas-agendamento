/**
 * @swagger
 * components:
 *   schemas:
 *     ImagemMetadata:
 *       type: object
 *       description: Metadados de uma imagem armazenada na galeria
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único da imagem
 *           example: "64f9a1c2e9b1a"
 *         titulo:
 *           type: string
 *           description: Título da imagem
 *           example: "Corte masculino moderno"
 *         criadoEm:
 *           type: string
 *           format: date-time
 *           description: Data de criação do registro
 *           example: "2024-01-10T14:32:00Z"
 *         imagem:
 *           type: object
 *           description: Informações do arquivo de imagem
 *           properties:
 *             tipo:
 *               type: string
 *               description: Tipo MIME da imagem
 *               example: "image/jpeg"
 */