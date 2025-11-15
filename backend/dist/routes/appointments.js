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
const appointmentsController = __importStar(require("../controllers/appointmentsController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
/**
 * @route   GET /api/appointments
 * @desc    List appointments (Patient sees own, Staff sees all)
 * @access  Private
 */
router.get("/", authMiddleware_1.authMiddleware, appointmentsController.listAppointments);
/**
 * @route   POST /api/appointments
 * @desc    Create appointment
 * @access  Private (Admin, Receptionist, or Physiotherapist)
 */
router.post("/", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, appointmentsController.createAppointment);
/**
 * @route   GET /api/appointments/calendar
 * @desc    Get appointments for calendar view (date range)
 * @access  Private
 */
router.get("/calendar", authMiddleware_1.authMiddleware, appointmentsController.getAppointmentsForCalendar);
/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private
 */
router.get("/:id", authMiddleware_1.authMiddleware, appointmentsController.getAppointment);
/**
 * @route   PATCH /api/appointments/:id
 * @desc    Update appointment
 * @access  Private (Admin, Receptionist, or Physiotherapist)
 */
router.patch("/:id", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, appointmentsController.updateAppointment);
/**
 * @route   DELETE /api/appointments/:id
 * @desc    Cancel appointment (destructive action - creates AuditLog)
 * @access  Private (Admin, Receptionist, or Physiotherapist)
 */
router.delete("/:id", authMiddleware_1.authMiddleware, authMiddleware_1.requireStaff, appointmentsController.cancelAppointment);
exports.default = router;
