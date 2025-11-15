import { Request, Response } from "express";
import { Role, VisitRequestStatus, AppointmentStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { AuthenticatedRequest, requireStaff, requireAdmin } from "../middleware/authMiddleware";

/**
 * Create visit request
 * POST /api/visit-requests
 * Requires: Patient can create for themselves, or Admin/Reception can create for any patient
 */
export async function createVisitRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const { patientId, requestedDate, reason, notes } = req.body;

    if (!patientId || !requestedDate) {
      res.status(400).json({
        success: false,
        error: "Patient ID and requested date are required",
      });
      return;
    }

    // Get patient
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

    // Check permissions: patient can only create for themselves
    if (req.user.role === Role.PATIENT) {
      if (patient.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: "You can only create visit requests for yourself",
        });
        return;
      }
    }

    const visitRequest = await prisma.visitRequest.create({
      data: {
        patientId: parseInt(patientId),
        requestedDate: new Date(requestedDate),
        reason,
        notes,
        status: VisitRequestStatus.PENDING,
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
      },
    });

    res.status(201).json({
      success: true,
      data: { visitRequest },
    });
  } catch (error) {
    console.error("Create visit request error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Get visit requests list
 * GET /api/visit-requests
 * Requires: Admin/Doctor can view all, Patient can view own
 */
export async function getVisitRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const status = req.query.status as VisitRequestStatus | undefined;
    const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
    const doctorId = req.query.doctorId ? parseInt(req.query.doctorId as string) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const where: any = {};

    // Patient can only view their own requests
    if (req.user.role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id },
      });

      if (patient) {
        where.patientId = patient.id;
      } else {
        res.status(404).json({
          success: false,
          error: "Patient profile not found",
        });
        return;
      }
    } else if (req.user.role === Role.PHYSIOTHERAPIST) {
      // Doctor can filter by assigned patients
      if (doctorId) {
        const doctor = await prisma.doctor.findUnique({
          where: { userId: req.user.id },
        });

        if (!doctor || doctor.id !== doctorId) {
          res.status(403).json({
            success: false,
            error: "You can only view visit requests for your assigned patients",
          });
          return;
        }
      }
    }

    if (status) {
      where.status = status;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (startDate || endDate) {
      where.requestedDate = {};
      if (startDate) {
        where.requestedDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.requestedDate.lte = new Date(endDate);
      }
    }

    const visitRequests = await prisma.visitRequest.findMany({
      where,
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
        appointment: {
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
          },
        },
      },
      orderBy: { requestedDate: "desc" },
    });

    res.json({
      success: true,
      data: { visitRequests },
    });
  } catch (error) {
    console.error("Get visit requests error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Accept/Reject visit request (doctor only)
 * PATCH /api/visit-requests/:id/respond
 * Requires: PHYSIOTHERAPIST
 */
export async function respondToVisitRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    if (req.user.role !== Role.PHYSIOTHERAPIST) {
      res.status(403).json({
        success: false,
        error: "Only physiotherapists can respond to visit requests",
      });
      return;
    }

    const visitRequestId = parseInt(req.params.id);
    const { status, notes } = req.body;

    if (!status || ![VisitRequestStatus.APPROVED, VisitRequestStatus.REJECTED].includes(status)) {
      res.status(400).json({
        success: false,
        error: "Status must be APPROVED or REJECTED",
      });
      return;
    }

    const visitRequest = await prisma.visitRequest.findUnique({
      where: { id: visitRequestId },
    });

    if (!visitRequest) {
      res.status(404).json({
        success: false,
        error: "Visit request not found",
      });
      return;
    }

    if (visitRequest.status !== VisitRequestStatus.PENDING) {
      res.status(400).json({
        success: false,
        error: "Visit request is not pending",
      });
      return;
    }

    const updated = await prisma.visitRequest.update({
      where: { id: visitRequestId },
      data: {
        status,
        notes: notes || visitRequest.notes,
      },
      include: {
        patient: true,
      },
    });

    res.json({
      success: true,
      data: { visitRequest: updated },
    });
  } catch (error) {
    console.error("Respond to visit request error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Assign visit request to doctor and optionally create appointment
 * POST /api/visit-requests/:id/assign
 * Requires: ADMIN or RECEPTIONIST
 */
export async function assignVisitRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Only admin and receptionist can assign
    if (![Role.ADMIN, Role.RECEPTIONIST].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Only admin and receptionist can assign visit requests",
      });
      return;
    }

    const visitRequestId = parseInt(req.params.id);
    const { doctorId, appointmentDate, duration, notes, createAppointment } = req.body;

    if (!doctorId) {
      res.status(400).json({
        success: false,
        error: "Doctor ID is required",
      });
      return;
    }

    // Get visit request
    const visitRequest = await prisma.visitRequest.findUnique({
      where: { id: visitRequestId },
      include: {
        patient: true,
      },
    });

    if (!visitRequest) {
      res.status(404).json({
        success: false,
        error: "Visit request not found",
      });
      return;
    }

    // Get doctor
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

    let appointment = null;

    // Create appointment if requested
    if (createAppointment && appointmentDate) {
      appointment = await prisma.appointment.create({
        data: {
          patientId: visitRequest.patientId,
          doctorId: parseInt(doctorId),
          createdById: req.user.id,
          visitRequestId: visitRequestId,
          date: new Date(appointmentDate),
          duration: duration || 60,
          status: AppointmentStatus.SCHEDULED,
          notes,
        },
        include: {
          patient: true,
          doctor: true,
        },
      });

      // Update visit request status to approved
      await prisma.visitRequest.update({
        where: { id: visitRequestId },
        data: { status: VisitRequestStatus.APPROVED },
      });
    }

    res.json({
      success: true,
      data: {
        visitRequest: {
          ...visitRequest,
          status: createAppointment ? VisitRequestStatus.APPROVED : visitRequest.status,
        },
        appointment,
        message: createAppointment ? "Visit request assigned and appointment created" : "Visit request assigned",
      },
    });
  } catch (error) {
    console.error("Assign visit request error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

