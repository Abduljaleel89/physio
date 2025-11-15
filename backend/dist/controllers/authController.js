"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verify = verify;
exports.login = login;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const password_1 = require("../lib/password");
const auth_1 = require("../lib/auth");
const email_1 = require("../lib/email");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a random verification token
 */
function generateVerificationToken() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res) {
    try {
        const body = req.body;
        const { email, password, role, firstName, lastName, regNumber, dateOfBirth, phone, address } = body;
        // Validate required fields
        if (!email || !password || !role) {
            res.status(400).json({
                success: false,
                error: "Email, password, and role are required",
            });
            return;
        }
        // Validate role
        if (!Object.values(client_1.Role).includes(role)) {
            res.status(400).json({
                success: false,
                error: "Invalid role",
            });
            return;
        }
        // For patients, validate required fields
        if (role === client_1.Role.PATIENT) {
            if (!firstName || !lastName || !regNumber || !dateOfBirth) {
                res.status(400).json({
                    success: false,
                    error: "First name, last name, registration number, and date of birth are required for patients",
                });
                return;
            }
        }
        // Check if user already exists
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            res.status(409).json({
                success: false,
                error: "User with this email already exists",
            });
            return;
        }
        // Check if patient regNumber already exists (if registering as patient)
        if (role === client_1.Role.PATIENT && regNumber) {
            const existingPatient = await prisma_1.prisma.patient.findUnique({
                where: { regNumber },
            });
            if (existingPatient) {
                res.status(409).json({
                    success: false,
                    error: "Patient with this registration number already exists",
                });
                return;
            }
        }
        // Hash password
        const hashedPassword = await (0, password_1.hashPassword)(password);
        // Create user and patient profile if role is PATIENT
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                ...(role === client_1.Role.PATIENT && {
                    patientProfile: {
                        create: {
                            firstName: firstName,
                            lastName: lastName,
                            regNumber: regNumber,
                            dateOfBirth: new Date(dateOfBirth),
                            phone: phone || null,
                            address: address || null,
                        },
                    },
                }),
            },
            include: {
                patientProfile: role === client_1.Role.PATIENT,
                doctorProfile: role === client_1.Role.PHYSIOTHERAPIST,
            },
        });
        // Create verification token
        const verificationToken = generateVerificationToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
        await prisma_1.prisma.verificationToken.create({
            data: {
                userId: user.id,
                token: verificationToken,
                type: client_1.VerificationType.EMAIL_VERIFICATION,
                expiresAt,
            },
        });
        // Send verification email (stub - uses Ethereal in dev)
        try {
            await (0, email_1.sendVerificationEmail)(email, verificationToken);
        }
        catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // Continue even if email fails - token is still created
        }
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    patientProfile: user.patientProfile,
                    doctorProfile: user.doctorProfile,
                },
                message: "User registered successfully. Please check your email to verify your account.",
            },
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error during registration",
        });
    }
}
/**
 * Verify email using verification token
 * POST /api/auth/verify
 */
async function verify(req, res) {
    try {
        const body = req.body;
        const { token } = body;
        if (!token) {
            res.status(400).json({
                success: false,
                error: "Verification token is required",
            });
            return;
        }
        // Find verification token
        const verificationToken = await prisma_1.prisma.verificationToken.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!verificationToken) {
            res.status(404).json({
                success: false,
                error: "Invalid verification token",
            });
            return;
        }
        // Check if token is already used
        if (verificationToken.used) {
            res.status(400).json({
                success: false,
                error: "Verification token has already been used",
            });
            return;
        }
        // Check if token is expired
        if (verificationToken.expiresAt < new Date()) {
            res.status(400).json({
                success: false,
                error: "Verification token has expired",
            });
            return;
        }
        // Mark token as used (stub - in full implementation, would also mark user email as verified)
        await prisma_1.prisma.verificationToken.update({
            where: { id: verificationToken.id },
            data: { used: true },
        });
        res.json({
            success: true,
            data: {
                message: "Email verified successfully",
                userId: verificationToken.userId,
            },
        });
    }
    catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error during verification",
        });
    }
}
/**
 * Login user
 * Supports email+password or regNumber+dateOfBirth (for patients)
 * POST /api/auth/login
 */
async function login(req, res) {
    try {
        const body = req.body;
        const { email, password, regNumber, dateOfBirth } = body;
        let user;
        // Login method 1: Email + password
        if (email && password) {
            user = await prisma_1.prisma.user.findUnique({
                where: { email },
                include: {
                    patientProfile: true,
                    doctorProfile: true,
                },
            });
            if (!user) {
                res.status(401).json({
                    success: false,
                    error: "Invalid email or password",
                });
                return;
            }
            const isPasswordValid = await (0, password_1.verifyPassword)(password, user.password);
            if (!isPasswordValid) {
                res.status(401).json({
                    success: false,
                    error: "Invalid email or password",
                });
                return;
            }
        }
        // Login method 2: regNumber + dateOfBirth (for patients)
        else if (regNumber && dateOfBirth) {
            const patient = await prisma_1.prisma.patient.findUnique({
                where: { regNumber },
                include: {
                    user: true,
                },
            });
            if (!patient) {
                res.status(401).json({
                    success: false,
                    error: "Invalid registration number or date of birth",
                });
                return;
            }
            // Verify date of birth matches
            const dob = new Date(dateOfBirth);
            const patientDob = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
            if (!patientDob || dob.toDateString() !== patientDob.toDateString()) {
                res.status(401).json({
                    success: false,
                    error: "Invalid registration number or date of birth",
                });
                return;
            }
            user = patient.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    error: "User account not found",
                });
                return;
            }
            // Load full user with profiles
            user = await prisma_1.prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    patientProfile: true,
                    doctorProfile: true,
                },
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: "Either (email and password) or (regNumber and dateOfBirth) must be provided",
            });
            return;
        }
        if (!user) {
            res.status(401).json({
                success: false,
                error: "Authentication failed",
            });
            return;
        }
        // Generate JWT token
        const token = (0, auth_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    patientProfile: user.patientProfile,
                    doctorProfile: user.doctorProfile,
                },
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error during login",
        });
    }
}
