// routes/googleCalendarRoutes.js
import { Router } from "express";
import {
  getCalendarStatus,
  connectGoogleCalendar,
  googleCalendarCallback,
  getCalendarEvents,
  disconnectGoogleCalendar,
} from "../controllers/googleCalendarController.js";

export const googleCalendarRouter = Router();

googleCalendarRouter.get(
  "/status",
  getCalendarStatus
);

googleCalendarRouter.get(
  "/connect",
  connectGoogleCalendar
);

googleCalendarRouter.get(
  "/callback",
  googleCalendarCallback
);

googleCalendarRouter.get(
  "/events",
  getCalendarEvents
);

googleCalendarRouter.post(
  "/disconnect",
  disconnectGoogleCalendar
);
