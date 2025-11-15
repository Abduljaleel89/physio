"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExercises = getExercises;
exports.getExercise = getExercise;
exports.createExercise = createExercise;
exports.updateExercise = updateExercise;
exports.deleteExercise = deleteExercise;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const storage_1 = require("../lib/storage");
const path_1 = __importDefault(require("path"));
/**
 * Get all exercises (excluding archived)
 * GET /api/exercises
 */
async function getExercises(req, res) {
    try {
        const includeArchived = req.query.includeArchived === "true";
        const difficulty = req.query.difficulty;
        const where = {};
        if (!includeArchived) {
            where.archived = false;
        }
        if (difficulty) {
            where.difficulty = difficulty;
        }
        const exercises = await prisma_1.prisma.exercise.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        res.json({
            success: true,
            data: { exercises },
        });
    }
    catch (error) {
        console.error("Get exercises error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
/**
 * Get exercise by ID
 * GET /api/exercises/:id
 */
async function getExercise(req, res) {
    try {
        const id = parseInt(req.params.id);
        const exercise = await prisma_1.prisma.exercise.findUnique({
            where: { id },
        });
        if (!exercise) {
            res.status(404).json({
                success: false,
                error: "Exercise not found",
            });
            return;
        }
        res.json({
            success: true,
            data: { exercise },
        });
    }
    catch (error) {
        console.error("Get exercise error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
/**
 * Create new exercise
 * POST /api/exercises
 * Requires: ADMIN or PHYSIOTHERAPIST
 * Supports optional video upload via multipart/form-data
 */
async function createExercise(req, res) {
    try {
        const { name, description, instructions, difficulty, duration, videoUrl, imageUrl } = req.body;
        if (!name || !difficulty) {
            res.status(400).json({
                success: false,
                error: "Name and difficulty are required",
            });
            return;
        }
        if (!Object.values(client_1.ExerciseDifficulty).includes(difficulty)) {
            res.status(400).json({
                success: false,
                error: "Invalid difficulty",
            });
            return;
        }
        let finalVideoUrl = videoUrl;
        // Handle video file upload if present
        if (req.file) {
            const storage = new storage_1.LocalStorageAdapter({
                uploadsDir: path_1.default.join(process.cwd(), "backend", "uploads"),
                publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://localhost:4000",
            });
            try {
                const stored = await storage.saveFile(req.file, {
                    uploadedBy: req.user?.id?.toString() || null,
                });
                finalVideoUrl = stored.url;
            }
            catch (uploadError) {
                console.error("Video upload error:", uploadError);
                res.status(500).json({
                    success: false,
                    error: `Failed to upload video: ${uploadError.message || "Unknown error"}`,
                });
                return;
            }
        }
        const exercise = await prisma_1.prisma.exercise.create({
            data: {
                name,
                description,
                instructions,
                difficulty,
                duration: duration ? parseInt(duration) : null,
                videoUrl: finalVideoUrl,
                imageUrl,
                archived: false,
            },
        });
        res.status(201).json({
            success: true,
            data: { exercise },
        });
    }
    catch (error) {
        console.error("Create exercise error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
/**
 * Update exercise
 * PATCH /api/exercises/:id
 * Requires: ADMIN or PHYSIOTHERAPIST
 */
async function updateExercise(req, res) {
    try {
        const id = parseInt(req.params.id);
        const { name, description, instructions, difficulty, duration, videoUrl, imageUrl } = req.body;
        const existingExercise = await prisma_1.prisma.exercise.findUnique({
            where: { id },
        });
        if (!existingExercise) {
            res.status(404).json({
                success: false,
                error: "Exercise not found",
            });
            return;
        }
        if (difficulty && !Object.values(client_1.ExerciseDifficulty).includes(difficulty)) {
            res.status(400).json({
                success: false,
                error: "Invalid difficulty",
            });
            return;
        }
        const exercise = await prisma_1.prisma.exercise.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(instructions !== undefined && { instructions }),
                ...(difficulty && { difficulty }),
                ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
                ...(videoUrl !== undefined && { videoUrl }),
                ...(imageUrl !== undefined && { imageUrl }),
            },
        });
        res.json({
            success: true,
            data: { exercise },
        });
    }
    catch (error) {
        console.error("Update exercise error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
/**
 * Delete exercise (soft delete via archived flag)
 * DELETE /api/exercises/:id
 * Requires: ADMIN or PHYSIOTHERAPIST
 */
async function deleteExercise(req, res) {
    try {
        const id = parseInt(req.params.id);
        const existingExercise = await prisma_1.prisma.exercise.findUnique({
            where: { id },
        });
        if (!existingExercise) {
            res.status(404).json({
                success: false,
                error: "Exercise not found",
            });
            return;
        }
        // Soft delete by setting archived flag
        const exercise = await prisma_1.prisma.exercise.update({
            where: { id },
            data: { archived: true },
        });
        res.json({
            success: true,
            data: { exercise, message: "Exercise archived successfully" },
        });
    }
    catch (error) {
        console.error("Delete exercise error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
