"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendNotificationEmail = sendNotificationEmail;
exports.sendWithTemplate = sendWithTemplate;
const nodemailer_1 = __importDefault(require("nodemailer"));
/**
 * Email service configuration
 * Uses Ethereal Email (https://ethereal.email) for development
 * Falls back to SMTP in production if SMTP_* env vars are set
 */
let transporter = null;
/**
 * Initialize email transporter
 * In development, creates Ethereal test account
 * In production, uses SMTP configuration from env vars
 */
async function getTransporter() {
    if (transporter) {
        return transporter;
    }
    if (process.env.NODE_ENV === "production" && process.env.SMTP_HOST) {
        // Production SMTP configuration
        transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    else {
        // Development: Use Ethereal Email (test account)
        const testAccount = await nodemailer_1.default.createTestAccount();
        transporter = nodemailer_1.default.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log("📧 Email service using Ethereal test account");
        console.log(`   Test account: ${testAccount.user}`);
    }
    return transporter;
}
/**
 * Send an email
 * @param options - Email options (to, subject, text/html)
 * @returns Email info with messageId and previewUrl (in dev)
 */
async function sendEmail(options) {
    try {
        const mailTransporter = await getTransporter();
        const mailOptions = {
            from: process.env.SMTP_FROM || "noreply@physio.com",
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        };
        const info = await mailTransporter.sendMail(mailOptions);
        // In development with Ethereal, get the preview URL
        let previewUrl;
        if (process.env.NODE_ENV !== "production" && nodemailer_1.default.getTestMessageUrl) {
            const url = nodemailer_1.default.getTestMessageUrl(info);
            if (url) {
                previewUrl = url;
                console.log(`📧 Email preview: ${url}`);
            }
        }
        return { messageId: info.messageId, previewUrl };
    }
    catch (error) {
        console.error("Email send error:", error);
        // Return structured error response instead of throwing
        throw new Error(`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
/**
 * Send email verification email
 * @param to - Recipient email address
 * @param token - Verification token to include in link
 * @returns Success status and preview URL (in dev)
 */
async function sendVerificationEmail(to, token) {
    try {
        const publicBaseUrl = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3000";
        const verificationUrl = `${publicBaseUrl}/verify?token=${encodeURIComponent(token)}`;
        const result = await sendEmail({
            to,
            subject: "Verify your account",
            html: `
        <h1>Verify Your Email Address</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
      `,
            text: `Please visit the following link to verify your email address: ${verificationUrl}`,
        });
        return { success: true, previewUrl: result.previewUrl };
    }
    catch (error) {
        console.error("Verification email send error:", error);
        return { success: false };
    }
}
/**
 * Send notification email
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML content
 * @returns Message ID and preview URL (in dev)
 */
async function sendNotificationEmail(to, subject, html) {
    try {
        return await sendEmail({
            to,
            subject,
            html,
            text: html.replace(/<[^>]*>/g, ""), // Strip HTML tags for plain text
        });
    }
    catch (error) {
        console.error("Notification email send error:", error);
        throw error;
    }
}
/**
 * Send templated email to user
 * @param toUserId - User ID to send email to
 * @param templateName - Template name ('completion', 'invoice', 'generic')
 * @param payload - Template data
 * @returns Success status and preview URL (in dev)
 */
async function sendWithTemplate(toUserId, templateName, payload) {
    try {
        // This would require a user lookup - for now, we'll expect email in payload
        const to = payload.email || payload.to;
        if (!to) {
            throw new Error("Email address required for template");
        }
        let subject = "";
        let html = "";
        switch (templateName) {
            case "completion":
                subject = "Exercise Completed";
                html = `
          <h1>Exercise Completed</h1>
          <p>Patient ${payload.patientName || "Patient"} has completed exercise: ${payload.exerciseName || "Exercise"}</p>
          ${payload.note ? `<p>Notes: ${payload.note}</p>` : ""}
        `;
                break;
            case "invoice":
                subject = `Invoice ${payload.invoiceNumber || ""}`;
                html = `
          <h1>Invoice ${payload.invoiceNumber || ""}</h1>
          <p>Amount: ${payload.amount || ""}</p>
          ${payload.dueDate ? `<p>Due Date: ${payload.dueDate}</p>` : ""}
        `;
                break;
            case "generic":
                subject = payload.subject || "Notification";
                html = payload.html || payload.message || "";
                break;
        }
        const result = await sendNotificationEmail(to, subject, html);
        return { success: true, previewUrl: result.previewUrl };
    }
    catch (error) {
        console.error("Template email send error:", error);
        return { success: false };
    }
}
