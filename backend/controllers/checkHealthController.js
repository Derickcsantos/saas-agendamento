// backend/routes/authRoutes.js
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

export default router;

let whatsappClient = null;

export const checkWhatsappHealth = (req, res) => {
  res.status(whatsappClient ? 200 : 503).json({
    status: whatsappClient ? 'healthy' : 'unavailable',
    timestamp: new Date()
  });
};