import { Request, Response } from "express";
import { Role, VerificationType } from "@prisma/client";
import { prisma } from "../prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { generateToken } from "../lib/auth";
import { sendVerificationEmail } from "../lib/email";
import crypto from "crypto";

interface RegisterBody {
  email: string;
  password: string;
  role: Role;
  // Patient-specific fields
  firstName?: string;
  lastName?: string;
  regNumber?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
}

interface LoginBody {
  email?: string;
  password: string;
  // Patient login alternative
  regNumber?: string;
  dateOfBirth?: string;
}

interface VerifyBody {
  token: string;
}

/**
 * Generate a random verification token
 */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const body: RegisterBody = req.body;
    const { email, password, role, firstName, lastName, regNumber, dateOfBirth, phone, address } = body;

    // Validate required fields
    if (!email || !password || !role) {
      res.status(400).json({
        success: false,
        error: "Email, password, and role are required",
      });
      return;
    }

    // Validate role
    if (!Object.values(Role).includes(role)) {
      res.status(400).json({
        success: false,
        error: "Invalid role",
      });
      return;
    }

    // For patients, validate required fields
    if (role === Role.PATIENT) {
      if (!firstName || !lastName || !regNumber || !dateOfBirth) {
        res.status(400).json({
          success: false,
          error: "First name, last name, registration number, and date of birth are required for patients",
        });
        return;
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: "User with this email already exists",
      });
      return;
    }

    // Check if patient regNumber already exists (if registering as patient)
    if (role === Role.PATIENT && regNumber) {
      const existingPatient = await prisma.patient.findUnique({
        where: { regNumber },
      });

      if (existingPatient) {
        res.status(409).json({
          success: false,
          error: "Patient with this registration number already exists",
        });
        return;
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user and patient profile if role is PATIENT
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        ...(role === Role.PATIENT && {
          patientProfile: {
            create: {
              firstName: firstName!,
              lastName: lastName!,
              regNumber: regNumber!,
              dateOfBirth: new Date(dateOfBirth!),
              phone: phone || null,
              address: address || null,
            },
          },
        }),
      },
      include: {
        patientProfile: role === Role.PATIENT,
        doctorProfile: role === Role.PHYSIOTHERAPIST,
      },
    });

    // Create verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        type: VerificationType.EMAIL_VERIFICATION,
        expiresAt,
      },
    });

    // Send verification email (stub - uses Ethereal in dev)
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Continue even if email fails - token is still created
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          patientProfile: user.patientProfile,
          doctorProfile: user.doctorProfile,
        },
        message: "User registered successfully. Please check your email to verify your account.",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during registration",
    });
  }
}

/**
 * Verify email using verification token
 * POST /api/auth/verify
 */
export async function verify(req: Request, res: Response): Promise<void> {
  try {
    const body: VerifyBody = req.body;
    const { token } = body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: "Verification token is required",
      });
      return;
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      res.status(404).json({
        success: false,
        error: "Invalid verification token",
      });
      return;
    }

    // Check if token is already used
    if (verificationToken.used) {
      res.status(400).json({
        success: false,
        error: "Verification token has already been used",
      });
      return;
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        error: "Verification token has expired",
      });
      return;
    }

    // Mark token as used (stub - in full implementation, would also mark user email as verified)
    await prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: { used: true },
    });

    res.json({
      success: true,
      data: {
        message: "Email verified successfully",
        userId: verificationToken.userId,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during verification",
    });
  }
}

/**
 * Login user
 * Supports email+password or regNumber+dateOfBirth (for patients)
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const body: LoginBody = req.body;
    const { email, password, regNumber, dateOfBirth } = body;

    let user;

    // Login method 1: Email + password
    if (email && password) {
      user = await prisma.user.findUnique({
        where: { email },
        include: {
          patientProfile: true,
          doctorProfile: true,
        },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
        return;
      }

      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
        return;
      }
    }
    // Login method 2: regNumber + dateOfBirth (for patients)
    else if (regNumber && dateOfBirth) {
      const patient = await prisma.patient.findUnique({
        where: { regNumber },
        include: {
          user: true,
        },
      });

      if (!patient) {
        res.status(401).json({
          success: false,
          error: "Invalid registration number or date of birth",
        });
        return;
      }

      // Verify date of birth matches
      const dob = new Date(dateOfBirth);
      const patientDob = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;

      if (!patientDob || dob.toDateString() !== patientDob.toDateString()) {
        res.status(401).json({
          success: false,
          error: "Invalid registration number or date of birth",
        });
        return;
      }

      user = patient.user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: "User account not found",
        });
        return;
      }

      // Load full user with profiles
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          patientProfile: true,
          doctorProfile: true,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Either (email and password) or (regNumber and dateOfBirth) must be provided",
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Authentication failed",
      });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          patientProfile: user.patientProfile,
          doctorProfile: user.doctorProfile,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during login",
    });
  }
}

