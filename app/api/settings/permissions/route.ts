/**
 * GET /api/settings/permissions — Permission matrix for HR and Employee roles (admin)
 *                                 ?me=true returns the caller's own effective permissions (any role)
 * PUT /api/settings/permissions — { role: "hr" | "employee", permissions: Permission[] } (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { apiGuard, getPermissionsForRole } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import RolePermission from "@/lib/models/RolePermission";
import { CONFIGURABLE_ROLES, PERMISSION_VALUES, type Permission } from "@/lib/permissions";

const putSchema = z.object({
  role: z.enum(CONFIGURABLE_ROLES),
  permissions: z.array(z.enum(PERMISSION_VALUES as [Permission, ...Permission[]])),
});

export async function GET(req: NextRequest) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;

  if (req.nextUrl.searchParams.get("me") === "true")
    return NextResponse.json({ role: guard.session.role, permissions: guard.permissions });

  if (guard.session.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [hr, employee] = await Promise.all([
    getPermissionsForRole("hr"),
    getPermissionsForRole("employee"),
  ]);
  return NextResponse.json({ roles: { hr, employee } });
}

export async function PUT(req: NextRequest) {
  const guard = await apiGuard();
  if (guard instanceof NextResponse) return guard;
  if (guard.session.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  const { role, permissions } = parsed.data;
  const before = await getPermissionsForRole(role);
  const unique = [...new Set(permissions)];

  await connectDB();
  await RolePermission.findOneAndUpdate(
    { role },
    { $set: { permissions: unique, updatedBy: new mongoose.Types.ObjectId(guard.session.userId) } },
    { upsert: true, runValidators: true },
  );

  const granted = unique.filter((p) => !before.includes(p));
  const revoked = before.filter((p) => !unique.includes(p));
  if (granted.length || revoked.length)
    await logAudit({
      session: guard.session,
      req,
      action: "settings.permissions_update",
      entity: "RolePermission",
      entityId: role,
      summary: `Permissions for ${role.toUpperCase()} updated`,
      details: { granted, revoked },
    });

  return NextResponse.json({ success: true, role, permissions: unique });
}
