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
const invoicesController = __importStar(require("../controllers/invoicesController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
/**
 * @route   POST /api/invoices
 * @desc    Create invoice (admin/reception only)
 * @access  Private (Admin or Receptionist)
 */
router.post("/", authMiddleware_1.authMiddleware, invoicesController.createInvoice);
/**
 * @route   GET /api/invoices
 * @desc    Get invoices list with filters
 * @access  Private (patient can view own, staff can view all)
 */
router.get("/", authMiddleware_1.authMiddleware, invoicesController.getInvoices);
/**
 * @route   PATCH /api/invoices/:id
 * @desc    Update invoice status
 * @access  Private (Admin or Receptionist)
 */
router.patch("/:id", authMiddleware_1.authMiddleware, invoicesController.updateInvoice);
/**
 * @route   POST /api/invoices/:id/void
 * @desc    Void invoice (destructive action - creates AuditLog)
 * @access  Private (Admin or Receptionist)
 */
router.post("/:id/void", authMiddleware_1.authMiddleware, invoicesController.voidInvoice);
/**
 * @route   POST /api/invoices/:id/send-email
 * @desc    Send invoice email
 * @access  Private (Admin or Receptionist)
 */
router.post("/:id/send-email", authMiddleware_1.authMiddleware, invoicesController.sendInvoiceEmail);
exports.default = router;
