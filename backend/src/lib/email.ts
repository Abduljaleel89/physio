import nodemailer from "nodemailer";

/**
 * Email service configuration
 * Uses Ethereal Email (https://ethereal.email) for development
 * Falls back to SMTP in production if SMTP_* env vars are set
 */
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 * In development, creates Ethereal test account
 * In production, uses SMTP configuration from env vars
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) {
    return transporter;
  }

  if (process.env.NODE_ENV === "production" && process.env.SMTP_HOST) {
    // Production SMTP configuration
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: Use Ethereal Email (test account)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
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

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email
 * @param options - Email options (to, subject, text/html)
 * @returns Email info with messageId and previewUrl (in dev)
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ messageId: string; previewUrl?: string }> {
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
    let previewUrl: string | undefined;
    if (process.env.NODE_ENV !== "production" && nodemailer.getTestMessageUrl) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) {
        previewUrl = url;
        console.log(`📧 Email preview: ${url}`);
      }
    }

    return { messageId: info.messageId, previewUrl };
  } catch (error) {
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
export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<{ success: boolean; previewUrl?: string }> {
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
  } catch (error) {
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
export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ messageId: string; previewUrl?: string }> {
  try {
    return await sendEmail({
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ""), // Strip HTML tags for plain text
    });
  } catch (error) {
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
export async function sendWithTemplate(
  toUserId: number,
  templateName: "completion" | "invoice" | "generic",
  payload: any
): Promise<{ success: boolean; previewUrl?: string }> {
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
  } catch (error) {
    console.error("Template email send error:", error);
    return { success: false };
  }
}

