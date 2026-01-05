import express from "express";
import { confirmedAppointmentWhatsApp } from "../controllers/contatosController.js";

export const contactRouter = express.Router();

contactRouter.post(
  "/whatsapp/confirmedAppointment",
  confirmedAppointmentWhatsApp
);

