import { Request, Response } from "express";
import { Role, AppointmentStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { AuthenticatedRequest, requireStaff } from "../middleware/authMiddleware";

/**
 * List appointments
 * GET /api/appointments
 * Requires: Authentication (Patient sees own appointments, Staff sees all)
 */
export async function listAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const where: any = {};

    // Patients can only see their own appointments
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
    if (req.query.status) {
      where.status = req.query.status as AppointmentStatus;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      where.date = {};
      if (req.query.startDate) {
        where.date.gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        where.date.lte = new Date(req.query.endDate as string);
      }
    }

    const appointments = await prisma.appointment.findMany({
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
      },
      orderBy: { date: "asc" },
    });

    res.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error("List appointments error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Create appointment
 * POST /api/appointments
 * Requires: ADMIN, RECEPTIONIST, or PHYSIOTHERAPIST
 */
export async function createAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const { patientId, doctorId, date, duration, status, visitRequestId, notes } = req.body;

    if (!patientId || !doctorId || !date) {
      res.status(400).json({
        success: false,
        error: "Patient ID, doctor ID, and date are required",
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

    const appointment = await prisma.appointment.create({
      data: {
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
        createdById: req.user.id,
        visitRequestId: visitRequestId ? parseInt(visitRequestId) : null,
        date: new Date(date),
        duration: duration || 60,
        status: status || AppointmentStatus.SCHEDULED,
        notes,
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
        visitRequest: true,
      },
    });

    res.status(201).json({
      success: true,
      data: { appointment },
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Get appointment by ID
 * GET /api/appointments/:id
 */
export async function getAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const id = parseInt(req.params.id);

    const appointment = await prisma.appointment.findUnique({
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
        visitRequest: true,
        invoice: true,
      },
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: "Appointment not found",
      });
      return;
    }

    // Check permissions: patient can only view their own appointments
    if (req.user.role === Role.PATIENT) {
      if (appointment.patient.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: "Access denied",
        });
        return;
      }
    }

    res.json({
      success: true,
      data: { appointment },
    });
  } catch (error) {
    console.error("Get appointment error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Update appointment
 * PATCH /api/appointments/:id
 * Requires: ADMIN, RECEPTIONIST, or PHYSIOTHERAPIST
 */
export async function updateAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const id = parseInt(req.params.id);
    const { date, duration, status, notes } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: true,
      },
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: "Appointment not found",
      });
      return;
    }

    // Check permissions: doctor can only update their own appointments
    if (req.user.role === Role.PHYSIOTHERAPIST && appointment.doctor.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "You can only update your own appointments",
      });
      return;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(duration !== undefined && { duration: parseInt(duration) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    res.json({
      success: true,
      data: { appointment: updated },
    });
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Cancel appointment (destructive action - creates AuditLog)
 * DELETE /api/appointments/:id
 * Requires: ADMIN, RECEPTIONIST, or PHYSIOTHERAPIST
 */
export async function cancelAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const id = parseInt(req.params.id);
    const { reason } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: true,
        patient: true,
      },
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: "Appointment not found",
      });
      return;
    }

    // Check permissions
    if (req.user.role === Role.PHYSIOTHERAPIST && appointment.doctor.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "You can only cancel your own appointments",
      });
      return;
    }

    // Update appointment status to cancelled
    const cancelled = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        notes: reason ? `${appointment.notes || ""}\nCancelled: ${reason}`.trim() : appointment.notes,
      },
    });

    // Create AuditLog entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          entityType: "Appointment",
          entityId: id,
          action: "CANCEL",
          changes: JSON.stringify({
            status: appointment.status,
            newStatus: AppointmentStatus.CANCELLED,
            reason: reason || "No reason provided",
          }),
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] || null,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Continue even if audit log fails
    }

    res.json({
      success: true,
      data: {
        appointment: cancelled,
        message: "Appointment cancelled successfully",
      },
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Get appointments for calendar view (date range)
 * GET /api/appointments/calendar
 * Returns appointments for a date range
 */
export async function getAppointmentsForCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const doctorId = req.query.doctorId ? parseInt(req.query.doctorId as string) : undefined;
    const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
    const status = req.query.status as AppointmentStatus | undefined;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: "startDate and endDate query parameters are required (ISO format)",
      });
      return;
    }

    const where: any = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    // Patient can only view their own appointments
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
    }

    // Doctor can filter by their own appointments
    if (req.user.role === Role.PHYSIOTHERAPIST) {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: req.user.id },
      });

      if (doctor) {
        where.doctorId = doctor.id;
      }
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
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
      orderBy: { date: "asc" },
    });

    res.json({
      success: true,
      data: {
        appointments,
        dateRange: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error) {
    console.error("Get appointments for calendar error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

