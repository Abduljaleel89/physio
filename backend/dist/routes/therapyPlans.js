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
const therapyPlansController = __importStar(require("../controllers/therapyPlansController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
/**
 * @route   GET /api/therapy-plans
 * @desc    List therapy plans (Patient sees own, Staff sees all)
 * @access  Private
 */
router.get("/", authMiddleware_1.authMiddleware, therapyPlansController.listTherapyPlans);
/**
 * @route   POST /api/therapy-plans
 * @desc    Create therapy plan
 * @access  Private (Admin, Receptionist, or Physiotherapist)
 */
router.post("/", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, therapyPlansController.createTherapyPlan);
/**
 * @route   GET /api/therapy-plans/:id
 * @desc    Get therapy plan by ID with exercises
 * @access  Private (Patient can view own, Staff can view any)
 */
router.get("/:id", authMiddleware_1.authMiddleware, therapyPlansController.getTherapyPlan);
/**
 * @route   POST /api/therapy-plans/:id/exercises
 * @desc    Add exercise to therapy plan (bumps version)
 * @access  Private (Admin or assigned Physiotherapist)
 */
router.post("/:id/exercises", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, therapyPlansController.addExerciseToPlan);
/**
 * @route   PATCH /api/therapy-plans/:id/exercises/:exerciseId
 * @desc    Update exercise details in therapy plan
 * @access  Private (Admin or assigned Physiotherapist)
 */
router.patch("/:id/exercises/:exerciseId", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, therapyPlansController.updateExerciseInPlan);
/**
 * @route   DELETE /api/therapy-plans/:id/exercises/:exerciseId
 * @desc    Archive exercise from therapy plan (creates version record)
 * @access  Private (Admin or assigned Physiotherapist)
 */
router.delete("/:id/exercises/:exerciseId", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, therapyPlansController.archiveExerciseFromPlan);
/**
 * @route   POST /api/therapy-plans/:id/exercises/reorder
 * @desc    Reorder exercises in therapy plan
 * @access  Private (Admin or assigned Physiotherapist)
 */
router.post("/:id/exercises/reorder", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, therapyPlansController.reorderExercisesInPlan);
exports.default = router;
