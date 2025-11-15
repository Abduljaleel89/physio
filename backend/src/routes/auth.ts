import express from "express";
import * as authController from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../prisma";

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", authController.register);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify email using verification token
 * @access  Public
 */
router.post("/verify", authController.verify);

/**
 * @route   POST /api/auth/login
 * @desc    Login user (email+password or regNumber+dateOfBirth for patients)
 * @access  Public
 */
router.post("/login", authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
  // Fetch full user data from database
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      patientProfile: true,
      doctorProfile: true,
    },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      error: "User not found",
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      patientProfile: user.patientProfile,
      doctorProfile: user.doctorProfile,
    },
  });
});

export default router;

