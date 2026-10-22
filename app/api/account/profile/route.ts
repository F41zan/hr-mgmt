/**
 * GET   /api/account/profile  — Get own profile
 * PATCH /api/account/profile  — Update permitted own profile fields
 *
 * Employees can only update: name
 * Protected fields (role, isActive, passwordHash, etc.) are stripped server-side.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { getVerifiedSession } from "@/lib/dal";
import { validateName } from "@/lib/validation";

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  return NextResponse.json({ user: session.user });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  // Whitelist — only `name` is updatable via profile endpoint
  const nameErr = validateName(body.name);
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });

  try {
    await connectDB();

    const user = await User.findByIdAndUpdate(
      session.userId,
      { $set: { name: (body.name as string).trim() } },
      { new: true, runValidators: true },
    ).select("-passwordHash -resetTokenHash -resetTokenExpiry -resetTokenUsed");

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("[account/profile PATCH] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }
}
