import { scrapeInstagramProfile } from '../controllers/marcafyInstagramStatsController.js'
import { Router } from 'express'

export const marcafyInstagramStatsRouter = Router()

marcafyInstagramStatsRouter.get('/', scrapeInstagramProfile)
