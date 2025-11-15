import express from "express";
import * as appointmentsController from "../controllers/appointmentsController";
import { authMiddleware, requireStaff } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @route   GET /api/appointments
 * @desc    List appointments (Patient sees own, Staff sees all)
 * @access  Private
 */
router.get("/", authMiddleware, appointmentsController.listAppointments);

/**
 * @route   POST /api/appointments
 * @desc    Create appointment
 * @access  Private (Admin, Receptionist, or Physiotherapist)
 */
router.post("/", authMiddleware, requireStaff, appointmentsController.createAppointment);

/**
 * @route   GET /api/appointments/calendar
 * @desc    Get appointments for calendar view (date range)
 * @access  Private
 */
router.get("/calendar", authMiddleware, appointmentsController.getAppointmentsForCalendar);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private
 */
router.get("/:id", authMiddleware, appointmentsController.getAppointment);

/**
 * @route   PATCH /api/appointments/:id
 * @desc    Update appointment
 * @access  Private (Admin, Receptionist, or Physiotherapist)
 */
router.patch("/:id", authMiddleware, requireStaff, appointmentsController.updateAppointment);

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Cancel appointment (destructive action - creates AuditLog)
 * @access  Private (Admin, Receptionist, or Physiotherapist)
 */
router.delete("/:id", authMiddleware, requireStaff, appointmentsController.cancelAppointment);

export default router;

