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
const authController = __importStar(require("../controllers/authController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", authController.register);
/**
 * @route   POST /api/auth/verify
 * @desc    Verify email using verification token
 * @access  Public
 */
router.post("/verify", authController.verify);
/**
 * @route   POST /api/auth/login
 * @desc    Login user (email+password or regNumber+dateOfBirth for patients)
 * @access  Public
 */
router.post("/login", authController.login);
/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get("/me", authMiddleware_1.authMiddleware, async (req, res) => {
    // Fetch full user data from database
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
            patientProfile: true,
            doctorProfile: true,
        },
    });
    if (!user) {
        res.status(404).json({
            success: false,
            error: "User not found",
        });
        return;
    }
    res.json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            role: user.role,
            patientProfile: user.patientProfile,
            doctorProfile: user.doctorProfile,
        },
    });
});
exports.default = router;
