import { Router } from 'express';
import { checkAuth } from '../controllers/authController.js';

export const authRouter = Router();

authRouter.get("/check", checkAuth)