import express from "express";
import * as adminController from "../controllers/adminController";
import { authMiddleware, requireAdmin } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user (Admin only)
 * @access  Private (Admin)
 */
router.post("/users", authMiddleware, requireAdmin, adminController.createUser);

/**
 * @route   GET /api/admin/users
 * @desc    List all users
 * @access  Private (Admin)
 */
router.get("/users", authMiddleware, requireAdmin, adminController.listUsers);

/**
 * @route   POST /api/admin/assign-doctor
 * @desc    Assign doctor to patient
 * @access  Private (Admin)
 */
router.post("/assign-doctor", authMiddleware, requireAdmin, adminController.assignDoctorToPatient);

/**
 * @route   GET /api/admin/doctors
 * @desc    Get all doctors
 * @access  Private (Admin)
 */
router.get("/doctors", authMiddleware, requireAdmin, adminController.getDoctors);

/**
 * @route   GET /api/admin/patients
 * @desc    Get all patients
 * @access  Private (Admin)
 */
router.get("/patients", authMiddleware, requireAdmin, adminController.getPatients);

export default router;

