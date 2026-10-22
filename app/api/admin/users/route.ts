/**
 * GET  /api/admin/users  — List all users (admin only)
 * POST /api/admin/users  — Create a new HR or Employee account (admin only)
 *
 * Security:
 *  - Admin role is verified server-side on every request.
 *  - Role is read from the verified JWT, never from the request body.
 *  - Admins can only create `hr` or `employee` accounts via this endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { getVerifiedSession } from "@/lib/dal";
import { ROLES, ROLE_VALUES, type Role } from "@/lib/roles";
import { validateEmail, validateName, normalizeEmail } from "@/lib/validation";

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (session.role !== ROLES.ADMIN)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    await connectDB();
    const users = await User.find({})
      .select("-passwordHash -resetTokenHash -resetTokenExpiry -resetTokenUsed")
      .lean();
    const safe = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt ?? null,
    }));
    return NextResponse.json({ users: safe });
  } catch (err) {
    console.error("[admin/users GET] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 },
    );
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (session.role !== ROLES.ADMIN)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const nameErr = validateName(body.name);
  const emailErr = validateEmail(body.email);
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

  // Admins may only create hr or employee accounts — not other admins
  const allowedRoles: Role[] = [ROLES.HR, ROLES.EMPLOYEE];
  if (!body.role || !allowedRoles.includes(body.role as Role)) {
    return NextResponse.json(
      { error: "Role must be 'hr' or 'employee'." },
      { status: 400 },
    );
  }

  if (!body.password || typeof body.password !== "string") {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 },
    );
  }

  const strengthError = validatePasswordStrength(body.password);
  if (strengthError)
    return NextResponse.json({ error: strengthError }, { status: 400 });

  // Validate role value is in the enum (guard against unexpected input)
  if (!ROLE_VALUES.includes(body.role as Role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    await connectDB();

    const email = normalizeEmail(body.email as string);
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(body.password);
    const user = await User.create({
      name: (body.name as string).trim(),
      email,
      passwordHash,
      role: body.role as Role,
      isActive: true,
    });

    await logAudit({
      session,
      req,
      action: "user.create",
      entity: "User",
      entityId: user._id.toString(),
      summary: `User account created for ${user.email} (${user.role})`,
    });

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    if (e.code === 11000) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    console.error("[admin/users POST] Error:", e.message);
    return NextResponse.json(
      { error: "Failed to create user." },
      { status: 500 },
    );
  }
}
