import express from "express";
import * as visitRequestsController from "../controllers/visitRequestsController";
import { authMiddleware, requireStaff, requirePhysiotherapist } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @route   POST /api/visit-requests
 * @desc    Create visit request (patient can create for themselves, admin/reception for any)
 * @access  Private
 */
router.post("/", authMiddleware, visitRequestsController.createVisitRequest);

/**
 * @route   GET /api/visit-requests
 * @desc    Get visit requests list (admin/doctor with filters, patient can view own)
 * @access  Private
 */
router.get("/", authMiddleware, visitRequestsController.getVisitRequests);

/**
 * @route   PATCH /api/visit-requests/:id/respond
 * @desc    Accept/Reject visit request (doctor only)
 * @access  Private (Physiotherapist)
 */
router.patch("/:id/respond", authMiddleware, requirePhysiotherapist, visitRequestsController.respondToVisitRequest);

/**
 * @route   POST /api/visit-requests/:id/assign
 * @desc    Assign visit request to doctor and optionally create appointment (admin/reception only)
 * @access  Private (Admin or Receptionist)
 */
router.post("/:id/assign", authMiddleware, visitRequestsController.assignVisitRequest);

export default router;

