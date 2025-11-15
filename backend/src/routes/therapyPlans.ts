import express from "express";
import * as therapyPlansController from "../controllers/therapyPlansController";
import { authMiddleware, requireStaff } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @route   GET /api/therapy-plans
 * @desc    List therapy plans (Patient sees own, Staff sees all)
 * @access  Private
 */
router.get("/", authMiddleware, therapyPlansController.listTherapyPlans);

/**
 * @route   POST /api/therapy-plans
 * @desc    Create therapy plan
 * @access  Private (Admin, Receptionist, or Physiotherapist)
 */
router.post("/", authMiddleware, requireStaff, therapyPlansController.createTherapyPlan);

/**
 * @route   GET /api/therapy-plans/:id
 * @desc    Get therapy plan by ID with exercises
 * @access  Private (Patient can view own, Staff can view any)
 */
router.get("/:id", authMiddleware, therapyPlansController.getTherapyPlan);

/**
 * @route   POST /api/therapy-plans/:id/exercises
 * @desc    Add exercise to therapy plan (bumps version)
 * @access  Private (Admin or assigned Physiotherapist)
 */
router.post("/:id/exercises", authMiddleware, requireStaff, therapyPlansController.addExerciseToPlan);

/**
 * @route   PATCH /api/therapy-plans/:id/exercises/:exerciseId
 * @desc    Update exercise details in therapy plan
 * @access  Private (Admin or assigned Physiotherapist)
 */
router.patch("/:id/exercises/:exerciseId", authMiddleware, requireStaff, therapyPlansController.updateExerciseInPlan);

/**
 * @route   DELETE /api/therapy-plans/:id/exercises/:exerciseId
 * @desc    Archive exercise from therapy plan (creates version record)
 * @access  Private (Admin or assigned Physiotherapist)
 */
router.delete("/:id/exercises/:exerciseId", authMiddleware, requireStaff, therapyPlansController.archiveExerciseFromPlan);

export default router;

