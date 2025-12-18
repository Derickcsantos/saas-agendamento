/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       description: Usuário do sistema
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do usuário
 *           example: "1"
 *         username:
 *           type: string
 *           description: Nome de usuário
 *           example: "john_doe"
 *         email:
 *           type: string
 *           format: email
 *           description: E-mail do usuário
 *           example: "john@example.com"
 *         tipo:
 *           type: string
 *           enum: [comum, admin]
 *           default: comum
 *           description: Perfil de acesso do usuário
 *           example: "comum"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação do usuário
 *           example: "2023-01-01T00:00:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data da última atualização
 *           example: "2023-01-02T00:00:00Z"
 * 
 *     UserInput:
 *       type: object
 *       description: Dados necessários para criação de um usuário
 *       required:
 *         - username
 *         - email
 *         - password_plaintext
 *       properties:
 *         username:
 *           type: string
 *           description: Nome de usuário
 *           example: "john_doe"
 *         email:
 *           type: string
 *           format: email
 *           description: E-mail do usuário
 *           example: "john@example.com"
 *         password_plaintext:
 *           type: string
 *           format: password
 *           description: Senha em texto puro (será criptografada no backend)
 *           example: "senha123"
 *         tipo:
 *           type: string
 *           enum: [comum, admin]
 *           default: comum
 *           description: Perfil do usuário
 *           example: "comum"
 * 
 *     UserUpdate:
 *       type: object
 *       description: Dados permitidos para atualização do usuário
 *       properties:
 *         username:
 *           type: string
 *           example: "john_doe_updated"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.updated@example.com"
 *         password_plaintext:
 *           type: string
 *           format: password
 *           description: Nova senha do usuário
 *           example: "nova_senha123"
 *         tipo:
 *           type: string
 *           enum: [comum, admin]
 *           example: "admin"
 */