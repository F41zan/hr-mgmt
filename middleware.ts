/**
 * middleware.ts
 * Early route protection using Next.js Middleware.
 *
 * NOTE: Middleware is NOT the sole security boundary.
 * Every protected page and API re-validates the session server-side.
 * Middleware only provides early redirects for better UX.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/session";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
  "/forbidden",
];

// Routes that a logged-in user should not visit (e.g., login page)
const AUTH_ROUTES = ["/login", "/forgot-password", "/reset-password"];

// Role-to-path prefix mapping for coarse-grained checks
const ROLE_PREFIXES: Record<string, string[]> = {
  admin: ["/admin"],
  hr: ["/hr"],
  employee: ["/employee"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and Next.js internals through immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|ico|webp)$/)
  ) {
    return NextResponse.next();
  }

  // Read session cookie
  const sessionCookie = request.cookies.get("hr_session")?.value ?? null;
  const session = sessionCookie ? await verifyToken(sessionCookie) : null;

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Redirect unauthenticated users to login
  if (!isPublic && !session) {
    const loginUrl = new URL("/login", request.url);
    // Preserve internal destination (validated again on the login page)
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (session && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const role = session.role;
    const dest =
      role === "admin"
        ? "/admin/dashboard"
        : role === "hr"
          ? "/hr/dashboard"
          : "/employee/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Coarse role-based prefix check
  if (session) {
    for (const [role, prefixes] of Object.entries(ROLE_PREFIXES)) {
      if (role !== session.role) {
        for (const prefix of prefixes) {
          if (pathname.startsWith(prefix)) {
            return NextResponse.redirect(new URL("/forbidden", request.url));
          }
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
