"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStaff = exports.requirePhysiotherapist = exports.requireAdmin = void 0;
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
const client_1 = require("@prisma/client");
const auth_1 = require("../lib/auth");
const prisma_1 = require("../prisma");
/**
 * Middleware to parse JWT token from Authorization header
 * Attaches user information to req.user
 */
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                error: "No token provided",
            });
            return;
        }
        const token = authHeader.substring(7); // Remove "Bearer " prefix
        const decoded = (0, auth_1.verifyToken)(token);
        if (!decoded) {
            res.status(401).json({
                success: false,
                error: "Invalid or expired token",
            });
            return;
        }
        // Optionally verify user still exists in database
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user) {
            res.status(401).json({
                success: false,
                error: "User not found",
            });
            return;
        }
        // Attach user info to request
        req.user = {
            ...decoded,
            id: decoded.userId,
        };
        next();
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        res.status(401).json({
            success: false,
            error: "Authentication failed",
        });
    }
}
/**
 * Middleware factory to require specific roles
 * @param roles - Array of allowed roles
 * @returns Middleware function that checks if user has required role
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required",
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${roles.join(" or ")}`,
            });
            return;
        }
        next();
    };
}
/**
 * Convenience middleware for admin-only routes
 */
exports.requireAdmin = requireRole(client_1.Role.ADMIN);
/**
 * Convenience middleware for physiotherapist-only routes
 */
exports.requirePhysiotherapist = requireRole(client_1.Role.PHYSIOTHERAPIST);
/**
 * Convenience middleware for staff-only routes (admin, receptionist, physiotherapist)
 */
exports.requireStaff = requireRole(client_1.Role.ADMIN, client_1.Role.RECEPTIONIST, client_1.Role.PHYSIOTHERAPIST);
