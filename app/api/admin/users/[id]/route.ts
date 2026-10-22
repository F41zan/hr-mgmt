/**
 * PATCH /api/admin/users/[id]  — Update role or active status (admin only)
 * DELETE /api/admin/users/[id] — Deactivate account (admin only, soft-delete)
 *
 * Security:
 *  - Protected fields (passwordHash, resetToken*) cannot be updated here.
 *  - Admin cannot demote themselves.
 *  - Role changes take effect on next session validation (DAL re-reads DB).
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { getVerifiedSession } from "@/lib/dal";
import { ROLES, ROLE_VALUES, type Role } from "@/lib/roles";
import mongoose from "mongoose";

type Params = { params: Promise<{ id: string }> };

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (session.role !== ROLES.ADMIN)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
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

  // Only allow updating role and isActive — strip everything else
  const allowedUpdates: Partial<{ role: Role; isActive: boolean }> = {};

  if (body.role !== undefined) {
    if (!ROLE_VALUES.includes(body.role as Role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    allowedUpdates.role = body.role as Role;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean." },
        { status: 400 },
      );
    }
    allowedUpdates.isActive = body.isActive;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const user = await User.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
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
    console.error("[admin/users PATCH] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to update user." },
      { status: 500 },
    );
  }
}

// ── DELETE (soft-deactivate) ──────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (session.role !== ROLES.ADMIN)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }

  // Prevent admin from deactivating themselves
  if (id === session.userId) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account." },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    ).select("name email role isActive");

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Account deactivated.",
      user: { id: user._id.toString(), isActive: false },
    });
  } catch (err) {
    console.error("[admin/users DELETE] Error:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to deactivate user." },
      { status: 500 },
    );
  }
}
