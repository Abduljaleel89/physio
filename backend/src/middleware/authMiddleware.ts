import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken, JWTPayload } from "../lib/auth";
import { prisma } from "../prisma";

/**
 * Extended Express Request with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload & {
    id: number;
  };
}

/**
 * Middleware to parse JWT token from Authorization header
 * Attaches user information to req.user
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
      return;
    }

    // Optionally verify user still exists in database
    const user = await prisma.user.findUnique({
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
  } catch (error) {
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
export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
export const requireAdmin = requireRole(Role.ADMIN);

/**
 * Convenience middleware for physiotherapist-only routes
 */
export const requirePhysiotherapist = requireRole(Role.PHYSIOTHERAPIST);

/**
 * Convenience middleware for staff-only routes (admin, receptionist, physiotherapist)
 */
export const requireStaff = requireRole(Role.ADMIN, Role.RECEPTIONIST, Role.PHYSIOTHERAPIST);

