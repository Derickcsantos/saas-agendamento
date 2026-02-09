import { Router } from 'express';
import { getEmployeeCalendarColors } from '../controllers/employeeCalendarColorsController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

export const employeeCalendarColorsRouter = Router();

/**
 * /api/employee-calendar-colors/{slug}:
 *   get:
 *     summary: Retorna as cores do calendário por funcionário
 *     tags:
 *       - Employee Calendar Colors
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de cores por funcionário
 */
employeeCalendarColorsRouter.get('/:slug', authenticateJWT, getEmployeeCalendarColors);
