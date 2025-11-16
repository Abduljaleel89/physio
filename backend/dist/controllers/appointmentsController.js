"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAppointments = listAppointments;
exports.createAppointment = createAppointment;
exports.getAppointment = getAppointment;
exports.updateAppointment = updateAppointment;
exports.cancelAppointment = cancelAppointment;
exports.getAppointmentsForCalendar = getAppointmentsForCalendar;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
function computeEnd(date, duration) {
    return new Date(date.getTime() + (duration || 60) * 60 * 1000);
}
function withinBusinessHours(date, duration) {
    const startHour = parseInt(process.env.BUSINESS_START_HOUR || "8");
    const endHour = parseInt(process.env.BUSINESS_END_HOUR || "18");
    const start = new Date(date);
    const end = computeEnd(date, duration);
    const sH = start.getHours();
    const eH = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
    return sH >= startHour && eH <= endHour;
}
async function hasDoctorConflict(doctorId, date, duration, excludeId) {
    const end = computeEnd(date, duration);
    const conflicts = await prisma_1.prisma.appointment.findMany({
        where: {
            doctorId,
            status: { not: client_1.AppointmentStatus.CANCELLED },
            ...(excludeId ? { id: { not: excludeId } } : {}),
            AND: [
                { date: { lt: end } },
                {},
            ],
        },
        select: { id: true, date: true, duration: true },
    });
    return conflicts.some((a) => {
        const aStart = new Date(a.date);
        const aEnd = computeEnd(aStart, a.duration);
        return aStart < end && date < aEnd;
    });
}
/**
 * List appointments
 * GET /api/appointments
 * Requires: Authentication (Patient sees own appointments, Staff sees all)
 */
