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
const adminController = __importStar(require("../controllers/adminController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
/**
 * @route   POST /api/admin/users
 * @desc    Create a new user (Admin only)
 * @access  Private (Admin)
 */
router.post("/users", authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, adminController.createUser);
/**
 * @route   GET /api/admin/users
 * @desc    List all users
 * @access  Private (Admin)
 */
router.get("/users", authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, adminController.listUsers);
/**
 * @route   POST /api/admin/assign-doctor
 * @desc    Assign doctor to patient
 * @access  Private (Admin)
 */
router.post("/assign-doctor", authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, adminController.assignDoctorToPatient);
/**
 * @route   GET /api/admin/doctors
 * @desc    Get all doctors
 * @access  Private (Admin)
 */
router.get("/doctors", authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, adminController.getDoctors);
/**
 * @route   GET /api/admin/patients
 * @desc    Get all patients
 * @access  Private (Admin)
 */
router.get("/patients", authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, adminController.getPatients);
exports.default = router;
