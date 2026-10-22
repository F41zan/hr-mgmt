/**
 * lib/access.ts
 * Permission checks for pages and API routes.
 *
 *  - requirePermission()  → Server Components (calls forbidden()/unauthorized())
 *  - apiGuard()           → Route Handlers (returns a JSON error response instead)
 */

import "server-only";
import { forbidden } from "next/navigation";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  getVerifiedSession,
  requireAuth,
  type VerifiedSession,
} from "@/lib/dal";
import RolePermission from "@/lib/models/RolePermission";
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_VALUES,
  hasPermission,
  type Permission,
} from "@/lib/permissions";
import type { Role } from "@/lib/roles";

/** Effective permission list for a role (admin → all). */
export async function getPermissionsForRole(role: Role): Promise<Permission[]> {
  if (role === "admin") return [...PERMISSION_VALUES];

  await connectDB();
  const doc = await RolePermission.findOne({ role }).lean();
  return doc ? doc.permissions : DEFAULT_PERMISSIONS[role];
}

export interface AccessContext {
  session: VerifiedSession;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
}

function buildContext(
  session: VerifiedSession,
  permissions: Permission[],
): AccessContext {
  return {
    session,
    permissions,
    can: (p) => hasPermission(session.role, permissions, p),
  };
}

/** Page guard: requires auth, and the permission when one is given. */
export async function requirePermission(
  permission?: Permission,
): Promise<AccessContext> {
  const session = await requireAuth();
  const ctx = buildContext(session, await getPermissionsForRole(session.role));
  if (permission && !ctx.can(permission)) forbidden();
  return ctx;
}

/**
 * API guard. Usage:
 *   const guard = await apiGuard(PERMISSIONS.PAYROLL_MANAGE);
 *   if (guard instanceof NextResponse) return guard;
 */
export async function apiGuard(
  permission?: Permission,
): Promise<AccessContext | NextResponse> {
  const session = await getVerifiedSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  const ctx = buildContext(session, await getPermissionsForRole(session.role));
  if (permission && !ctx.can(permission))
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  return ctx;
}
