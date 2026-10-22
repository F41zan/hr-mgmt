/**
 * POST /api/auth/logout
 * Destroy the session cookie and redirect to /login.
 */

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ success: true });
}
