import { Request, Response } from "express";
import { Role, TherapyPlanStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { AuthenticatedRequest, requireStaff } from "../middleware/authMiddleware";

/**
 * List therapy plans
 * GET /api/therapy-plans
 * Requires: Authentication (Patient sees own plans, Staff sees all)
 */
export async function listTherapyPlans(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const where: any = {};

    // Patients can only see their own plans
    if (req.user.role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id },
      });
      if (patient) {
        where.patientId = patient.id;
      } else {
        res.json({ success: true, data: [] });
        return;
      }
    }

    // Staff can filter by patientId or doctorId if provided
    if (req.query.patientId) {
      where.patientId = parseInt(req.query.patientId as string);
    }
    if (req.query.doctorId) {
      where.doctorId = parseInt(req.query.doctorId as string);
    }

    const therapyPlans = await prisma.therapyPlan.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            regNumber: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        exercises: {
          where: { archived: false },
          take: 5, // Limit exercises in list view
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: therapyPlans,
    });
  } catch (error) {
    console.error("List therapy plans error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Create therapy plan
 * POST /api/therapy-plans
 * Requires: ADMIN, RECEPTIONIST, or PHYSIOTHERAPIST
 */
export async function createTherapyPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const { patientId, doctorId, name, description, startDate, endDate, status } = req.body;

    if (!patientId || !doctorId || !name || !startDate) {
      res.status(400).json({
        success: false,
        error: "Patient ID, doctor ID, name, and start date are required",
      });
      return;
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(patientId) },
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
    });

    if (!doctor) {
      res.status(404).json({
        success: false,
        error: "Doctor not found",
      });
      return;
    }

    // Check if user has permission (doctor can only create for assigned patients, admin can create for any)
    if (req.user.role === Role.PHYSIOTHERAPIST && doctor.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "You can only create therapy plans for your own patients",
      });
      return;
    }

    const therapyPlan = await prisma.therapyPlan.create({
      data: {
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || TherapyPlanStatus.ACTIVE,
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
        exercises: {
          where: { archived: false },
          include: {
            exercise: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { therapyPlan },
    });
  } catch (error) {
    console.error("Create therapy plan error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Get therapy plan by ID with exercises
 * GET /api/therapy-plans/:id
 */
export async function getTherapyPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);

    const therapyPlan = await prisma.therapyPlan.findUnique({
      where: { id },
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
        exercises: {
          where: { archived: false },
          include: {
            exercise: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!therapyPlan) {
      res.status(404).json({
        success: false,
        error: "Therapy plan not found",
      });
      return;
    }

    // Check permissions: patient can only view their own plans
    if (req.user?.role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id },
      });

      if (!patient || patient.id !== therapyPlan.patientId) {
        res.status(403).json({
          success: false,
          error: "Access denied",
        });
        return;
      }
    }

    res.json({
      success: true,
      data: { therapyPlan },
    });
  } catch (error) {
    console.error("Get therapy plan error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Add exercise to therapy plan (bumps version)
 * POST /api/therapy-plans/:id/exercises
 * Requires: ADMIN or PHYSIOTHERAPIST (assigned doctor)
 */
export async function addExerciseToPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const planId = parseInt(req.params.id);
    const { exerciseId, order, reps, sets, duration, frequency, notes } = req.body;

    if (!exerciseId) {
      res.status(400).json({
        success: false,
        error: "Exercise ID is required",
      });
      return;
    }

    // Get therapy plan
    const therapyPlan = await prisma.therapyPlan.findUnique({
      where: { id: planId },
      include: {
        doctor: true,
      },
    });

    if (!therapyPlan) {
      res.status(404).json({
        success: false,
        error: "Therapy plan not found",
      });
      return;
    }

    // Check permissions: doctor can only edit their own plans
    if (req.user.role === Role.PHYSIOTHERAPIST && therapyPlan.doctor.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "You can only edit therapy plans for your own patients",
      });
      return;
    }

    // Verify exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: parseInt(exerciseId) },
    });

    if (!exercise || exercise.archived) {
      res.status(404).json({
        success: false,
        error: "Exercise not found or archived",
      });
      return;
    }

    // Create therapy plan exercise
    const therapyPlanExercise = await prisma.therapyPlanExercise.create({
      data: {
        therapyPlanId: planId,
        exerciseId: parseInt(exerciseId),
        order: order || 0,
        reps: reps ? parseInt(reps) : null,
        sets: sets ? parseInt(sets) : null,
        duration: duration ? parseInt(duration) : null,
        frequency,
        notes,
        archived: false,
      },
      include: {
        exercise: true,
      },
    });

    // Bump version and create version record
    const newVersion = therapyPlan.version + 1;
    await prisma.therapyPlan.update({
      where: { id: planId },
      data: { version: newVersion },
    });

    await prisma.therapyPlanVersion.create({
      data: {
        therapyPlanId: planId,
        version: newVersion,
        summary: `Exercise "${exercise.name}" added to plan`,
        createdBy: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        therapyPlanExercise,
        newVersion,
        message: "Exercise added and plan version bumped",
      },
    });
  } catch (error) {
    console.error("Add exercise to plan error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Update exercise in therapy plan
 * PATCH /api/therapy-plans/:id/exercises/:exerciseId
 * Requires: ADMIN or PHYSIOTHERAPIST (assigned doctor)
 */
export async function updateExerciseInPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const planId = parseInt(req.params.id);
    const exerciseId = parseInt(req.params.exerciseId);
    const { reps, sets, duration, frequency, notes } = req.body;

    // Get therapy plan
    const therapyPlan = await prisma.therapyPlan.findUnique({
      where: { id: planId },
      include: {
        doctor: true,
      },
    });

    if (!therapyPlan) {
      res.status(404).json({
        success: false,
        error: "Therapy plan not found",
      });
      return;
    }

    // Check permissions
    if (req.user.role === Role.PHYSIOTHERAPIST && therapyPlan.doctor.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "You can only edit therapy plans for your own patients",
      });
      return;
    }

    // Find therapy plan exercise
    const therapyPlanExercise = await prisma.therapyPlanExercise.findFirst({
      where: {
        therapyPlanId: planId,
        exerciseId: exerciseId,
        archived: false,
      },
    });

    if (!therapyPlanExercise) {
      res.status(404).json({
        success: false,
        error: "Exercise not found in this therapy plan",
      });
      return;
    }

    // Update exercise details
    const updated = await prisma.therapyPlanExercise.update({
      where: { id: therapyPlanExercise.id },
      data: {
        ...(reps !== undefined && { reps: reps ? parseInt(reps) : null }),
        ...(sets !== undefined && { sets: sets ? parseInt(sets) : null }),
        ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
        ...(frequency !== undefined && { frequency }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        exercise: true,
      },
    });

    res.json({
      success: true,
      data: { therapyPlanExercise: updated },
    });
  } catch (error) {
    console.error("Update exercise in plan error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Archive exercise from therapy plan (creates version record)
 * DELETE /api/therapy-plans/:id/exercises/:exerciseId
 * Requires: ADMIN or PHYSIOTHERAPIST (assigned doctor)
 */
export async function archiveExerciseFromPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const planId = parseInt(req.params.id);
    const exerciseId = parseInt(req.params.exerciseId);

    // Get therapy plan
    const therapyPlan = await prisma.therapyPlan.findUnique({
      where: { id: planId },
      include: {
        doctor: true,
      },
    });

    if (!therapyPlan) {
      res.status(404).json({
        success: false,
        error: "Therapy plan not found",
      });
      return;
    }

    // Check permissions
    if (req.user.role === Role.PHYSIOTHERAPIST && therapyPlan.doctor.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "You can only edit therapy plans for your own patients",
      });
      return;
    }

    // Find therapy plan exercise
    const therapyPlanExercise = await prisma.therapyPlanExercise.findFirst({
      where: {
        therapyPlanId: planId,
        exerciseId: exerciseId,
        archived: false,
      },
      include: {
        exercise: true,
      },
    });

    if (!therapyPlanExercise) {
      res.status(404).json({
        success: false,
        error: "Exercise not found in this therapy plan",
      });
      return;
    }

    // Archive exercise (soft delete)
    const archived = await prisma.therapyPlanExercise.update({
      where: { id: therapyPlanExercise.id },
      data: { archived: true },
    });

    // Bump version and create version record
    const newVersion = therapyPlan.version + 1;
    await prisma.therapyPlan.update({
      where: { id: planId },
      data: { version: newVersion },
    });

    await prisma.therapyPlanVersion.create({
      data: {
        therapyPlanId: planId,
        version: newVersion,
        summary: `Exercise "${therapyPlanExercise.exercise.name}" archived from plan`,
        createdBy: req.user.id,
      },
    });

    res.json({
      success: true,
      data: {
        therapyPlanExercise: archived,
        newVersion,
        message: "Exercise archived and plan version bumped",
      },
    });
  } catch (error) {
    console.error("Archive exercise from plan error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

