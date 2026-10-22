/**
 * lib/dal.ts  — Data Access Layer
 *
 * Always use these functions to access the current user in Server Components,
 * Route Handlers, and Server Actions.
 *
 * Security contract:
 *  - getVerifiedSession() always re-validates the JWT AND re-checks the DB
 *    so a disabled or role-changed account is denied immediately.
 *  - Role never comes from the client; it is always read from the JWT which
 *    was written server-side, and double-checked against the DB on every call.
 */

import "server-only";
import { cache } from "react";
import { unauthorized, forbidden, redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { connectDB } from "@/lib/db";
import User, { type SafeUser } from "@/lib/models/User";
import type { Role } from "@/lib/roles";

export interface VerifiedSession extends SessionPayload {
  user: SafeUser;
}

/**
 * Verify the session cookie AND confirm the account is still active in the DB.
 * Cached per-request (React cache) so the DB is only queried once per render.
 * Returns null if unauthenticated, inactive, or invalid.
 */
export const getVerifiedSession = cache(
  async (): Promise<VerifiedSession | null> => {
    const session = await getSession();
    if (!session) return null;

    await connectDB();

    const user = await User.findById(session.userId).lean<{
      _id: import("mongoose").Types.ObjectId;
      name: string;
      email: string;
      role: Role;
      isActive: boolean;
      lastLoginAt?: Date;
      createdAt: Date;
    }>();

    if (!user || !user.isActive) return null;

    // Re-check role matches JWT (detects role changes since last login)
    if (user.role !== session.role) return null;

    const safeUser: SafeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
    };

    return { ...session, user: safeUser };
  },
);

/**
 * Require authentication. Calls unauthorized() if not authenticated.
 * unauthorized() throws — execution stops here for unauthenticated requests.
 */
export async function requireAuth(): Promise<VerifiedSession> {
  const session = await getVerifiedSession();
  if (!session) unauthorized();
  return session;
}

/**
 * Require a specific role. Calls forbidden() if role doesn't match.
 */
export async function requireRole(role: Role): Promise<VerifiedSession> {
  const session = await requireAuth();
  if (session.role !== role) forbidden();
  return session;
}

/**
 * Require one of multiple roles.
 */
export async function requireAnyRole(
  ...roles: Role[]
): Promise<VerifiedSession> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) forbidden();
  return session;
}

// Re-export redirect for convenience in pages
export { redirect };
