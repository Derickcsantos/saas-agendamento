import { Router } from 'express';
import { checkAuth, logout } from '../controllers/authController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

export const authRouter = Router();

authRouter.get("/:slug/check", authenticateJWT, checkAuth)

authRouter.post('/logout', authenticateJWT, logout)