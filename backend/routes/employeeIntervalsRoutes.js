import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import requireActiveSubscription from "../middlewares/requireActiveSubscription.js";
import {
  createEmployeeInterval,
  deleteEmployeeInterval,
  getEmployeeIntervals,
  updateEmployeeInterval,
} from "../controllers/employeeIntervalsController.js";

export const employeeIntervalsRouter = Router();

employeeIntervalsRouter.get("/:slug", authenticateJWT, requireActiveSubscription, getEmployeeIntervals);
employeeIntervalsRouter.post("/:slug", authenticateJWT, requireActiveSubscription, createEmployeeInterval);
employeeIntervalsRouter.put("/:slug/:id", authenticateJWT, requireActiveSubscription, updateEmployeeInterval);
employeeIntervalsRouter.delete("/:slug/:id", authenticateJWT, requireActiveSubscription, deleteEmployeeInterval);
