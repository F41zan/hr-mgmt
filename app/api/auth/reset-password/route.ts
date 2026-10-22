/**
 * POST /api/auth/reset-password
 * Complete a password reset using the token from the email link.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import {
  hashPassword,
  hashResetToken,
  validatePasswordStrength,
} from "@/lib/password";
import { destroySession } from "@/lib/session";
import { validateRequired } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`reset-use:${ip}`, 10, 15 * 60 * 1000);
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

  const tokenErr = validateRequired(body.token, "Token");
  const passwordErr = validateRequired(body.password, "Password");
  if (tokenErr) return NextResponse.json({ error: tokenErr }, { status: 400 });
  if (passwordErr)
    return NextResponse.json({ error: passwordErr }, { status: 400 });

  const strengthError = validatePasswordStrength(body.password as string);
  if (strengthError)
    return NextResponse.json({ error: strengthError }, { status: 400 });

  const confirmErr = validateRequired(body.confirmPassword, "Confirm Password");
  if (confirmErr)
    return NextResponse.json({ error: confirmErr }, { status: 400 });

  if (body.password !== body.confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const tokenHash = hashResetToken(body.token as string);

    const user = await User.findOne({
      resetTokenHash: tokenHash,
      resetTokenUsed: { $ne: true },
      resetTokenExpiry: { $gt: new Date() },
      isActive: true,
    }).select(
      "+resetTokenHash +resetTokenExpiry +resetTokenUsed +passwordHash",
    );

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    // Update password and invalidate token
    user.passwordHash = await hashPassword(body.password as string);
    user.resetTokenUsed = true;
    user.resetTokenHash = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // Invalidate any existing session (belt-and-suspenders — the JWT will
    // still be valid until expiry; in a stateless system this is the best
    // we can do without a token revocation list)
    await destroySession();

    return NextResponse.json({
      message:
        "Password reset successful. Please log in with your new password.",
    });
  } catch (err) {
    console.error("[reset-password] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
