import { Response } from "express";
import { prisma } from "../prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Role } from "@prisma/client";

export async function listMyPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }
    const allowedRoles: Role[] = [Role.PHYSIOTHERAPIST, Role.RECEPTIONIST, Role.ADMIN];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    // Resolve doctor record for physiotherapist
    let doctorId: number | null = null;
    if (req.user.role === Role.PHYSIOTHERAPIST) {
      const doc = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      doctorId = doc ? doc.id : null;
      if (!doctorId) {
        res.json({ success: true, data: [] });
        return;
      }
    }

    const where: any = {};
    if (doctorId) where.doctorId = doctorId;

    const plans = await prisma.therapyPlan.findMany({
      where,
      select: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      distinct: ["patientId"],
    });

    const patients = plans
      .map((p) => p.patient)
      .filter((p) => p !== null && p !== undefined) as { id: number; firstName: string | null; lastName: string | null }[];

    res.json({ success: true, data: patients });
  } catch (e) {
    console.error("listMyPatients error", e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getPatientHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const allowedRoles: Role[] = [Role.PHYSIOTHERAPIST, Role.ADMIN];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const patientId = parseInt(req.params.patientId);
    if (!patientId || isNaN(patientId)) {
      res.status(400).json({ success: false, error: "Invalid patient ID" });
      return;
    }

    // Verify doctor has access to this patient (for physiotherapists)
    if (req.user.role === Role.PHYSIOTHERAPIST) {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      if (!doctor) {
        res.status(403).json({ success: false, error: "Doctor profile not found" });
        return;
      }

      const hasAccess = await prisma.therapyPlan.findFirst({
        where: {
          patientId: patientId,
          doctorId: doctor.id,
        },
      });

      if (!hasAccess) {
        res.status(403).json({ success: false, error: "You don't have access to this patient's history" });
        return;
      }
    }

    // Get patient details
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!patient) {
      res.status(404).json({ success: false, error: "Patient not found" });
      return;
    }

    // Get all therapy plans for this patient
    const therapyPlans = await prisma.therapyPlan.findMany({
      where: {
        patientId: patientId,
        ...(req.user.role === Role.PHYSIOTHERAPIST ? {
          doctor: {
            userId: req.user.id,
          },
        } : {}),
      },
      include: {
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
          where: {
            archived: false,
          },
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                description: true,
                difficulty: true,
                duration: true,
                videoUrl: true,
              },
            },
            completionEvents: {
              where: {
                undone: false,
              },
              orderBy: {
                completedAt: "desc",
              },
              include: {
                mediaUpload: {
                  select: {
                    id: true,
                    fileName: true,
                    filePath: true,
                    fileType: true,
                  },
                },
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate statistics
    const totalExercises = therapyPlans.reduce((sum, plan) => sum + plan.exercises.length, 0);
    const totalCompletions = therapyPlans.reduce(
      (sum, plan) => sum + plan.exercises.reduce((s, ex) => s + ex.completionEvents.length, 0),
      0
    );
    const averagePainLevel = (() => {
      const allCompletions = therapyPlans.flatMap((plan) =>
        plan.exercises.flatMap((ex) => ex.completionEvents)
      );
      const painLevels = allCompletions
        .map((c) => c.painLevel)
        .filter((p): p is number => p !== null && p !== undefined);
      if (painLevels.length === 0) return null;
      return painLevels.reduce((sum, p) => sum + p, 0) / painLevels.length;
    })();
    const averageSatisfaction = (() => {
      const allCompletions = therapyPlans.flatMap((plan) =>
        plan.exercises.flatMap((ex) => ex.completionEvents)
      );
      const satisfactions = allCompletions
        .map((c) => c.satisfaction)
        .filter((s): s is number => s !== null && s !== undefined);
      if (satisfactions.length === 0) return null;
      return satisfactions.reduce((sum, s) => sum + s, 0) / satisfactions.length;
    })();

    res.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          regNumber: patient.regNumber,
          dateOfBirth: patient.dateOfBirth,
          phone: patient.phone,
          email: patient.user?.email,
        },
        therapyPlans,
        statistics: {
          totalPlans: therapyPlans.length,
          totalExercises,
          totalCompletions,
          averagePainLevel: averagePainLevel ? Math.round(averagePainLevel * 10) / 10 : null,
          averageSatisfaction: averageSatisfaction ? Math.round(averageSatisfaction * 10) / 10 : null,
        },
      },
    });
  } catch (e) {
    console.error("getPatientHistory error", e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}