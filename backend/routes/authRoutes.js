import { Router } from 'express';
import { checkAuth, logout } from '../controllers/authController.js';

export const authRouter = Router();

authRouter.get("/check", checkAuth)

authRouter.post('/logout', logout)