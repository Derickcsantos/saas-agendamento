import { Router } from "express";
import multer from "multer";
import { getReviewInvitation, listOrganizationReviews, submitReview } from "../controllers/reviewsController.js";
import { getReviewMediaType } from "../utils/reviewMedia.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { requireAdminOfOrganization } from "../middlewares/requireAdminOfOrganization.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 4 },
  fileFilter: (_req, file, callback) => {
    if (!getReviewMediaType(file.mimetype)) return callback(new Error("Formato de arquivo não suportado"));
    return callback(null, true);
  },
});

const receiveMedia = (req, res, next) => upload.single("media")(req, res, (error) => {
  if (!error) return next();
  const message = error.code === "LIMIT_FILE_SIZE" ? "O arquivo deve ter no máximo 25 MB" : error.message;
  return res.status(400).json({ error: message });
});

export const reviewsRouter = Router();
reviewsRouter.get("/admin/:slug", authenticateJWT, requireAdminOfOrganization, listOrganizationReviews);
reviewsRouter.get("/:slug/:token", getReviewInvitation);
reviewsRouter.post("/:slug/:token", receiveMedia, submitReview);
