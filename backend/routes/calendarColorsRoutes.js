import { Router } from 'express';
import { 
  getCalendarColors
} from '../controllers/calendarColorsController.js';

export const calendarColorsRouter = Router();

/**
 * @swagger
 * /api/calendar-colors/{slug}:
 *   get:
 *     summary: Busca cores disponíveis para calendários
 *     description: Retorna todas as cores disponíveis (Google Calendar e Sistema) para uma organização
 *     tags: [Cores de Calendário]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador único da organização
 *     responses:
 *       200:
 *         description: Lista de cores disponíveis
 *       404:
 *         description: Organização não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
calendarColorsRouter.get('/:slug', getCalendarColors);
