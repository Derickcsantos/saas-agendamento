import { Router } from "express";
import multer from "multer";
import { sendSpreadsheetController } from "../controllers/sendSpreadsheetController.js";

export const sendWhatsappRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

sendWhatsappRouter.post("/", upload.single("file"), sendSpreadsheetController
);
