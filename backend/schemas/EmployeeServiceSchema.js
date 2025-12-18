/**
 * @swagger
 * components:
 *   schemas:
 *     EmployeeService:
 *       type: object
 *       description: Associação entre funcionário e serviço
 *       required:
 *         - employee_id
 *         - service_id
 *       properties:
 *         employee_id:
 *           type: integer
 *           description: ID do funcionário
 *           example: 1
 *         service_id:
 *           type: integer
 *           description: ID do serviço vinculado ao funcionário
 *           example: 3
 */