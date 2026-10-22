/**
 * lib/session.ts
 * Stateless JWT sessions stored in an HTTP-only cookie.
 * Uses `jose` for signing/verification — no custom crypto.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/lib/roles";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
const COOKIE_NAME = "hr_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 hours

if (!process.env.JWT_SECRET) {
  // Warn loudly at startup — do not throw so build still works offline
  console.warn(
    "[hr-mgmt] WARNING: JWT_SECRET env var is not set. Sessions will not work.",
  );
}

export interface SessionPayload {
  userId: string;
  role: Role;
  isActive: boolean;
  iat?: number;
  exp?: number;
}

/** Sign and return a compact JWT string. */
export async function signToken(
  payload: Omit<SessionPayload, "iat" | "exp">,
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(SECRET);
}

/** Verify the token and return the typed payload, or null on any error. */
export async function verifyToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** Cookie options — Secure in production, Lax sameSite. */
function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Write the session cookie (call from Route Handlers / Server Actions only). */
export async function createSession(
  payload: Omit<SessionPayload, "iat" | "exp">,
) {
  const token = await signToken(payload);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, cookieOptions(SESSION_DURATION_SECONDS));
}

/** Delete the session cookie (logout). */
export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", cookieOptions(0));
}

/**
 * Read and verify the current session from the request cookies.
 * Returns null if missing, expired, or invalid.
 * Does NOT re-fetch the user from the database — use getVerifiedSession() for that.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifyToken(raw);
}
