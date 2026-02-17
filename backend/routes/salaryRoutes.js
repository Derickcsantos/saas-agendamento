import { Router } from "express";
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { getSalary } from "../controllers/salaryController.js";
// import { requireAdminOfOrganization } from '../middlewares/requireAdminOfOrganization.js';

export const salariesRouter = Router();

salariesRouter.get('/by-employee/:userId', authenticateJWT, getSalary)