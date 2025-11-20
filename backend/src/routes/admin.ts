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
 * @route   POST /api/admin/unassign-doctor
 * @desc    Unassign doctor from patient
 * @access  Private (Admin)
 */
router.post("/unassign-doctor", authMiddleware, requireAdmin, adminController.unassignDoctorFromPatient);

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

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user details
 * @access  Private (Admin)
 */
router.put("/users/:id", authMiddleware, requireAdmin, adminController.updateUser);

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Private (Admin)
 */
router.post("/users/:id/reset-password", authMiddleware, requireAdmin, adminController.resetUserPassword);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin)
 */
router.delete("/users/:id", authMiddleware, requireAdmin, adminController.deleteUser);

export default router;

