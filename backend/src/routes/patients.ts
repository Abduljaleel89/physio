import express from "express";
import * as completionEventsController from "../controllers/completionEventsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { uploadMiddleware } from "../lib/multer";

const router = express.Router();

/**
 * @route   POST /api/patients/:id/complete
 * @desc    Create completion event for patient (patient can only create for themselves)
 * Supports both:
 * - File upload via multipart/form-data (file field)
 * - Existing mediaUploadId reference in body
 * @access  Private
 */
router.post(
  "/:id/complete",
  authMiddleware,
  uploadMiddleware.single("file"), // Optional file upload
  completionEventsController.createCompletionEvent
);

export default router;

