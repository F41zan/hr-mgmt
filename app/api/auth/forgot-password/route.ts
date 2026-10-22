/**
 * POST /api/auth/forgot-password
 * Initiate a password-reset request.
 * Always returns the same generic response to prevent account enumeration.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { generateResetToken } from "@/lib/password";
import { sendPasswordResetEmail } from "@/lib/email";
import { normalizeEmail, validateEmail } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

const GENERIC_RESPONSE = {
  message:
    "If that email is registered, you will receive a password-reset link shortly.",
};

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  // ── Rate limit: 5 requests per 15 min per IP ──────────────────────────────
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`reset-req:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const emailErr = validateEmail(body.email);
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

  const email = normalizeEmail(body.email as string);

  try {
    await connectDB();
    const user = await User.findOne({ email, isActive: true });

    if (user) {
      const { token, hash } = generateResetToken();

      // Store only the hash — never store the raw token
      user.resetTokenHash = hash;
      user.resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      user.resetTokenUsed = false;
      await user.save();

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetLink = `${appUrl}/reset-password?token=${token}`;

      // Send email — result is logged but doesn't affect the generic response
      await sendPasswordResetEmail(email, resetLink);

      // In development without email: log the link to console only (not to client)
      if (process.env.NODE_ENV === "development") {
        console.info(
          `[hr-mgmt][dev] Password reset link for ${email}: ${resetLink}`,
        );
      }
    }
    // Whether user exists or not, always return the same response
    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err) {
    console.error("[forgot-password] Error:", (err as Error).message);
    // Still return the generic response to avoid information leakage
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
