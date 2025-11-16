"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTherapyPlans = listTherapyPlans;
exports.createTherapyPlan = createTherapyPlan;
exports.getTherapyPlan = getTherapyPlan;
exports.addExerciseToPlan = addExerciseToPlan;
exports.updateExerciseInPlan = updateExerciseInPlan;
exports.archiveExerciseFromPlan = archiveExerciseFromPlan;
exports.reorderExercisesInPlan = reorderExercisesInPlan;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
/**
 * List therapy plans
 * GET /api/therapy-plans
 * Requires: Authentication (Patient sees own plans, Staff sees all)
 */
async function listTherapyPlans(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        const where = {};
        // Patients can only see their own plans
        if (req.user.role === client_1.Role.PATIENT) {
            const patient = await prisma_1.prisma.patient.findUnique({ where: { userId: req.user.id } });
            if (patient) {
                where.patientId = patient.id;
            }
            else {
                res.json({ success: true, data: [] });
                return;
            }
        }
        // Staff can filter by patientId or doctorId if provided
        if (req.query.patientId)
            where.patientId = parseInt(req.query.patientId);
        if (req.query.doctorId) {
            const did = req.query.doctorId === 'me' ? undefined : parseInt(req.query.doctorId);
            if (did)
                where.doctorId = did;
            if (!did && req.user.role === client_1.Role.PHYSIOTHERAPIST) {
                const doc = await prisma_1.prisma.doctor.findUnique({ where: { userId: req.user.id } });
                if (doc)
                    where.doctorId = doc.id;
            }
        }
        const therapyPlans = await prisma_1.prisma.therapyPlan.findMany({
            where,
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, regNumber: true } },
                doctor: { select: { id: true, userId: true, firstName: true, lastName: true } },
                exercises: {
                    where: { archived: false },
                    include: { exercise: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ success: true, data: therapyPlans });
    }
    catch (error) {
        console.error("List therapy plans error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Create therapy plan
 * POST /api/therapy-plans
 * Requires: ADMIN, RECEPTIONIST, or PHYSIOTHERAPIST
 */
async function createTherapyPlan(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: "Authentication required" });
            return;
        }
        let { patientId, doctorId, name, description, startDate, endDate, status } = req.body;
        if (!patientId || !name) {
            res.status(400).json({ success: false, error: "Patient ID and name are required" });
            return;
        }
        // Resolve doctorId for physiotherapist
        if (!doctorId && req.user.role === client_1.Role.PHYSIOTHERAPIST) {
            const doc = await prisma_1.prisma.doctor.findUnique({ where: { userId: req.user.id } });
            doctorId = doc?.id;
        }
        if (!doctorId) {
            res.status(400).json({ success: false, error: "Doctor ID is required" });
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
        // Permission: physiotherapist may only create under themselves
        if (req.user.role === client_1.Role.PHYSIOTHERAPIST && doctor.userId !== req.user.id) {
            res.status(403).json({ success: false, error: "You can only create therapy plans for your own patients" });
            return;
        }
        const therapyPlan = await prisma_1.prisma.therapyPlan.create({
            data: {
                patientId: parseInt(patientId),
                doctorId: parseInt(doctorId),
                name,
                description,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                status: status || client_1.TherapyPlanStatus.ACTIVE,
                version: 1,
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                doctor: { select: { id: true, userId: true, firstName: true, lastName: true } },
                exercises: { where: { archived: false }, include: { exercise: true } },
            },
        });
        res.status(201).json({ success: true, data: { therapyPlan } });
    }
    catch (error) {
        console.error("Create therapy plan error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Get therapy plan by ID with exercises
 * GET /api/therapy-plans/:id
 */
async function getTherapyPlan(req, res) {
    try {
        const id = parseInt(req.params.id);
        const therapyPlan = await prisma_1.prisma.therapyPlan.findUnique({
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
        if (req.user?.role === client_1.Role.PATIENT) {
            const patient = await prisma_1.prisma.patient.findUnique({
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
    }
    catch (error) {
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
async function addExerciseToPlan(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        const planId = parseInt(req.params.id);
        const { exerciseId, order, reps, sets, duration, frequency, notes, name, description, difficulty } = req.body;
        // Get therapy plan
        const therapyPlan = await prisma_1.prisma.therapyPlan.findUnique({
            where: { id: planId },
            include: {
                doctor: true,
            },
        });
        if (!therapyPlan) {
            res.status(404).json({ success: false, error: "Therapy plan not found" });
            return;
        }
        // Check permissions: doctor can only edit their own plans
        if (req.user.role === client_1.Role.PHYSIOTHERAPIST && therapyPlan.doctor.userId !== req.user.id) {
            res.status(403).json({ success: false, error: "You can only edit therapy plans for your own patients" });
            return;
        }
        // Resolve exercise: either by provided exerciseId, or create new from name/description
        let resolvedExerciseId = null;
        if (exerciseId) {
            const exercise = await prisma_1.prisma.exercise.findUnique({ where: { id: parseInt(exerciseId) } });
            if (!exercise || exercise.archived) {
                res.status(404).json({ success: false, error: "Exercise not found or archived" });
                return;
            }
            resolvedExerciseId = exercise.id;
        }
        else if (name && typeof name === 'string') {
            const norm = (typeof difficulty === 'string' ? String(difficulty).toUpperCase() : undefined);
            const data = {
                name: name.trim(),
                description: description || null,
                archived: false,
            };
            if (norm === 'BEGINNER' || norm === 'INTERMEDIATE' || norm === 'ADVANCED') {
                data.difficulty = norm;
            }
            const created = await prisma_1.prisma.exercise.create({ data });
            resolvedExerciseId = created.id;
        }
        else {
            res.status(400).json({ success: false, error: "Provide exerciseId or name to create a new exercise" });
            return;
        }
        // Create therapy plan exercise
        const therapyPlanExercise = await prisma_1.prisma.therapyPlanExercise.create({
            data: {
                therapyPlanId: planId,
                exerciseId: resolvedExerciseId,
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
        await prisma_1.prisma.therapyPlan.update({ where: { id: planId }, data: { version: newVersion } });
        await prisma_1.prisma.therapyPlanVersion.create({
            data: {
                therapyPlanId: planId,
                version: newVersion,
                summary: `Exercise added to plan`,
                createdBy: req.user.id,
            },
        });
        res.status(201).json({ success: true, data: { therapyPlanExercise, newVersion, message: "Exercise added and plan version bumped" } });
    }
    catch (error) {
        console.error("Add exercise to plan error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
/**
 * Update exercise in therapy plan
 * PATCH /api/therapy-plans/:id/exercises/:exerciseId
 * Requires: ADMIN or PHYSIOTHERAPIST (assigned doctor)
 */
async function updateExerciseInPlan(req, res) {
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
        const therapyPlan = await prisma_1.prisma.therapyPlan.findUnique({
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
        if (req.user.role === client_1.Role.PHYSIOTHERAPIST && therapyPlan.doctor.userId !== req.user.id) {
            res.status(403).json({
                success: false,
                error: "You can only edit therapy plans for your own patients",
            });
            return;
        }
        // Find therapy plan exercise
        const therapyPlanExercise = await prisma_1.prisma.therapyPlanExercise.findFirst({
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
        const updated = await prisma_1.prisma.therapyPlanExercise.update({
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
    }
    catch (error) {
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
async function archiveExerciseFromPlan(req, res) {
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
        const therapyPlan = await prisma_1.prisma.therapyPlan.findUnique({
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
        if (req.user.role === client_1.Role.PHYSIOTHERAPIST && therapyPlan.doctor.userId !== req.user.id) {
            res.status(403).json({
                success: false,
                error: "You can only edit therapy plans for your own patients",
            });
            return;
        }
        // Find therapy plan exercise
        const therapyPlanExercise = await prisma_1.prisma.therapyPlanExercise.findFirst({
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
        const archived = await prisma_1.prisma.therapyPlanExercise.update({
            where: { id: therapyPlanExercise.id },
            data: { archived: true },
        });
        // Bump version and create version record
        const newVersion = therapyPlan.version + 1;
        await prisma_1.prisma.therapyPlan.update({
            where: { id: planId },
            data: { version: newVersion },
        });
        await prisma_1.prisma.therapyPlanVersion.create({
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
    }
    catch (error) {
        console.error("Archive exercise from plan error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
async function reorderExercisesInPlan(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: "Authentication required" });
            return;
        }
        const planId = parseInt(req.params.id);
        const items = Array.isArray(req.body?.items) ? req.body.items : [];
        if (!items.length) {
            res.status(400).json({ success: false, error: "items array required" });
            return;
        }
        const plan = await prisma_1.prisma.therapyPlan.findUnique({ where: { id: planId }, include: { doctor: true } });
        if (!plan) {
            res.status(404).json({ success: false, error: "Therapy plan not found" });
            return;
        }
        if (req.user.role === client_1.Role.PHYSIOTHERAPIST && plan.doctor.userId !== req.user.id) {
            res.status(403).json({ success: false, error: "You can only edit your own plans" });
            return;
        }
        // Update in a transaction
        await prisma_1.prisma.$transaction(items.map((it) => prisma_1.prisma.therapyPlanExercise.update({ where: { id: it.id }, data: { order: it.order } })));
        // Bump version
        const newVersion = plan.version + 1;
        await prisma_1.prisma.therapyPlan.update({ where: { id: planId }, data: { version: newVersion } });
        await prisma_1.prisma.therapyPlanVersion.create({ data: { therapyPlanId: planId, version: newVersion, summary: 'Reordered exercises', createdBy: req.user.id } });
        res.json({ success: true, data: { newVersion } });
    }
    catch (e) {
        console.error('reorderExercisesInPlan error', e);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
