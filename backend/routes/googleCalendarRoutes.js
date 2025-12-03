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
  "/status/:slug",
  getCalendarStatus
);

googleCalendarRouter.get(
  "/connect/:slug",
  connectGoogleCalendar
);

googleCalendarRouter.get(
  "/callback",
  googleCalendarCallback
);

googleCalendarRouter.get(
  "/events/:slug",
  getCalendarEvents
);

googleCalendarRouter.post(
  "/disconnect/:slug",
  disconnectGoogleCalendar
);
