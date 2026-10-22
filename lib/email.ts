/**
 * lib/email.ts
 * Nodemailer wrapper for transactional emails.
 * Email sending is skipped gracefully when SMTP_USER is not configured.
 */

import "server-only";
import nodemailer from "nodemailer";

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
    process.env;

  if (!SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST ?? "smtp.gmail.com",
    port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export interface SendResetEmailResult {
  sent: boolean;
  message: string;
}

/**
 * Send a password-reset email.
 * Returns { sent: false } when SMTP is not configured.
 * Never throws — errors are caught and logged (without the token).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<SendResetEmailResult> {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      "[hr-mgmt] Email not sent — SMTP_USER / SMTP_PASS not configured. " +
        "Set these variables in .env.local to enable email delivery.",
    );
    return {
      sent: false,
      message:
        "Email delivery is not configured. " +
        "Please set SMTP_USER and SMTP_PASS in the environment.",
    };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject: "Reset your HR Management password",
      text: `Click the link below to reset your password (expires in 1 hour):\n\n${resetLink}\n\nIf you did not request a password reset, ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="color:#2563EB;">Password Reset Request</h2>
          <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetLink}"
             style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
          <p style="margin-top:24px;color:#64748B;font-size:0.875rem;">
            If you did not request a password reset, you can safely ignore this email.
            Do not share this link with anyone.
          </p>
        </div>
      `,
    });
    return { sent: true, message: "Email sent." };
  } catch (err) {
    // Log without the URL/token
    console.error(
      "[hr-mgmt] Failed to send password reset email:",
      (err as Error).message,
    );
    return {
      sent: false,
      message: "Failed to deliver email. Please try again later.",
    };
  }
}
