// routes/googleCalendarRoutes.js
import { Router } from "express";
import {
  getCalendarStatus,
  connectGoogleCalendar,
  googleCalendarCallback,
  getCalendarEvents,
  createCalendarEvent,
  disconnectGoogleCalendar,
  patchCalendarEvent,
} from "../controllers/googleCalendarController.js";

export const googleCalendarRouter = Router();

googleCalendarRouter.get(
  "/status",
  getCalendarStatus
);

googleCalendarRouter.get(
  "/:slug/connect",
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

// 🆕 Criar evento
googleCalendarRouter.post(
  "/events",
  createCalendarEvent
);

googleCalendarRouter.patch(
  "/events/:calendarId/:eventId",
  patchCalendarEvent
);

googleCalendarRouter.post(
  "/disconnect",
  disconnectGoogleCalendar
);
