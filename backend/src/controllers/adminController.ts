import { Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../prisma";
import { AuthenticatedRequest, requireAdmin } from "../middleware/authMiddleware";
import { hashPassword } from "../lib/password";
import crypto from "crypto";

/**
 * Generate a random password
 */
function generatePassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const values = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[values[i] % charset.length];
  }
  return password;
}

/**
 * Create a new user (Admin only)
 * POST /api/admin/users
 * Requires: ADMIN
 */
export async function createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const { email, role, firstName, lastName, regNumber, dateOfBirth, phone, address, licenseNumber, specialization } = req.body;

    // Validate required fields
    if (!email || !role) {
      res.status(400).json({
        success: false,
        error: "Email and role are required",
      });
      return;
    }

    // Validate role - admin can create PATIENT, PHYSIOTHERAPIST, RECEPTIONIST, ASSISTANT
    if (![Role.PATIENT, Role.PHYSIOTHERAPIST, Role.RECEPTIONIST, Role.ASSISTANT].includes(role)) {
      res.status(400).json({
        success: false,
        error: "Invalid role. Admin can only create patient, physiotherapist, receptionist, or assistant accounts",
      });
      return;
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

    // Generate password
    const password = generatePassword(12);
    const hashedPassword = await hashPassword(password);

    // For patients, validate required fields
    if (role === Role.PATIENT) {
      if (!firstName || !lastName || !regNumber || !dateOfBirth) {
        res.status(400).json({
          success: false,
          error: "First name, last name, registration number, and date of birth are required for patients",
        });
        return;
      }

      // Check if patient regNumber already exists
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

    // For doctors/physiotherapists, validate required fields
    if (role === Role.PHYSIOTHERAPIST) {
      if (!firstName || !lastName) {
        res.status(400).json({
          success: false,
          error: "First name and last name are required for physiotherapists",
        });
        return;
      }

      // Check if license number already exists (if provided)
      if (licenseNumber) {
        const existingDoctor = await prisma.doctor.findUnique({
          where: { licenseNumber },
        });

        if (existingDoctor) {
          res.status(409).json({
            success: false,
            error: "Doctor with this license number already exists",
          });
          return;
        }
      }
    }

    // Create user and related profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        ...(role === Role.PATIENT && {
          patientProfile: {
            create: {
              firstName,
              lastName,
              regNumber,
              dateOfBirth: new Date(dateOfBirth),
              phone,
              address,
            },
          },
        }),
        ...(role === Role.PHYSIOTHERAPIST && {
          doctorProfile: {
            create: {
              firstName,
              lastName,
              licenseNumber,
              specialization,
              phone,
            },
          },
        }),
      },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        patient: user.patientProfile,
        doctor: user.doctorProfile,
        password, // Return generated password
        message: "User created successfully",
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * List all users
 * GET /api/admin/users
 * Requires: ADMIN
 */
export async function listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const roleFilter = req.query.role as Role | undefined;

    const where: any = {};
    if (roleFilter) {
      where.role = roleFilter;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        patientProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            regNumber: true,
            dateOfBirth: true,
            phone: true,
          },
        },
        doctorProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            licenseNumber: true,
            specialization: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Assign doctor to patient (via therapy plan creation or update)
 * POST /api/admin/assign-doctor
 * Requires: ADMIN
 */
export async function assignDoctorToPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const { patientId, doctorId } = req.body;

    if (!patientId || !doctorId) {
      res.status(400).json({
        success: false,
        error: "Patient ID and Doctor ID are required",
      });
      return;
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(patientId) },
      include: { user: true },
    });

    if (!patient) {
      res.status(404).json({
        success: false,
        error: "Patient not found",
      });
      return;
    }

    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: parseInt(doctorId) },
      include: { user: true },
    });

    if (!doctor) {
      res.status(404).json({
        success: false,
        error: "Doctor not found",
      });
      return;
    }

    // Check if assignment already exists via active therapy plan
    const existingPlan = await prisma.therapyPlan.findFirst({
      where: {
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
        status: { not: "COMPLETED" },
      },
    });

    if (existingPlan) {
      res.json({
        success: true,
        data: {
          message: "Doctor is already assigned to this patient via an active therapy plan",
          therapyPlan: existingPlan,
        },
      });
      return;
    }

    // Create a therapy plan to establish the assignment
    const therapyPlan = await prisma.therapyPlan.create({
      data: {
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
        name: `Assignment - ${patient.firstName} ${patient.lastName} to Dr. ${doctor.firstName} ${doctor.lastName}`,
        description: "Doctor-patient assignment",
        startDate: new Date(),
        status: "ACTIVE",
        version: 1,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        doctor: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        therapyPlan,
        message: "Doctor assigned to patient successfully",
      },
    });
  } catch (error) {
    console.error("Assign doctor error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Get available doctors for assignment
 * GET /api/admin/doctors
 * Requires: ADMIN
 */
export async function getDoctors(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { doctors },
    });
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Get all patients
 * GET /api/admin/patients
 * Requires: ADMIN
 */
export async function getPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const patients = await prisma.patient.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        therapyPlans: {
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          where: {
            status: { not: "COMPLETED" },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { patients },
    });
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

