import { Response } from "express";
import { Role, TherapyPlanStatus, NotificationType } from "@prisma/client";
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

    // Check if patient already has any active assignments
    const existingAssignments = await prisma.therapyPlan.findMany({
      where: {
        patientId: parseInt(patientId),
        status: {
          notIn: [TherapyPlanStatus.COMPLETED, TherapyPlanStatus.CANCELLED],
        },
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Check if the same doctor is already assigned
    const existingPlan = existingAssignments.find(
      (plan) => plan.doctorId === parseInt(doctorId)
    );

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

    // If patient has other active assignments, return info to prompt unassign
    if (existingAssignments.length > 0) {
      res.status(400).json({
        success: false,
        error: "Patient already has assigned doctor(s). Please unassign existing doctor(s) first.",
        data: {
          existingAssignments,
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
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Create notifications for both doctor and patient
    try {
      // Notification for the doctor
      if (therapyPlan.doctor.user?.id) {
        await prisma.notification.create({
          data: {
            userId: therapyPlan.doctor.user.id,
            title: "New Patient Assignment",
            message: `You have been assigned to patient ${patient.firstName} ${patient.lastName} (${patient.regNumber}). A new therapy plan has been created.`,
            type: NotificationType.SUCCESS,
            payload: JSON.stringify({
              therapyPlanId: therapyPlan.id,
              patientId: patient.id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              patientRegNumber: patient.regNumber,
            }),
            read: false,
          },
        });
      }

      // Notification for the patient
      if (therapyPlan.patient.user?.id) {
        await prisma.notification.create({
          data: {
            userId: therapyPlan.patient.user.id,
            title: "Doctor Assigned",
            message: `Dr. ${doctor.firstName} ${doctor.lastName} has been assigned as your physiotherapist. A new therapy plan has been created for you.`,
            type: NotificationType.SUCCESS,
            payload: JSON.stringify({
              therapyPlanId: therapyPlan.id,
              doctorId: doctor.id,
              doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
              doctorSpecialization: doctor.specialization,
            }),
            read: false,
          },
        });
      }
    } catch (notificationError) {
      // Log error but don't fail the assignment if notifications fail
      console.error("Error creating notifications:", notificationError);
    }

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
 * Unassign doctor from patient
 * POST /api/admin/unassign-doctor
 * Requires: ADMIN
 */
export async function unassignDoctorFromPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const { patientId, doctorId } = req.body;
    
    console.log('Unassign request received:', { patientId, doctorId, body: req.body });

    if (!patientId || !doctorId) {
      console.log('Missing patientId or doctorId');
      res.status(400).json({
        success: false,
        error: "Patient ID and Doctor ID are required",
      });
      return;
    }

    console.log('Parsing IDs - patientId:', patientId, '->', parseInt(patientId), 'doctorId:', doctorId, '->', parseInt(doctorId));

    // Verify patient exists
    console.log('Looking up patient:', parseInt(patientId));
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(patientId) },
      include: { user: true },
    });

    if (!patient) {
      console.log('Patient not found');
      res.status(404).json({
        success: false,
        error: "Patient not found",
      });
      return;
    }
    console.log('Patient found:', patient.firstName, patient.lastName);

    // Verify doctor exists
    console.log('Looking up doctor:', parseInt(doctorId));
    const doctor = await prisma.doctor.findUnique({
      where: { id: parseInt(doctorId) },
      include: { user: true },
    });

    if (!doctor) {
      console.log('Doctor not found');
      res.status(404).json({
        success: false,
        error: "Doctor not found",
      });
      return;
    }
    console.log('Doctor found:', doctor.firstName, doctor.lastName);

    // Find active therapy plans for this patient-doctor assignment
    // Look for plans that are not COMPLETED or CANCELLED (i.e., ACTIVE, PAUSED, or DRAFT)
    console.log('Finding active therapy plans for patient:', parseInt(patientId), 'doctor:', parseInt(doctorId));
    const activePlans = await prisma.therapyPlan.findMany({
      where: {
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
        status: {
          notIn: [TherapyPlanStatus.COMPLETED, TherapyPlanStatus.CANCELLED],
        },
      },
    });

    console.log('Found active plans:', activePlans.length);

    if (activePlans.length === 0) {
      console.log('No active plans found, returning 404');
      res.status(404).json({
        success: false,
        error: "No active assignment found between this patient and doctor",
      });
      return;
    }

    // Complete all active therapy plans to unassign
    console.log('Updating therapy plans to COMPLETED');
    const updateResult = await prisma.therapyPlan.updateMany({
      where: {
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
        status: {
          notIn: [TherapyPlanStatus.COMPLETED, TherapyPlanStatus.CANCELLED],
        },
      },
      data: {
        status: TherapyPlanStatus.COMPLETED,
        endDate: new Date(),
      },
    });

    console.log('Updated plans count:', updateResult.count);

    console.log('Successfully unassigned doctor');
    res.json({
      success: true,
      data: {
        message: "Doctor unassigned from patient successfully",
        unassignedPlans: updateResult.count,
      },
    });
  } catch (error) {
    console.error("Unassign doctor error:", error);
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
          select: {
            id: true,
            doctorId: true,
            status: true,
            name: true,
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          where: {
            status: {
              notIn: [TherapyPlanStatus.COMPLETED, TherapyPlanStatus.CANCELLED],
            },
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

/**
 * Update user details
 * PUT /api/admin/users/:id
 * Requires: ADMIN
 */
export async function updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const userId = parseInt(req.params.id);
    const { email, role, firstName, lastName, regNumber, dateOfBirth, phone, address, licenseNumber, specialization } = req.body;

    if (!userId || isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: "Valid user ID is required",
      });
      return;
    }

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Don't allow changing to ADMIN role or changing from ADMIN role
    if (role) {
      if (role === Role.ADMIN && existingUser.role !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: "Cannot change user role to ADMIN",
        });
        return;
      }
      if (existingUser.role === Role.ADMIN && role !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: "Cannot change ADMIN user role",
        });
        return;
      }
    }

    // If email is being changed, check if new email already exists
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        res.status(409).json({
          success: false,
          error: "Email already in use",
        });
        return;
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(email && { email }),
        ...(role && { role }),
      },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    // Update patient profile if exists
    if (existingUser.patientProfile && (firstName || lastName || regNumber || dateOfBirth || phone !== undefined || address !== undefined)) {
      await prisma.patient.update({
        where: { id: existingUser.patientProfile.id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(regNumber && { regNumber }),
          ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
        },
      });
    }

    // Update doctor profile if exists
    if (existingUser.doctorProfile && (firstName || lastName || licenseNumber !== undefined || specialization !== undefined || phone !== undefined)) {
      await prisma.doctor.update({
        where: { id: existingUser.doctorProfile.id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(licenseNumber !== undefined && { licenseNumber }),
          ...(specialization !== undefined && { specialization }),
          ...(phone !== undefined && { phone }),
        },
      });
    }

    // Fetch updated user with profiles
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    res.json({
      success: true,
      data: {
        user: finalUser,
        message: "User updated successfully",
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Reset user password
 * POST /api/admin/users/:id/reset-password
 * Requires: ADMIN
 */
export async function resetUserPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const userId = parseInt(req.params.id);

    if (!userId || isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: "Valid user ID is required",
      });
      return;
    }

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Generate new password
    const newPassword = generatePassword(12);
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    res.json({
      success: true,
      data: {
        userId: existingUser.id,
        email: existingUser.email,
        password: newPassword, // Return new password for admin to share
        message: "Password reset successfully",
      },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Delete a user (Admin only)
 * DELETE /api/admin/users/:id
 * Requires: ADMIN
 */
export async function deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
      return;
    }

    // Find the user to delete
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    if (!userToDelete) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Prevent deleting ADMIN users
    if (userToDelete.role === Role.ADMIN) {
      res.status(403).json({
        success: false,
        error: "Cannot delete ADMIN users",
      });
      return;
    }

    // Delete the user (cascade will automatically delete associated Patient/Doctor profiles)
    // The schema has onDelete: Cascade on the User relation, so profiles will be deleted automatically
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      data: {
        message: "User deleted successfully",
        deletedUserId: userId,
      },
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

