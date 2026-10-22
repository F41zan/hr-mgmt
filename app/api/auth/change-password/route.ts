/**
 * POST /api/auth/change-password
 * Authenticated users change their own password.
 * Requires current password verification before accepting a new one.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import {
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
} from "@/lib/password";
import { getVerifiedSession } from "@/lib/dal";
import { destroySession } from "@/lib/session";
import { validateRequired } from "@/lib/validation";

export async function POST(req: NextRequest) {
  // ── Require authenticated session ─────────────────────────────────────────
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
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

  const currentErr = validateRequired(body.currentPassword, "Current password");
  const newErr = validateRequired(body.newPassword, "New password");
  const confirmErr = validateRequired(body.confirmPassword, "Confirm password");

  if (currentErr || newErr || confirmErr) {
    return NextResponse.json(
      { error: currentErr ?? newErr ?? confirmErr },
      { status: 400 },
    );
  }

  const strengthError = validatePasswordStrength(body.newPassword as string);
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 });
  }

  if (body.newPassword !== body.confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match." },
      { status: 400 },
    );
  }

  if (body.currentPassword === body.newPassword) {
    return NextResponse.json(
      { error: "New password must differ from the current password." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    // Always read the user from DB — never trust session role for data access
    const user = await User.findById(session.userId).select("+passwordHash");
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Account not found or inactive." },
        { status: 403 },
      );
    }

    const valid = await verifyPassword(
      body.currentPassword as string,
      user.passwordHash,
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 },
      );
    }

    user.passwordHash = await hashPassword(body.newPassword as string);
    await user.save();

    // Invalidate the current session — user must re-login
    await destroySession();

    return NextResponse.json({
      message: "Password changed successfully. Please log in again.",
    });
  } catch (err) {
    console.error("[change-password] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
