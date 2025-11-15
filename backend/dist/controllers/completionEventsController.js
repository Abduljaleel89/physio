"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompletionEvent = createCompletionEvent;
exports.undoCompletionEvent = undoCompletionEvent;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const storage_1 = require("../lib/storage");
const path_1 = __importDefault(require("path"));
const storage = new storage_1.LocalStorageAdapter({
    uploadsDir: path_1.default.join(process.cwd(), "backend", "uploads"),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://localhost:4000",
});
/**
 * POST /patients/:patientId/complete
 * Accepts either JSON with mediaUploadId or multipart with file field "file"
 */
async function createCompletionEvent(req, res) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authUser = req.user;
        const patientId = parseInt(req.params.id || req.params.patientId);
        if (!authUser) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        // ownership check: patient can only create for themselves unless role elevated
        if (authUser.role === 'PATIENT' && authUser.id !== patientId && authUser.userId !== patientId) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return;
        }
        let { exerciseId, therapyPlanId, therapyPlanExerciseId, painRating, painLevel, note, notes, mediaUploadId: bodyMediaUploadId } = req.body;
        // Support both field name patterns (user's code uses exerciseId/therapyPlanId, ours uses therapyPlanExerciseId)
        let actualTherapyPlanExerciseId = therapyPlanExerciseId;
        if (!actualTherapyPlanExerciseId && exerciseId && therapyPlanId) {
            // Look up therapy plan exercise by exerciseId and therapyPlanId
            const found = await prisma_1.prisma.therapyPlanExercise.findFirst({
                where: {
                    exerciseId: parseInt(exerciseId),
                    therapyPlanId: parseInt(therapyPlanId),
                    archived: false,
                },
            });
            if (found) {
                actualTherapyPlanExerciseId = found.id.toString();
            }
        }
        if (!actualTherapyPlanExerciseId) {
            res.status(400).json({
                success: false,
                error: "Therapy plan exercise ID is required",
            });
            return;
        }
        // Get patient
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: patientId },
        });
        if (!patient) {
            res.status(404).json({
                success: false,
                error: "Patient not found",
            });
            return;
        }
        // Check permissions: patient can only create completions for themselves
        if (req.user && req.user.role === client_1.Role.PATIENT) {
            if (patient.userId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    error: "You can only create completion events for yourself",
                });
                return;
            }
        }
        // Verify therapy plan exercise exists and belongs to patient
        const therapyPlanExercise = await prisma_1.prisma.therapyPlanExercise.findUnique({
            where: { id: parseInt(actualTherapyPlanExerciseId) },
            include: {
                therapyPlan: {
                    include: {
                        patient: true,
                        doctor: true,
                    },
                },
            },
        });
        if (!therapyPlanExercise || therapyPlanExercise.archived) {
            res.status(404).json({
                success: false,
                error: "Therapy plan exercise not found or archived",
            });
            return;
        }
        if (therapyPlanExercise.therapyPlan.patientId !== patientId) {
            res.status(403).json({
                success: false,
                error: "Therapy plan exercise does not belong to this patient",
            });
            return;
        }
        let mediaUploadId = bodyMediaUploadId ?? null;
        // If file uploaded in the request (combined flow), save to storage and create Upload record
        if (req.file) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const multerFile = req.file;
                const stored = await storage.saveFile(multerFile, { uploadedBy: authUser.id?.toString() ?? authUser.userId?.toString() ?? null });
                const upload = await prisma_1.prisma.upload.create({
                    data: {
                        fileName: stored.filename,
                        filePath: storage.getFilePath(stored.key),
                        fileType: stored.mimeType,
                        fileSize: stored.size,
                        patientId: patientId,
                        entityType: "completion",
                        entityId: null,
                        uploadedBy: authUser.id ?? authUser.userId ?? null,
                    },
                });
                mediaUploadId = upload.id.toString();
            }
            catch (uploadError) {
                console.error("File upload error:", uploadError);
                res.status(500).json({
                    success: false,
                    error: "Failed to upload file: " + (uploadError.message || "Unknown error"),
                });
                return;
            }
        }
        // Verify media upload if provided (existing upload or newly created)
        if (mediaUploadId) {
            const upload = await prisma_1.prisma.upload.findUnique({
                where: { id: parseInt(mediaUploadId) },
            });
            if (!upload || (upload.patientId !== null && upload.patientId !== patientId)) {
                res.status(404).json({
                    success: false,
                    error: "Media upload not found or does not belong to this patient",
                });
                return;
            }
        }
        // Create completion event (adapting field names: user's painRating/note vs our painLevel/notes)
        const completionEvent = await prisma_1.prisma.completionEvent.create({
            data: {
                therapyPlanExerciseId: parseInt(actualTherapyPlanExerciseId),
                mediaUploadId: mediaUploadId ? parseInt(mediaUploadId) : null,
                notes: notes ?? note ?? null,
                painLevel: (painLevel ? parseInt(painLevel.toString()) : painRating ? parseInt(painRating.toString()) : null),
                satisfaction: req.body.satisfaction ? parseInt(req.body.satisfaction.toString()) : null,
                undone: false,
            },
            include: {
                therapyPlanExercise: {
                    include: {
                        exercise: true,
                    },
                },
                mediaUpload: true,
            },
        });
        // Update upload entityId if it was created as part of this completion
        if (mediaUploadId && req.file) {
            await prisma_1.prisma.upload.update({
                where: { id: parseInt(mediaUploadId) },
                data: { entityId: completionEvent.id },
            });
        }
        // create notification for assigned doctor if any
        // business logic: find assigned doctor via therapyPlan
        if (therapyPlanExercise.therapyPlan.doctorId) {
            try {
                const doctor = await prisma_1.prisma.doctor.findUnique({ where: { id: therapyPlanExercise.therapyPlan.doctorId } });
                if (doctor?.userId) {
                    await prisma_1.prisma.notification.create({
                        data: {
                            userId: doctor.userId,
                            title: "Exercise Completed",
                            message: `Patient ${patient.firstName} ${patient.lastName} completed an exercise`,
                            type: client_1.NotificationType.INFO,
                            payload: JSON.stringify({ completionId: completionEvent.id, patientId }),
                            read: false,
                        },
                    });
                    // if email lib has sendNotificationEmail, optionally call it:
                    try {
                        // dynamic import to avoid circulars if any
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const emailLib = require('../lib/email');
                        if (typeof emailLib.sendNotificationEmail === 'function') {
                            const doctorUser = await prisma_1.prisma.user.findUnique({ where: { id: doctor.userId } });
                            if (doctorUser) {
                                await emailLib.sendNotificationEmail(doctorUser.email, 'Patient completed an exercise', `<p>Patient ${patient.firstName} ${patient.lastName} completed exercise</p>`).catch(() => null);
                            }
                        }
                    }
                    catch (e) {
                        // ignore email send failures (non-fatal)
                    }
                }
            }
            catch (notificationError) {
                console.error("Failed to create notification:", notificationError);
                // Continue even if notification fails
            }
        }
        res.status(201).json({
            success: true,
            data: {
                completionEvent: {
                    id: completionEvent.id,
                    completedAt: completionEvent.completedAt,
                    notes: completionEvent.notes,
                    painLevel: completionEvent.painLevel,
                    satisfaction: completionEvent.satisfaction,
                },
                message: "Completion event created successfully",
            },
        });
    }
    catch (error) {
        console.error("Create completion event error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
/**
 * Undo completion event
 * POST /api/completion-events/:id/undo
 * - Patients can undo within 5 minutes
 * - Doctors/Admins can undo anytime (requires reason and creates AuditLog)
 */
async function undoCompletionEvent(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        const completionEventId = parseInt(req.params.id);
        const { reason } = req.body;
        // Get completion event
        const completionEvent = await prisma_1.prisma.completionEvent.findUnique({
            where: { id: completionEventId },
            include: {
                therapyPlanExercise: {
                    include: {
                        therapyPlan: {
                            include: {
                                patient: true,
                            },
                        },
                    },
                },
            },
        });
        if (!completionEvent) {
            res.status(404).json({
                success: false,
                error: "Completion event not found",
            });
            return;
        }
        if (completionEvent.undone) {
            res.status(400).json({
                success: false,
                error: "Completion event has already been undone",
            });
            return;
        }
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        const isPatient = req.user.role === client_1.Role.PATIENT;
        const allowedStaffRoles = [client_1.Role.ADMIN, client_1.Role.PHYSIOTHERAPIST, client_1.Role.RECEPTIONIST];
        const isStaff = allowedStaffRoles.includes(req.user.role);
        // Check permissions
        if (isPatient) {
            // Patient can only undo their own completions
            if (completionEvent.therapyPlanExercise.therapyPlan.patient.userId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    error: "You can only undo your own completion events",
                });
                return;
            }
            // Check 5-minute rule for patients
            const completedAt = new Date(completionEvent.completedAt);
            const now = new Date();
            const minutesDiff = (now.getTime() - completedAt.getTime()) / (1000 * 60);
            if (minutesDiff > 5) {
                res.status(403).json({
                    success: false,
                    error: "You can only undo completion events within 5 minutes",
                });
                return;
            }
        }
        else if (isStaff) {
            // Staff requires reason for undo
            if (!reason || reason.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    error: "Reason is required for staff/admin undo",
                });
                return;
            }
        }
        else {
            res.status(403).json({
                success: false,
                error: "Access denied",
            });
            return;
        }
        // Update completion event
        const undoneCompletionEvent = await prisma_1.prisma.completionEvent.update({
            where: { id: completionEventId },
            data: {
                undone: true,
                undoneAt: new Date(),
                undoneReason: isStaff ? reason : null,
                undoneBy: req.user.id,
            },
        });
        // Create AuditLog for staff/admin undo
        if (isStaff) {
            try {
                await prisma_1.prisma.auditLog.create({
                    data: {
                        userId: req.user.id,
                        entityType: "CompletionEvent",
                        entityId: completionEventId,
                        action: "UNDO",
                        changes: JSON.stringify({
                            reason,
                            undoneAt: new Date().toISOString(),
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
        }
        res.json({
            success: true,
            data: {
                completionEvent: undoneCompletionEvent,
                message: "Completion event undone successfully",
            },
        });
    }
    catch (error) {
        console.error("Undo completion event error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
