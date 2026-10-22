/**
 * POST /api/auth/login
 * Authenticate a user, create a session cookie, return safe user data.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import {
  normalizeEmail,
  validateEmail,
  validateRequired,
} from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

// Generic message used for ALL credential failures — prevents account enumeration
const GENERIC_ERROR = "Invalid email or password.";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  // ── Rate limiting: 10 attempts per 15 min per IP ──────────────────────────
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const emailErr = validateEmail(body.email);
  const passwordErr = validateRequired(body.password, "Password");
  if (emailErr || passwordErr) {
    return NextResponse.json(
      { error: emailErr ?? passwordErr },
      { status: 400 },
    );
  }

  const email = normalizeEmail(body.email as string);
  const password = body.password as string;

  // ── Database lookup ───────────────────────────────────────────────────────
  try {
    await connectDB();

    // Explicitly select passwordHash (excluded by default in schema)
    const user = await User.findOne({ email }).select("+passwordHash");

    // Always run the hash comparison to prevent timing attacks
    const dummyHash =
      "$2a$12$invaliddummyhashfortimingnope0000000000000000000000";
    const storedHash = user?.passwordHash ?? dummyHash;
    const passwordValid = await verifyPassword(password, storedHash);

    if (!user || !passwordValid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          error:
            "Your account has been deactivated. Contact your administrator.",
        },
        { status: 403 },
      );
    }

    // ── Create session ────────────────────────────────────────────────────
    await createSession({
      userId: user._id.toString(),
      role: user.role,
      isActive: user.isActive,
    });

    // Update last login timestamp (fire-and-forget)
    void User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    console.error("[login] Error:", msg);

    // Give a helpful message for common connection errors
    if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("connect ECONNREFUSED") ||
      msg.includes("failed to connect")
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot connect to the database. Make sure MongoDB is running on localhost:27017.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: `Server error: ${msg}` },
      { status: 500 },
    );
  }
}
