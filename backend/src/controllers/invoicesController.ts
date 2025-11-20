import { Request, Response } from "express";
import { Role, InvoiceStatus, NotificationType } from "@prisma/client";
import { prisma } from "../prisma";
import { AuthenticatedRequest, requireAdmin, requireStaff } from "../middleware/authMiddleware";
import { sendNotificationEmail } from "../lib/email";
import { LocalStorageAdapter } from "../lib/storage";
import path from "path";

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
    const allowedRoles: Role[] = [Role.ADMIN, Role.RECEPTIONIST];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Only admin and receptionist can create invoices",
      });
      return;
    }

    const { 
      patientId, 
      amountCents, 
      currency, 
      therapyPlanId, 
      appointmentId, 
      dueDate, 
      notes,
      lineItems,
      taxable,
      taxRate
    } = req.body;

    if (!patientId) {
      res.status(400).json({
        success: false,
        error: "Patient ID is required",
      });
      return;
    }

    // Validate line items if provided
    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      for (const item of lineItems) {
        if (!item.description || item.quantity === undefined || item.unitPrice === undefined) {
          res.status(400).json({
            success: false,
            error: "Line items must have description, quantity, and unitPrice",
          });
          return;
        }
      }
    } else if (amountCents === undefined) {
      res.status(400).json({
        success: false,
        error: "Either line items or amount (in cents) is required",
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

    // Calculate subtotal from line items or use provided amount
    let subtotal = 0;
    let calculatedAmountCents = 0;

    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      // Calculate from line items
      for (const item of lineItems) {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const itemTotal = quantity * unitPrice;
        subtotal += itemTotal;
      }
      calculatedAmountCents = Math.round(subtotal * 100);
    } else {
      // Use provided amount
      calculatedAmountCents = parseInt(amountCents);
      subtotal = parseFloat((calculatedAmountCents / 100).toFixed(2));
    }

    // Calculate tax if applicable
    const isTaxable = taxable === true || taxable === 'true';
    const taxRateValue = isTaxable && taxRate ? parseFloat(taxRate) : null;
    let taxAmount = null;
    let finalAmount = subtotal;

    if (isTaxable && taxRateValue && taxRateValue > 0) {
      taxAmount = parseFloat((subtotal * (taxRateValue / 100)).toFixed(2));
      finalAmount = subtotal + taxAmount;
    }

    const finalAmountCents = Math.round(finalAmount * 100);

    // Create invoice with line items
    const invoice = await prisma.invoice.create({
      data: {
        patientId: parseInt(patientId),
        therapyPlanId: therapyPlanId ? parseInt(therapyPlanId) : null,
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        createdById: req.user.id,
        invoiceNumber: generateInvoiceNumber(),
        subtotal: subtotal,
        amount: finalAmount,
        amountCents: finalAmountCents,
        currency: currency || "USD",
        taxable: isTaxable,
        taxRate: taxRateValue ? taxRateValue : null,
        taxAmount: taxAmount,
        status: InvoiceStatus.PENDING,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        lineItems: lineItems && Array.isArray(lineItems) && lineItems.length > 0 ? {
          create: lineItems.map((item: any) => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const total = quantity * unitPrice;
            return {
              description: item.description,
              quantity: quantity,
              unitPrice: unitPrice,
              total: total,
            };
          }),
        } : undefined,
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
        appointment: {
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        lineItems: true,
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
        appointment: {
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        lineItems: {
          orderBy: {
            id: "asc",
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
    const allowedRoles: Role[] = [Role.ADMIN, Role.RECEPTIONIST];
    if (!allowedRoles.includes(req.user.role)) {
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
    const allowedRoles: Role[] = [Role.ADMIN, Role.RECEPTIONIST];
    if (!allowedRoles.includes(req.user.role)) {
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

export async function sendInvoiceEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const id = parseInt(req.params.id);
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { 
          include: { 
            user: { select: { email: true, id: true } } 
          } 
        },
        createdBy: { select: { id: true } },
        lineItems: {
          orderBy: { id: "asc" },
        },
        therapyPlan: true,
        appointment: {
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!inv) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    const to = inv.patient?.user?.email;
    if (!to) {
      res.status(400).json({ success: false, error: "Patient email not found" });
      return;
    }

    const formatCurrency = (amount: number | string, currency: string = 'USD') => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(numAmount);
    };

    const formatDate = (date: Date | string | null) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const subject = `Invoice ${inv.invoiceNumber || '#' + inv.id}`;
    
    // Build line items HTML
    let lineItemsHtml = '';
    if (inv.lineItems && inv.lineItems.length > 0) {
      lineItemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
              <th style="text-align: left; padding: 12px; font-weight: 600;">Description</th>
              <th style="text-align: right; padding: 12px; font-weight: 600;">Quantity</th>
              <th style="text-align: right; padding: 12px; font-weight: 600;">Unit Price</th>
              <th style="text-align: right; padding: 12px; font-weight: 600;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${inv.lineItems.map((item: any) => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">${item.description}</td>
                <td style="text-align: right; padding: 12px;">${item.quantity}</td>
                <td style="text-align: right; padding: 12px;">${formatCurrency(item.unitPrice, inv.currency || 'USD')}</td>
                <td style="text-align: right; padding: 12px; font-weight: 600;">${formatCurrency(item.total, inv.currency || 'USD')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .invoice-header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .invoice-body { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .invoice-footer { background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; }
          .summary-table { width: 100%; margin-top: 20px; }
          .summary-table td { padding: 8px 0; }
          .summary-table td:last-child { text-align: right; font-weight: 600; }
          .total-row { border-top: 2px solid #e5e7eb; font-size: 1.2em; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1 style="margin: 0;">${subject}</h1>
          <p style="margin: 5px 0 0 0;">Physio Platform</p>
        </div>
        <div class="invoice-body">
          <div style="margin-bottom: 30px;">
            <p><strong>Patient:</strong> ${inv.patient.firstName} ${inv.patient.lastName}</p>
            <p><strong>Invoice Date:</strong> ${formatDate(inv.createdAt)}</p>
            ${inv.dueDate ? `<p><strong>Due Date:</strong> ${formatDate(inv.dueDate)}</p>` : ''}
            ${inv.therapyPlan ? `<p><strong>Therapy Plan:</strong> ${inv.therapyPlan.name || 'N/A'}</p>` : ''}
            ${inv.appointment ? `<p><strong>Appointment:</strong> ${formatDate(inv.appointment.date)} with Dr. ${inv.appointment.doctor?.firstName} ${inv.appointment.doctor?.lastName}</p>` : ''}
          </div>
          
          ${lineItemsHtml}
          
          <table class="summary-table">
            <tr>
              <td>Subtotal:</td>
              <td>${formatCurrency(inv.subtotal, inv.currency || 'USD')}</td>
            </tr>
            ${inv.taxable && inv.taxRate && inv.taxAmount ? `
            <tr>
              <td>Tax (${inv.taxRate}%):</td>
              <td>${formatCurrency(inv.taxAmount, inv.currency || 'USD')}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>Total:</td>
              <td>${formatCurrency(inv.amount, inv.currency || 'USD')}</td>
            </tr>
          </table>
          
          ${inv.notes ? `<div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 4px;"><strong>Notes:</strong><br>${inv.notes}</div>` : ''}
        </div>
        <div class="invoice-footer">
          <p style="margin: 0; color: #6b7280; font-size: 0.9em;">Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;

    await sendNotificationEmail(to, subject, html);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
}

/**
 * Get invoice for PDF/view
 * GET /api/invoices/:id
 */
export async function getInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const id = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({
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
        therapyPlan: true,
        appointment: {
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        paymentProofUpload: {
          select: {
            id: true,
            fileName: true,
            filePath: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
          },
        },
        paymentProofReviewedByUser: {
          select: {
            id: true,
            email: true,
          },
        },
        lineItems: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    // Check permissions: patient can only view their own invoices
    if (req.user.role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id },
      });

      if (!patient || patient.id !== invoice.patientId) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }
    }

    res.json({ success: true, data: { invoice } });
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

const storage = new LocalStorageAdapter({
  uploadsDir: path.join(process.cwd(), "backend", "uploads"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://localhost:4000",
});

/**
 * Upload payment proof for invoice
 * POST /api/invoices/:id/upload-payment-proof
 * Requires: PATIENT (can only upload for their own invoices)
 */
export async function uploadPaymentProof(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    if (req.user.role !== Role.PATIENT) {
      res.status(403).json({ success: false, error: "Only patients can upload payment proof" });
      return;
    }

    const invoiceId = parseInt(req.params.id);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    // Verify patient owns this invoice
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.id },
    });

    if (!patient || patient.id !== invoice.patientId) {
      res.status(403).json({ success: false, error: "You can only upload payment proof for your own invoices" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }

    // Save file using storage adapter
    const multerFile = req.file as Express.Multer.File;
    const stored = await storage.saveFile(multerFile, { 
      uploadedBy: req.user.id.toString() 
    });

    // Create upload record
    const upload = await prisma.upload.create({
      data: {
        fileName: stored.filename,
        filePath: storage.getFilePath(stored.key),
        fileType: stored.mimeType,
        fileSize: stored.size,
        patientId: patient.id,
        entityType: "invoice_payment_proof",
        entityId: invoiceId,
        uploadedBy: req.user.id,
      },
    });

    // Update invoice with payment proof upload ID
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentProofUploadId: upload.id,
      },
    });

    // Get all admins and receptionists
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true, email: true },
    });

    const receptionists = await prisma.user.findMany({
      where: { role: Role.RECEPTIONIST },
      select: { id: true, email: true },
    });

    const patientName = `${invoice.patient.firstName} ${invoice.patient.lastName}`;

    // Create notifications for all admins
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Payment Proof Uploaded",
          message: `Patient ${patientName} has uploaded payment proof for invoice ${invoice.invoiceNumber}. Please review and mark as paid if verified.`,
          type: NotificationType.INFO,
          payload: JSON.stringify({
            invoiceId: invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            patientId: patient.id,
            patientName: patientName,
            uploadId: upload.id,
            uploadFileName: upload.fileName,
          }),
          read: false,
        },
      });
    }

    // Create notifications for all receptionists
    for (const receptionist of receptionists) {
      await prisma.notification.create({
        data: {
          userId: receptionist.id,
          title: "Payment Proof Uploaded",
          message: `Patient ${patientName} has uploaded payment proof for invoice ${invoice.invoiceNumber}. Please review and mark as paid if verified.`,
          type: NotificationType.INFO,
          payload: JSON.stringify({
            invoiceId: invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            patientId: patient.id,
            patientName: patientName,
            uploadId: upload.id,
            uploadFileName: upload.fileName,
          }),
          read: false,
        },
      });
    }

    res.json({
      success: true,
      data: {
        upload: {
          id: upload.id,
          fileName: upload.fileName,
          filePath: upload.filePath,
          fileType: upload.fileType,
          fileSize: upload.fileSize,
        },
        message: "Payment proof uploaded successfully. Admin/Receptionist will review it shortly.",
      },
    });
  } catch (error) {
    console.error("Upload payment proof error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Review payment proof and mark invoice as paid
 * POST /api/invoices/:id/review-payment-proof
 * Requires: ADMIN or RECEPTIONIST
 */
export async function reviewPaymentProof(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const allowedRoles: Role[] = [Role.ADMIN, Role.RECEPTIONIST];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Only admin and receptionist can review payment proofs" });
      return;
    }

    const invoiceId = parseInt(req.params.id);
    const { approved, notes } = req.body;

    if (approved === undefined) {
      res.status(400).json({ success: false, error: "Approval status is required" });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
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

    if (!invoice) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    if (!invoice.paymentProofUploadId) {
      res.status(400).json({ success: false, error: "No payment proof uploaded for this invoice" });
      return;
    }

    const updateData: any = {
      paymentProofReviewedAt: new Date(),
      paymentProofReviewedBy: req.user.id,
    };

    if (approved) {
      // Mark invoice as paid
      updateData.status = InvoiceStatus.PAID;
      updateData.paidDate = new Date();
      if (notes) {
        updateData.notes = invoice.notes 
          ? `${invoice.notes}\n\nPayment verified: ${notes}` 
          : `Payment verified: ${notes}`;
      }
    } else {
      // Reject payment proof (keep invoice as pending but mark as reviewed)
      if (notes) {
        updateData.notes = invoice.notes 
          ? `${invoice.notes}\n\nPayment proof rejected: ${notes}` 
          : `Payment proof rejected: ${notes}`;
      }
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
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
        paymentProofUpload: true,
      },
    });

    // Create notification for patient
    if (invoice.patient.user?.id) {
      await prisma.notification.create({
        data: {
          userId: invoice.patient.user.id,
          title: approved ? "Payment Verified" : "Payment Proof Rejected",
          message: approved
            ? `Your payment proof for invoice ${invoice.invoiceNumber} has been verified and the invoice has been marked as paid. Thank you!`
            : `Your payment proof for invoice ${invoice.invoiceNumber} has been rejected. ${notes || "Please contact us for more information."}`,
          type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
          payload: JSON.stringify({
            invoiceId: invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            approved: approved,
            reviewedBy: req.user.id,
            reviewedAt: new Date().toISOString(),
          }),
          read: false,
        },
      });
    }

    res.json({
      success: true,
      data: {
        invoice: updatedInvoice,
        message: approved 
          ? "Payment proof approved and invoice marked as paid" 
          : "Payment proof rejected",
      },
    });
  } catch (error) {
    console.error("Review payment proof error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

