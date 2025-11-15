"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const exercisesController = __importStar(require("../controllers/exercisesController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = require("../lib/multer");
const router = express_1.default.Router();
/**
 * @route   GET /api/exercises
 * @desc    Get all exercises (excluding archived by default)
 * @access  Public
 */
router.get("/", exercisesController.getExercises);
/**
 * @route   GET /api/exercises/:id
 * @desc    Get exercise by ID
 * @access  Public
 */
router.get("/:id", exercisesController.getExercise);
/**
 * @route   POST /api/exercises
 * @desc    Create new exercise (with optional video upload)
 * @access  Private (Admin or Physiotherapist)
 */
router.post("/", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, multer_1.uploadMiddleware.single("video"), exercisesController.createExercise);
/**
 * @route   PATCH /api/exercises/:id
 * @desc    Update exercise
 * @access  Private (Admin or Physiotherapist)
 */
router.patch("/:id", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, exercisesController.updateExercise);
/**
 * @route   DELETE /api/exercises/:id
 * @desc    Delete exercise (soft delete via archived flag)
 * @access  Private (Admin or Physiotherapist)
 */
router.delete("/:id", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, exercisesController.deleteExercise);
exports.default = router;
