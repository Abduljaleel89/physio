import express from "express";
import * as analyticsController from "../controllers/analyticsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @route   GET /api/analytics/adherence
 * @desc    Get adherence analytics (completion counts per therapy plan for date range)
 * @access  Private (Admin or Physiotherapist)
 */
router.get("/adherence", authMiddleware, analyticsController.getAdherenceAnalytics);

export default router;