async function listAppointments(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        const where = {};
        // Patients can only see their own appointments
        if (req.user.role === client_1.Role.PATIENT) {
            const patient = await prisma_1.prisma.patient.findUnique({
                where: { userId: req.user.id },
            });
            if (patient) {
                where.patientId = patient.id;
            }
            else {
                res.json({ success: true, data: [] });
                return;
            }
        }
        // Staff can filter by patientId or doctorId if provided
        if (req.query.patientId) {
            where.patientId = parseInt(req.query.patientId);
        }
        if (req.query.doctorId) {
            where.doctorId = parseInt(req.query.doctorId);
        }
        if (req.query.status) {
            where.status = req.query.status;
        }
        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            where.date = {};
            if (req.query.startDate) {
                where.date.gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                where.date.lte = new Date(req.query.endDate);
            }
        }
        const appointments = await prisma_1.prisma.appointment.findMany({
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
    }
    catch (error) {
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
async function createAppointment(req, res) {
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
            res.status(400).json({ success: false, error: "Patient ID, doctor ID, and date are required" });
            return;
        }
        const apptDate = new Date(date);
        const apptDuration = duration || 60;
        if (!withinBusinessHours(apptDate, apptDuration)) {
            res.status(400).json({ success: false, error: "Outside business hours" });
            return;
        }
        // Verify patient exists
        const patient = await prisma_1.prisma.patient.findUnique({ where: { id: parseInt(patientId) } });
        if (!patient) {
            res.status(404).json({ success: false, error: "Patient not found" });
            return;
        }
        // Verify doctor exists
        const doctor = await prisma_1.prisma.doctor.findUnique({ where: { id: parseInt(doctorId) } });
        if (!doctor) {
            res.status(404).json({ success: false, error: "Doctor not found" });
            return;
        }
        // Conflict check
        const conflict = await hasDoctorConflict(parseInt(doctorId), apptDate, apptDuration);
        if (conflict) {
            res.status(409).json({ success: false, error: "Doctor has a conflicting appointment" });
            return;
        }
        const appointment = await prisma_1.prisma.appointment.create({
            data: {
                patientId: parseInt(patientId),
                doctorId: parseInt(doctorId),
                createdById: req.user.id,
                visitRequestId: visitRequestId ? parseInt(visitRequestId) : null,
                date: apptDate,
                duration: apptDuration,
                status: status || client_1.AppointmentStatus.SCHEDULED,
                notes,
            },
            include: {
                patient: { include: { user: { select: { id: true, email: true } } } },
                doctor: { include: { user: { select: { id: true, email: true } } } },
                visitRequest: true,
            },
        });
        res.status(201).json({ success: true, data: { appointment } });
    }
    catch (error) {
        console.error("Create appointment error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Get appointment by ID
 * GET /api/appointments/:id
 */
async function getAppointment(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        const id = parseInt(req.params.id);
        const appointment = await prisma_1.prisma.appointment.findUnique({
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
        if (req.user.role === client_1.Role.PATIENT) {
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
    }
    catch (error) {
        console.error("Get appointment error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
/** Update appointment */
async function updateAppointment(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: "Authentication required" });
            return;
        }
        const id = parseInt(req.params.id);
        const { date, duration, status, notes } = req.body;
        const existing = await prisma_1.prisma.appointment.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, error: "Appointment not found" });
            return;
        }
        const newDate = date ? new Date(date) : new Date(existing.date);
        const newDuration = duration !== undefined ? parseInt(duration) : existing.duration;
        if (!withinBusinessHours(newDate, newDuration)) {
            res.status(400).json({ success: false, error: "Outside business hours" });
            return;
        }
        const conflict = await hasDoctorConflict(existing.doctorId, newDate, newDuration, id);
        if (conflict) {
            res.status(409).json({ success: false, error: "Doctor has a conflicting appointment" });
            return;
        }
        const updated = await prisma_1.prisma.appointment.update({
            where: { id },
            data: {
                ...(date && { date: newDate }),
                ...(duration !== undefined && { duration: newDuration }),
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
            },
            include: { patient: true, doctor: true },
        });
        res.json({ success: true, data: { appointment: updated } });
    }
    catch (error) {
        console.error("Update appointment error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Cancel appointment (destructive action - creates AuditLog)
 * DELETE /api/appointments/:id
 * Requires: ADMIN, RECEPTIONIST, or PHYSIOTHERAPIST
 */
async function cancelAppointment(req, res) {
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
        const appointment = await prisma_1.prisma.appointment.findUnique({
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
        if (req.user.role === client_1.Role.PHYSIOTHERAPIST && appointment.doctor.userId !== req.user.id) {
            res.status(403).json({
                success: false,
                error: "You can only cancel your own appointments",
            });
            return;
        }
        // Update appointment status to cancelled
        const cancelled = await prisma_1.prisma.appointment.update({
            where: { id },
            data: {
                status: client_1.AppointmentStatus.CANCELLED,
                notes: reason ? `${appointment.notes || ""}\nCancelled: ${reason}`.trim() : appointment.notes,
            },
        });
        // Create AuditLog entry
        try {
            await prisma_1.prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    entityType: "Appointment",
                    entityId: id,
                    action: "CANCEL",
                    changes: JSON.stringify({
                        status: appointment.status,
                        newStatus: client_1.AppointmentStatus.CANCELLED,
                        reason: reason || "No reason provided",
                    }),
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"] || null,
                },
            });
        }
        catch (auditError) {
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
    }
    catch (error) {
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
async function getAppointmentsForCalendar(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const doctorId = req.query.doctorId ? parseInt(req.query.doctorId) : undefined;
        const patientId = req.query.patientId ? parseInt(req.query.patientId) : undefined;
        const status = req.query.status;
        if (!startDate || !endDate) {
            res.status(400).json({
                success: false,
                error: "startDate and endDate query parameters are required (ISO format)",
            });
            return;
        }
        const where = {
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };
        // Patient can only view their own appointments
        if (req.user.role === client_1.Role.PATIENT) {
            const patient = await prisma_1.prisma.patient.findUnique({
                where: { userId: req.user.id },
            });
            if (patient) {
                where.patientId = patient.id;
            }
            else {
                res.status(404).json({
                    success: false,
                    error: "Patient profile not found",
                });
                return;
            }
        }
        // Doctor can filter by their own appointments
        if (req.user.role === client_1.Role.PHYSIOTHERAPIST) {
            const doctor = await prisma_1.prisma.doctor.findUnique({
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
        const appointments = await prisma_1.prisma.appointment.findMany({
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
    }
    catch (error) {
        console.error("Get appointments for calendar error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
