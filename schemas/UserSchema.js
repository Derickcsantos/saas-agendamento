
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID do usuário
 *         username:
 *           type: string
 *           description: Nome de usuário
 *         email:
 *           type: string
 *           format: email
 *           description: E-mail do usuário
 *         tipo:
 *           type: string
 *           enum: [comum, admin]
 *           default: comum
 *           description: Tipo de usuário
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data de atualização
 *       example:
 *         id: "1"
 *         username: "john_doe"
 *         email: "john@example.com"
 *         tipo: "comum"
 *         created_at: "2023-01-01T00:00:00Z"
 *         updated_at: "2023-01-02T00:00:00Z"
 * 
 *     UserInput:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password_plaintext
 *       properties:
 *         username:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password_plaintext:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [comum, admin]
 *           default: comum
 *       example:
 *         username: "john_doe"
 *         email: "john@example.com"
 *         password_plaintext: "senha123"
 *         tipo: "comum"
 *         organization_id: "11111111-1111-1111-1111-111111111111"
 * 
 *     UserUpdate:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password_plaintext:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [comum, admin]
 *       example:
 *         username: "john_doe_updated"
 *         email: "john.updated@example.com"
 *         password_plaintext: "nova_senha123"
 *         tipo: "admin"
 *         organization_id: "11111111-1111-1111-1111-111111111111"
 */