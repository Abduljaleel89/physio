import express from "express";
import * as exercisesController from "../controllers/exercisesController";
import { authMiddleware, requireStaff } from "../middleware/authMiddleware";
import { uploadMiddleware } from "../lib/multer";

const router = express.Router();

/**
 * @route   GET /api/exercises
 * @desc    Get all exercises (excluding archived by default)
 * @access  Public
 */
router.get("/", exercisesController.getExercises);

/**
 * @route   GET /api/exercises/:id
 * @desc    Get exercise by ID
 * @access  Public
 */
router.get("/:id", exercisesController.getExercise);

/**
 * @route   POST /api/exercises
 * @desc    Create new exercise (with optional video upload)
 * @access  Private (Admin or Physiotherapist)
 */
router.post("/", authMiddleware, requireStaff, uploadMiddleware.single("video"), exercisesController.createExercise);

/**
 * @route   PATCH /api/exercises/:id
 * @desc    Update exercise
 * @access  Private (Admin or Physiotherapist)
 */
router.patch("/:id", authMiddleware, requireStaff, exercisesController.updateExercise);

/**
 * @route   DELETE /api/exercises/:id
 * @desc    Delete exercise (soft delete via archived flag)
 * @access  Private (Admin or Physiotherapist)
 */
router.delete("/:id", authMiddleware, requireStaff, exercisesController.deleteExercise);

export default router;

