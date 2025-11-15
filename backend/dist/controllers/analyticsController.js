"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdherenceAnalytics = getAdherenceAnalytics;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
/**
 * Get analytics/adherence data
 * GET /api/analytics/adherence
 * Returns counts of completions per therapy plan for a date range
 * Requires: ADMIN or PHYSIOTHERAPIST
 */
async function getAdherenceAnalytics(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        // Check permissions: only admin and doctor can view analytics
        const allowedRoles = [client_1.Role.ADMIN, client_1.Role.PHYSIOTHERAPIST];
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: "Access denied. Admin or Physiotherapist role required",
            });
            return;
        }
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const therapyPlanId = req.query.therapyPlanId ? parseInt(req.query.therapyPlanId) : undefined;
        if (!startDate || !endDate) {
            res.status(400).json({
                success: false,
                error: "startDate and endDate query parameters are required (ISO format)",
            });
            return;
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({
                success: false,
                error: "Invalid date format. Use ISO format (YYYY-MM-DD)",
            });
            return;
        }
        // Build where clause
        const where = {
            completedAt: {
                gte: start,
                lte: end,
            },
            undone: false,
        };
        if (therapyPlanId) {
            // Get therapy plan exercises for this plan
            const planExercises = await prisma_1.prisma.therapyPlanExercise.findMany({
                where: { therapyPlanId },
                select: { id: true },
            });
            where.therapyPlanExerciseId = {
                in: planExercises.map((e) => e.id),
            };
        }
        // Get completion events grouped by therapy plan
        const completionEvents = await prisma_1.prisma.completionEvent.findMany({
            where,
            include: {
                therapyPlanExercise: {
                    include: {
                        therapyPlan: {
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
                        },
                        exercise: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        // Group by therapy plan
        const planCounts = {};
        completionEvents.forEach((event) => {
            const plan = event.therapyPlanExercise.therapyPlan;
            const exercise = event.therapyPlanExercise.exercise;
            const planId = plan.id;
            if (!planCounts[planId]) {
                planCounts[planId] = {
                    therapyPlanId: plan.id,
                    therapyPlanName: plan.name,
                    patientId: plan.patient.id,
                    patientName: `${plan.patient.firstName} ${plan.patient.lastName}`,
                    totalCompletions: 0,
                    exerciseBreakdown: {},
                };
            }
            planCounts[planId].totalCompletions++;
            if (!planCounts[planId].exerciseBreakdown[exercise.id]) {
                planCounts[planId].exerciseBreakdown[exercise.id] = {
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                    completions: 0,
                };
            }
            planCounts[planId].exerciseBreakdown[exercise.id].completions++;
        });
        // Convert to array format
        const analytics = Object.values(planCounts).map((plan) => ({
            ...plan,
            exerciseBreakdown: Object.values(plan.exerciseBreakdown),
        }));
        // Calculate summary
        const totalCompletions = analytics.reduce((sum, plan) => sum + plan.totalCompletions, 0);
        const totalPlans = analytics.length;
        res.json({
            success: true,
            data: {
                dateRange: {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                },
                summary: {
                    totalCompletions,
                    totalPlans,
                },
                therapyPlans: analytics,
            },
        });
    }
    catch (error) {
        console.error("Get adherence analytics error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
