import express from "express";
import * as completionEventsController from "../controllers/completionEventsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @route   POST /api/completion-events/:id/undo
 * @desc    Undo completion event (5-minute rule for patients, anytime for staff with reason)
 * @access  Private
 */
router.post("/:id/undo", authMiddleware, completionEventsController.undoCompletionEvent);
router.get("/", authMiddleware, completionEventsController.listCompletionEvents);

export default router;

