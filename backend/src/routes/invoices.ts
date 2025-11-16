import express from "express";
import * as invoicesController from "../controllers/invoicesController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @route   POST /api/invoices
 * @desc    Create invoice (admin/reception only)
 * @access  Private (Admin or Receptionist)
 */
router.post("/", authMiddleware, invoicesController.createInvoice);

/**
 * @route   GET /api/invoices
 * @desc    Get invoices list with filters
 * @access  Private (patient can view own, staff can view all)
 */
router.get("/", authMiddleware, invoicesController.getInvoices);

/**
 * @route   PATCH /api/invoices/:id
 * @desc    Update invoice status
 * @access  Private (Admin or Receptionist)
 */
router.patch("/:id", authMiddleware, invoicesController.updateInvoice);

/**
 * @route   POST /api/invoices/:id/void
 * @desc    Void invoice (destructive action - creates AuditLog)
 * @access  Private (Admin or Receptionist)
 */
router.post("/:id/void", authMiddleware, invoicesController.voidInvoice);

/**
 * @route   POST /api/invoices/:id/send-email
 * @desc    Send invoice email
 * @access  Private (Admin or Receptionist)
 */
router.post("/:id/send-email", authMiddleware, invoicesController.sendInvoiceEmail);

export default router;

