import { Request, Response } from "express";
import { Role, InvoiceStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { AuthenticatedRequest, requireAdmin, requireStaff } from "../middleware/authMiddleware";

/**
 * Generate unique invoice number
 */
function generateInvoiceNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `INV-${timestamp}-${random}`;
}

/**
 * Create invoice
 * POST /api/invoices
 * Requires: ADMIN or RECEPTIONIST
 */
export async function createInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Only admin and receptionist can create invoices
    if (![Role.ADMIN, Role.RECEPTIONIST].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Only admin and receptionist can create invoices",
      });
      return;
    }

    const { patientId, amountCents, currency, therapyPlanId, appointmentId, dueDate, notes } = req.body;

    if (!patientId || amountCents === undefined) {
      res.status(400).json({
        success: false,
        error: "Patient ID and amount (in cents) are required",
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

    // Verify therapy plan if provided
    if (therapyPlanId) {
      const therapyPlan = await prisma.therapyPlan.findUnique({
        where: { id: parseInt(therapyPlanId) },
      });

      if (!therapyPlan || therapyPlan.patientId !== parseInt(patientId)) {
        res.status(404).json({
          success: false,
          error: "Therapy plan not found or does not belong to this patient",
        });
        return;
      }
    }

    // Verify appointment if provided
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: parseInt(appointmentId) },
      });

      if (!appointment || appointment.patientId !== parseInt(patientId)) {
        res.status(404).json({
          success: false,
          error: "Appointment not found or does not belong to this patient",
        });
        return;
      }

      // Check if appointment already has an invoice
      const existingInvoice = await prisma.invoice.findUnique({
        where: { appointmentId: parseInt(appointmentId) },
      });

      if (existingInvoice) {
        res.status(409).json({
          success: false,
          error: "Appointment already has an invoice",
        });
        return;
      }
    }

    // Convert cents to decimal amount
    const amount = parseFloat((parseInt(amountCents) / 100).toFixed(2));

    const invoice = await prisma.invoice.create({
      data: {
        patientId: parseInt(patientId),
        therapyPlanId: therapyPlanId ? parseInt(therapyPlanId) : null,
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        createdById: req.user.id,
        invoiceNumber: generateInvoiceNumber(),
        amount,
        amountCents: parseInt(amountCents),
        currency: currency || "USD",
        status: InvoiceStatus.PENDING,
        dueDate: dueDate ? new Date(dueDate) : null,
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
        therapyPlan: true,
        appointment: true,
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { invoice },
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Get invoices list with filters
 * GET /api/invoices
 */
export async function getInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const status = req.query.status as InvoiceStatus | undefined;
    const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const where: any = {};

    // Patient can only view their own invoices
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

    if (status) {
      where.status = status;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const invoices = await prisma.invoice.findMany({
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
        therapyPlan: true,
        appointment: true,
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { invoices },
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Update invoice status
 * PATCH /api/invoices/:id
 * Requires: ADMIN or RECEPTIONIST
 */
export async function updateInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Only admin and receptionist can update invoices
    if (![Role.ADMIN, Role.RECEPTIONIST].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Only admin and receptionist can update invoices",
      });
      return;
    }

    const id = parseInt(req.params.id);
    const { status, paidDate, notes } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: "Invoice not found",
      });
      return;
    }

    // If marking as paid, set paidDate
    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === InvoiceStatus.PAID && !paidDate) {
        updateData.paidDate = new Date();
      }
    }
    if (paidDate) {
      updateData.paidDate = new Date(paidDate);
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        therapyPlan: true,
        appointment: true,
      },
    });

    res.json({
      success: true,
      data: { invoice: updated },
    });
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Void invoice (destructive action - creates AuditLog)
 * POST /api/invoices/:id/void
 * Requires: ADMIN or RECEPTIONIST
 */
export async function voidInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Only admin and receptionist can void invoices
    if (![Role.ADMIN, Role.RECEPTIONIST].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Only admin and receptionist can void invoices",
      });
      return;
    }

    const id = parseInt(req.params.id);
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "Reason is required for voiding an invoice",
      });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: "Invoice not found",
      });
      return;
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      res.status(400).json({
        success: false,
        error: "Invoice is already voided",
      });
      return;
    }

    // Update invoice status to cancelled
    const voided = await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        notes: `${invoice.notes || ""}\nVoided: ${reason}`.trim(),
      },
      include: {
        patient: true,
      },
    });

    // Create AuditLog entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          entityType: "Invoice",
          entityId: id,
          action: "VOID",
          changes: JSON.stringify({
            status: invoice.status,
            newStatus: InvoiceStatus.CANCELLED,
            reason,
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
        invoice: voided,
        message: "Invoice voided successfully",
      },
    });
  } catch (error) {
    console.error("Void invoice error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

